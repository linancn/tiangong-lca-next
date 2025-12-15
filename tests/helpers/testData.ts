/**
 * Common test data fixtures for consistent test data across the test suite
 *
 * This module provides reusable test data that matches the actual data structures
 * used in the application.
 */

export type XmlLangText = {
  '@xml:lang': string;
  '#text': string;
};

export type MultilingualText = XmlLangText[];

export type TeamJson = {
  title: MultilingualText;
  description?: string | MultilingualText;
  lightLogo?: string;
  darkLogo?: string;
  previewLightUrl?: string;
  previewDarkUrl?: string;
  [key: string]: unknown;
};

export type TeamRecord = {
  id: string;
  json: TeamJson;
  rank: number;
  is_public: boolean;
  created_at: string;
  user_id: string;
  ownerEmail: string;
};

/**
 * Mock team data
 */
export const mockTeam: TeamRecord = {
  id: 'team-123',
  json: {
    title: [
      { '@xml:lang': 'en', '#text': 'Test Team EN' },
      { '@xml:lang': 'zh', '#text': '测试团队' },
    ],
    description: 'Test team description',
  },
  rank: 1,
  is_public: true,
  created_at: '2024-01-01T00:00:00Z',
  user_id: 'user-123',
  ownerEmail: 'owner@example.com',
};

/**
 * Mock source data
 */
export const mockSource = {
  id: 'source-123',
  version: '01.00.000',
  json: {
    sourceDataSet: {
      sourceInformation: {
        dataSetInformation: {
          'common:UUID': 'source-123',
          'common:shortName': [
            { '@xml:lang': 'en', '#text': 'Test Source' },
            { '@xml:lang': 'zh', '#text': '测试来源' },
          ],
          classificationInformation: {
            'common:classification': {
              'common:class': [
                {
                  '@level': '0',
                  '@classId': 'test-class-1',
                  '#text': 'Publication',
                },
              ],
            },
          },
          sourceCitation: 'Test Citation, 2024',
          publicationType: 'Article in periodical',
        },
      },
    },
  },
  json_ordered: {},
  rule_verification: true,
  state_code: 100,
  team_id: 'team-123',
  user_id: 'user-123',
  modified_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
};

/**
 * Mock flow property data
 */
export const mockFlowProperty = {
  id: 'flowprop-123',
  version: '01.00.000',
  json: {
    flowPropertiesDataSet: {
      flowPropertiesInformation: {
        dataSetInformation: {
          'common:UUID': 'flowprop-123',
          'common:name': [
            { '@xml:lang': 'en', '#text': 'Mass' },
            { '@xml:lang': 'zh', '#text': '质量' },
          ],
          classificationInformation: {
            'common:classification': {
              'common:class': [
                {
                  '@level': '0',
                  '@classId': 'test-class-1',
                  '#text': 'Technical flow properties',
                },
              ],
            },
          },
        },
      },
    },
  },
  json_ordered: {},
  rule_verification: true,
  state_code: 100,
  team_id: 'team-123',
  user_id: 'user-123',
  modified_at: '2024-01-01T00:00:00Z',
};

/**
 * Mock review data
 */
export const mockReview = {
  id: 'review-123',
  data_id: 'data-123',
  data_version: '01.00.000',
  data_type: 'Process',
  reviewer_id: 'reviewer-123',
  status: 'pending',
  comments: 'Please review the data quality',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

/**
 * Mock user data
 */
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  display_name: 'Test User',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

/**
 * Mock role data
 */
export const mockRole = {
  id: 'role-123',
  user_id: 'user-123',
  team_id: 'team-123',
  role: 'member' as 'admin' | 'member' | 'owner' | 'is_invited',
  created_at: '2024-01-01T00:00:00Z',
};

/**
 * Mock pagination params
 */
export const mockPaginationParams = {
  current: 1,
  pageSize: 10,
};

/**
 * Mock sort order
 */
export const mockSortOrder = {
  modified_at: 'descend' as 'descend' | 'ascend',
};

/**
 * Mock classification data
 */
export const mockClassification = [
  {
    '@level': '0',
    '@classId': 'class-id-1',
    '#text': 'Level 0 Classification',
  },
  {
    '@level': '1',
    '@classId': 'class-id-2',
    '#text': 'Level 1 Classification',
  },
];

/**
 * Mock ILCD classification response
 */
export const mockILCDClassificationResponse = {
  data: [
    {
      id: 'class-id-1',
      name: 'Level 0 Classification',
      nameZH: '第0级分类',
      level: 0,
      children: [
        {
          id: 'class-id-2',
          name: 'Level 1 Classification',
          nameZH: '第1级分类',
          level: 1,
        },
      ],
    },
  ],
};

/**
 * Mock multilingual text
 */
export const mockMultilingualText = [
  { '@xml:lang': 'en', '#text': 'English Text' },
  { '@xml:lang': 'zh', '#text': '中文文本' },
];

/**
 * Creates a mock source with custom overrides
 *
 * @param overrides - Properties to override in the mock source
 * @returns A mock source object
 */
export const createMockSource = (overrides?: Partial<typeof mockSource>) => ({
  ...mockSource,
  ...overrides,
  json: {
    ...mockSource.json,
    ...(overrides?.json ?? {}),
  },
});

/**
 * Creates a mock team with custom overrides
 *
 * @param overrides - Properties to override in the mock team
 * @returns A mock team object
 */
export const createMockTeam = (overrides?: Partial<typeof mockTeam>) => ({
  ...mockTeam,
  ...overrides,
  json: {
    ...mockTeam.json,
    ...(overrides?.json ?? {}),
  },
});

/**
 * Creates a mock user with custom overrides
 *
 * @param overrides - Properties to override in the mock user
 * @returns A mock user object
 */
export const createMockUser = (overrides?: Partial<typeof mockUser>) => ({
  ...mockUser,
  ...overrides,
});

/**
 * Creates a mock role with custom overrides
 *
 * @param overrides - Properties to override in the mock role
 * @returns A mock role object
 */
export const createMockRole = (overrides?: Partial<typeof mockRole>) => ({
  ...mockRole,
  ...overrides,
});

/**
 * Creates a mock table response with pagination
 *
 * @param data - Array of data items
 * @param total - Total count
 * @param page - Current page number
 * @returns A mock table response
 */
export const createMockTableResponse = <T>(data: T[], total: number, page: number = 1) => ({
  data,
  success: true,
  total,
  page,
});

/**
 * Mock search filter condition
 */
export const mockFilterCondition = {
  'common:classification': ['class-id-1'],
  state_code: 100,
};
