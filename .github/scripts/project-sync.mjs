#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const GRAPHQL_URL = 'https://api.github.com/graphql';
const PROJECT_OWNER = process.env.PROJECT_OWNER || 'Neo9281';
const PROJECT_NUMBER = Number(process.env.PROJECT_NUMBER || '1');
const DEFAULT_REPO_TAG = process.env.DEFAULT_REPO_TAG;
const DEFAULT_WORKSPACE_INTEGRATION = process.env.DEFAULT_WORKSPACE_INTEGRATION;
const PROJECT_TOKEN = process.env.PROJECT_AUTOMATION_TOKEN;

if (!PROJECT_TOKEN) {
  console.log('PROJECT_AUTOMATION_TOKEN is not configured; skipping project sync.');
  process.exit(0);
}

const payload = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
const action = payload.action;
const eventName = process.env.GITHUB_EVENT_NAME;
const eventType = resolveEventType(eventName, action, payload);

if (!eventType) {
  console.log(`Skipping unsupported event: ${eventName}.${action}`);
  process.exit(0);
}

const project = await loadProject();

if (eventType === 'issue-open') {
  const issueUrl = payload.issue?.html_url;
  if (!issueUrl) {
    throw new Error('Missing issue URL in issues event payload.');
  }

  const issue = await loadIssueResource(issueUrl);
  await syncIssueItem({ project, issue, eventType });
  process.exit(0);
}

const prUrl = payload.pull_request?.html_url;
if (!prUrl) {
  throw new Error('Missing pull request URL in pull_request event payload.');
}

const pullRequest = await loadPullRequestResource(prUrl);
if (!pullRequest.closingIssuesReferences.nodes.length) {
  console.log(`No closing issue references found for ${prUrl}; skipping project sync.`);
  process.exit(0);
}

for (const issue of pullRequest.closingIssuesReferences.nodes) {
  await syncIssueItem({ project, issue, eventType });
}

async function syncIssueItem({ project, issue, eventType }) {
  let item = findProjectItem(issue.projectItems.nodes, project.id);
  if (!item) {
    item = await addIssueToProject(project.id, issue.id);
  }

  const currentValues = getSingleSelectValues(item);
  const updates = buildBaseUpdates({
    currentValues,
    labels: issue.labels.nodes.map((label) => label.name),
  });

  if (eventType === 'issue-open') {
    if (!currentValues.Status || currentValues.Status === 'Done') {
      updates.Status = 'Backlog';
    }
  } else if (eventType === 'pr-open') {
    updates.Status = 'In Review';
  } else if (eventType === 'pr-merged') {
    Object.assign(updates, buildMergedUpdates({ currentValues, draftUpdates: updates }));
  } else {
    throw new Error(`Unsupported event type: ${eventType}`);
  }

  await applySingleSelectUpdates({ project, itemId: item.id, updates });
  console.log(`Synced ${issue.url} with updates: ${JSON.stringify(updates)}`);
}

function buildBaseUpdates({ currentValues, labels }) {
  const updates = {};

  if (DEFAULT_REPO_TAG && currentValues['Repo Tag'] !== DEFAULT_REPO_TAG) {
    updates['Repo Tag'] = DEFAULT_REPO_TAG;
  }

  if (!currentValues['Workspace Integration'] && DEFAULT_WORKSPACE_INTEGRATION) {
    updates['Workspace Integration'] = DEFAULT_WORKSPACE_INTEGRATION;
  }

  const inferredType = inferType(labels);
  if (!currentValues.Type && inferredType) {
    updates.Type = inferredType;
  }

  const inferredPriority = inferPriority(labels);
  if (!currentValues.Priority && inferredPriority) {
    updates.Priority = inferredPriority;
  }

  return updates;
}

function buildMergedUpdates({ currentValues, draftUpdates }) {
  const effectiveValues = {
    ...currentValues,
    ...draftUpdates,
  };
  const repoTag = effectiveValues['Repo Tag'];
  const typeName = effectiveValues.Type;
  const integration = effectiveValues['Workspace Integration'];

  if (repoTag === 'workspace' && shouldMarkIntegrationDone(effectiveValues)) {
    return {
      Status: 'Done',
      'Workspace Integration': 'Done',
    };
  }

  if (integration === 'Done' || integration === 'Not Needed') {
    return integration === 'Done'
      ? {
          Status: 'Done',
          'Workspace Integration': 'Done',
        }
      : {
          Status: 'Done',
        };
  }

  if (repoTag === 'workspace' || typeName === 'docs' || typeName === 'research') {
    return {
      Status: 'Done',
    };
  }

  return {
    Status: 'In Progress',
    'Workspace Integration': 'Pending',
  };
}

function shouldMarkIntegrationDone(values) {
  return (
    (values['Workspace Integration'] && values['Workspace Integration'] !== 'Not Needed') ||
    values.Type === 'integration'
  );
}

function inferType(labels) {
  const normalizedLabels = labels.map(normalizeLabel);
  const candidates = {
    feature: ['feature', 'type:feature', 'type/feature', 'kind:feature'],
    bug: ['bug', 'type:bug', 'type/bug', 'kind:bug'],
    chore: ['chore', 'type:chore', 'type/chore', 'kind:chore'],
    integration: ['integration', 'type:integration', 'type/integration', 'kind:integration'],
    research: ['research', 'type:research', 'type/research', 'kind:research'],
    docs: ['docs', 'documentation', 'type:docs', 'type/documentation', 'kind:docs'],
  };

  for (const [typeName, options] of Object.entries(candidates)) {
    if (normalizedLabels.some((label) => options.includes(label))) {
      return typeName;
    }
  }

  return null;
}

