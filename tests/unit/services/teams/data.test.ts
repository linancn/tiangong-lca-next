import type { TeamJson, TeamMemberTable, TeamTable } from '@/services/teams/data';

describe('teams data shapes', () => {
  it('supports team member rows with optional display names', () => {
    const member: TeamMemberTable = {
      user_id: 'user-1',
      team_id: 'team-1',
      role: 'admin',
      display_name: 'Alice',
      email: 'alice@example.com',
    };

    expect(member.role).toBe('admin');
    expect(member.display_name).toBe('Alice');
  });

  it('supports public team tables with localized team json payloads', () => {
    const json: TeamJson = {
      title: [{ '@xml:lang': 'en', '#text': 'Team Alpha' }],
      description: [{ '@xml:lang': 'en', '#text': 'Primary org team' }],
      lightLogo: 'light.png',
      darkLogo: 'dark.png',
      previewLightUrl: 'https://example.com/light.png',
      previewDarkUrl: 'https://example.com/dark.png',
    };
    const team: TeamTable = {
      id: 'team-1',
      json,
      rank: 1,
      is_public: true,
      user_id: 'owner-1',
      ownerEmail: 'owner@example.com',
      created_at: '2026-03-01T00:00:00Z',
      modified_at: '2026-03-13T00:00:00Z',
    };
    const titleList = Array.isArray(team.json.title) ? team.json.title : [team.json.title];

    expect(titleList[0]?.['#text']).toBe('Team Alpha');
    expect(team.is_public).toBe(true);
    expect(team.ownerEmail).toBe('owner@example.com');
  });

  it('allows custom team json keys and members without display names', () => {
    const member: TeamMemberTable = {
      user_id: 'user-2',
      team_id: 'team-2',
      role: 'member',
      email: 'member@example.com',
    };
    const json: TeamJson = {
      title: [{ '@xml:lang': 'zh', '#text': '团队 Beta' }],
      customTheme: 'green',
    };

    expect(member.display_name).toBeUndefined();
    expect(json.customTheme).toBe('green');
  });
});