function inferPriority(labels) {
  const normalizedLabels = labels.map(normalizeLabel);
  const candidates = {
    P0: ['p0', 'priority:p0', 'priority/p0'],
    P1: ['p1', 'priority:p1', 'priority/p1'],
    P2: ['p2', 'priority:p2', 'priority/p2'],
    P3: ['p3', 'priority:p3', 'priority/p3'],
  };

  for (const [priority, options] of Object.entries(candidates)) {
    if (normalizedLabels.some((label) => options.includes(label))) {
      return priority;
    }
  }

  return null;
}

function normalizeLabel(value) {
  return value.trim().toLowerCase().replace(/\s+/g, '').replace(/_/g, '').replace(/-/g, '');
}

function resolveEventType(eventName, action, payload) {
  if (eventName === 'issues' && (action === 'opened' || action === 'reopened')) {
    return 'issue-open';
  }

  if (
    eventName === 'pull_request' &&
    (action === 'opened' || action === 'reopened' || action === 'ready_for_review')
  ) {
    return 'pr-open';
  }

  if (eventName === 'pull_request' && action === 'closed' && payload.pull_request?.merged) {
    return 'pr-merged';
  }

  return null;
}

function findProjectItem(items, projectId) {
  return items.find((item) => item.project.id === projectId) || null;
}

function getSingleSelectValues(item) {
  const values = {};
  for (const node of item.fieldValues.nodes) {
    if (node.__typename !== 'ProjectV2ItemFieldSingleSelectValue') {
      continue;
    }
    values[node.field.name] = node.name;
  }
  return values;
}

async function loadProject() {
  const data = await graphql(
    `
      query ($owner: String!, $number: Int!) {
        user(login: $owner) {
          projectV2(number: $number) {
            id
            fields(first: 50) {
              nodes {
                __typename
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  options {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }
    `,
    {
      owner: PROJECT_OWNER,
      number: PROJECT_NUMBER,
    },
  );

  const project = data.user?.projectV2;
  if (!project) {
    throw new Error(`Unable to load ${PROJECT_OWNER} / Project #${PROJECT_NUMBER}.`);
  }

  return project;
}

async function loadIssueResource(url) {
  const data = await graphql(
    `
      query ($url: URI!) {
        resource(url: $url) {
          __typename
          ... on Issue {
            id
            url
            title
            labels(first: 20) {
              nodes {
                name
              }
            }
            projectItems(first: 20) {
              nodes {
                id
                project {
                  id
                }
                fieldValues(first: 20) {
                  nodes {
                    __typename
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                      field {
                        ... on ProjectV2SingleSelectField {
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `,
    { url },
  );

  const resource = data.resource;
  if (!resource || resource.__typename !== 'Issue') {
    throw new Error(`Expected issue resource for URL: ${url}`);
  }

  return resource;
}

async function loadPullRequestResource(url) {
  const data = await graphql(
    `
      query ($url: URI!) {
        resource(url: $url) {
          __typename
          ... on PullRequest {
            id
            url
            title
            closingIssuesReferences(first: 20) {
              nodes {
                id
                url
                title
                labels(first: 20) {
                  nodes {
                    name
                  }
                }
                projectItems(first: 20) {
                  nodes {
                    id
                    project {
                      id
                    }
                    fieldValues(first: 20) {
                      nodes {
                        __typename
                        ... on ProjectV2ItemFieldSingleSelectValue {
                          name
                          field {
                            ... on ProjectV2SingleSelectField {
                              name
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `,
    { url },
  );

  const resource = data.resource;
  if (!resource || resource.__typename !== 'PullRequest') {
    throw new Error(`Expected pull request resource for URL: ${url}`);
  }

  return resource;
}

async function addIssueToProject(projectId, issueId) {
  const data = await graphql(
    `
      mutation ($projectId: ID!, $issueId: ID!) {
        addProjectV2ItemById(input: { projectId: $projectId, contentId: $issueId }) {
          item {
            id
          }
        }
      }
    `,
    {
      projectId,
      issueId,
    },
  );

  return {
    id: data.addProjectV2ItemById.item.id,
    fieldValues: {
      nodes: [],
    },
  };
}

async function applySingleSelectUpdates({ project, itemId, updates }) {
  for (const [fieldName, optionName] of Object.entries(updates)) {
    const field = project.fields.nodes.find(
      (node) => node.__typename === 'ProjectV2SingleSelectField' && node.name === fieldName,
    );
    if (!field) {
      throw new Error(`Project field not found: ${fieldName}`);
    }

    const option = field.options.find((candidate) => candidate.name === optionName);
    if (!option) {
      throw new Error(`Option '${optionName}' not found for field '${fieldName}'.`);
    }

    await graphql(
      `
        mutation ($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
          updateProjectV2ItemFieldValue(
            input: {
              projectId: $projectId
              itemId: $itemId
              fieldId: $fieldId
              value: { singleSelectOptionId: $optionId }
            }
          ) {
            projectV2Item {
              id
            }
          }
        }
      `,
      {
        projectId: project.id,
        itemId,
        fieldId: field.id,
        optionId: option.id,
      },
    );
  }
}

async function graphql(query, variables) {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `bearer ${PROJECT_TOKEN}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json();
  if (!response.ok || payload.errors) {
    throw new Error(`GitHub GraphQL request failed: ${JSON.stringify(payload.errors || payload)}`);
  }

  return payload.data;
}
