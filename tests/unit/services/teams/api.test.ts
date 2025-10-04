/**
 * Tests for teams service API functions
 * Path: src/services/teams/api.ts
 *
 * Coverage focuses on:
 * - getTeams: Fetch all ranked teams (used in Welcome.tsx)
 * - getTeamsByKeyword: Search teams by keyword (used in AllTeams components)
 * - getAllTableTeams: Fetch teams with pagination for tables (used in AllTeams/index.tsx)
 * - getTeamById: Get specific team information (used in multiple pages)
 * - editTeamMessage: Update team information via edge function (used in Teams/index.tsx)
 * - getTeamMembersApi: Fetch team members with roles (used in Teams/index.tsx)
 * - addTeamMemberApi: Add member to team (used in Teams/Components/AddMemberModal.tsx)
 * - addTeam: Create new team (used in roles/api.ts)
 * - getUnrankedTeams: Fetch unranked teams (used in AllTeams/select.tsx)
 * - updateSort: Update team sort order (used in AllTeams/select.tsx)
 */

import {
  addTeam,
  addTeamMemberApi,
  editTeamMessage,
  getAllTableTeams,
  getTeamById,
  getTeamMembersApi,
  getTeams,
  getTeamsByKeyword,
  getUnrankedTeams,
  updateSort,
} from '@/services/teams/api';
import { FunctionRegion } from '@supabase/supabase-js';
import {
  createMockEdgeFunctionResponse,
  createMockErrorResponse,
  createMockSession,
  createMockSuccessResponse,
  createQueryBuilder,
} from '../../../helpers/mockBuilders';
import {
  createMockRole,
  createMockTeam,
  mockPaginationParams,
  mockSortOrder,
  mockTeam,
  mockUser,
} from '../../../helpers/testData';

// Mock dependencies
jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getSession: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
  },
}));

jest.mock('@/services/roles/api', () => ({
  addRoleApi: jest.fn(),
  getRoleByuserId: jest.fn(),
  getTeamRoles: jest.fn(),
  getUserIdsByTeamIds: jest.fn(),
}));

jest.mock('@/services/users/api', () => ({
  getUserEmailByUserIds: jest.fn(),
  getUserIdByEmail: jest.fn(),
  getUsersByIds: jest.fn(),
}));

const { supabase } = jest.requireMock('@/services/supabase');
const { addRoleApi, getRoleByuserId, getTeamRoles, getUserIdsByTeamIds } =
  jest.requireMock('@/services/roles/api');
const { getUserEmailByUserIds, getUserIdByEmail, getUsersByIds } =
  jest.requireMock('@/services/users/api');

describe('Teams API Service (src/services/teams/api.ts)', () => {
  const mockSession = createMockSession('user-123', 'test-token');

  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue(mockSession);
  });

  describe('getTeams', () => {
    it('should fetch all ranked teams ordered by rank', async () => {
      const mockTeams = [
        createMockTeam({ id: 'team-1', rank: 1 }),
        createMockTeam({ id: 'team-2', rank: 2 }),
      ];
      const mockResult = createMockSuccessResponse(mockTeams);

      const builder = createQueryBuilder(mockResult);
      supabase.from.mockReturnValue(builder);

      const result = await getTeams();

      expect(supabase.from).toHaveBeenCalledWith('teams');
      expect(builder.select).toHaveBeenCalledWith(expect.stringContaining('id'));
      expect(builder.gt).toHaveBeenCalledWith('rank', 0);
      expect(builder.order).toHaveBeenCalledWith('rank', { ascending: true });
      expect(result).toEqual({
        data: mockTeams,
        success: true,
      });
    });

    it('should return empty array when no teams found', async () => {
      const mockResult = createMockSuccessResponse([]);

      const builder = createQueryBuilder(mockResult);
      supabase.from.mockReturnValue(builder);

      const result = await getTeams();

      expect(result).toEqual({
        data: [],
        success: true,
      });
    });
  });

  describe('getTeamsByKeyword', () => {
    it('should search teams by keyword in title', async () => {
      const keyword = 'Test';
      const mockTeams = [mockTeam];
      const mockResult = createMockSuccessResponse(mockTeams);

      const builder = createQueryBuilder(mockResult);
      supabase.from.mockReturnValue(builder);

      const result = await getTeamsByKeyword(keyword);

      expect(supabase.from).toHaveBeenCalledWith('teams');
      expect(builder.select).toHaveBeenCalledWith('*');
      expect(builder.or).toHaveBeenCalledWith(expect.stringContaining(`%${keyword}%`));
      expect(result).toEqual({
        data: mockTeams,
        success: true,
      });
    });

    it('should handle search errors', async () => {
      const keyword = 'Test';
      const mockError = createMockErrorResponse('Search failed');

      const builder = createQueryBuilder(mockError);
      supabase.from.mockReturnValue(builder);

      const result = await getTeamsByKeyword(keyword);

      expect(result).toEqual({
        data: [],
        success: false,
      });
    });

    it('should return empty array when no matches found', async () => {
      const keyword = 'NonexistentTeam';
      const mockResult = createMockSuccessResponse([]);

      const builder = createQueryBuilder(mockResult);
      supabase.from.mockReturnValue(builder);

      const result = await getTeamsByKeyword(keyword);

      expect(result).toEqual({
        data: [],
        success: true,
      });
    });
  });

  describe('getAllTableTeams', () => {
    it('should fetch public teams for joinTeam table type', async () => {
      const mockTeams = [createMockTeam()];
      const mockUserRoles = [{ user_id: 'user-123', team_id: 'team-123', role: 'owner' }];
      const mockUserEmails = [{ id: 'user-123', email: 'owner@example.com' }];

      const mockResult = createMockSuccessResponse(mockTeams, 1);
      const builder = createQueryBuilder(mockResult);
      supabase.from.mockReturnValue(builder);

      getUserIdsByTeamIds.mockResolvedValue(mockUserRoles);
      getUserEmailByUserIds.mockResolvedValue(mockUserEmails);

      const result = await getAllTableTeams(mockPaginationParams, 'joinTeam');

      expect(builder.eq).toHaveBeenCalledWith('is_public', true);
      expect(builder.range).toHaveBeenCalledWith(0, 9);
      expect(getUserIdsByTeamIds).toHaveBeenCalledWith(['team-123']);
      expect(getUserEmailByUserIds).toHaveBeenCalledWith(['user-123']);
      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            user_id: 'user-123',
            ownerEmail: 'owner@example.com',
          }),
        ]),
        success: true,
        total: 1,
      });
    });

    it('should fetch ranked teams for manageSystem table type', async () => {
      const mockTeams = [createMockTeam()];
      const mockResult = createMockSuccessResponse(mockTeams, 1);

      const builder = createQueryBuilder(mockResult);
      supabase.from.mockReturnValue(builder);
      getUserIdsByTeamIds.mockResolvedValue([]);

      const result = await getAllTableTeams(mockPaginationParams, 'manageSystem');

      expect(builder.gt).toHaveBeenCalledWith('rank', 0);
      expect(result.success).toBe(true);
    });

    it('should handle empty teams', async () => {
      const mockResult = createMockSuccessResponse([], 0);

      const builder = createQueryBuilder(mockResult);
      supabase.from.mockReturnValue(builder);

      const result = await getAllTableTeams(mockPaginationParams, 'joinTeam');

      expect(result).toEqual({
        data: [],
        success: true,
        total: 0,
      });
    });

    it('should handle errors gracefully', async () => {
      const mockResult = createMockSuccessResponse([], 0);
      const builder = createQueryBuilder(mockResult);

      // Simulate an error by throwing from the builder
      builder.select = jest.fn().mockImplementation(() => {
        throw new Error('Query failed');
      });

      supabase.from.mockReturnValue(builder);

      const result = await getAllTableTeams(mockPaginationParams, 'joinTeam');

      expect(result).toEqual({
        data: [],
        success: false,
        total: 0,
      });
    });
  });

  describe('getTeamById', () => {
    it('should fetch team by id', async () => {
      const teamId = 'team-123';
      const mockResult = createMockSuccessResponse([mockTeam]);

      const builder = createQueryBuilder(mockResult);
      supabase.from.mockReturnValue(builder);

      const result = await getTeamById(teamId);

      expect(supabase.from).toHaveBeenCalledWith('teams');
      expect(builder.select).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', teamId);
      expect(result).toEqual({
        data: [mockTeam],
        success: true,
      });
    });

    it('should return empty array when team not found', async () => {
      const teamId = 'nonexistent';
      const mockResult = createMockSuccessResponse([]);

      const builder = createQueryBuilder(mockResult);
      supabase.from.mockReturnValue(builder);

      const result = await getTeamById(teamId);

      expect(result).toEqual({
        data: [],
        success: true,
      });
    });

    it('should return error when id is not provided', async () => {
      const result = await getTeamById('');

      expect(result).toEqual({
        data: [],
        success: false,
      });
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('editTeamMessage', () => {
    it('should update team with rank and is_public', async () => {
      const teamId = 'team-123';
      const data = { title: 'Updated Team' };
      const rank = 5;
      const isPublic = true;
      const mockFunctionResult = createMockEdgeFunctionResponse({ success: true });

      supabase.functions.invoke.mockResolvedValue(mockFunctionResult);

      const result = await editTeamMessage(teamId, data, rank, isPublic);

      expect(supabase.auth.getSession).toHaveBeenCalled();
      expect(supabase.functions.invoke).toHaveBeenCalledWith('update_team', {
        headers: {
          Authorization: 'Bearer test-token',
        },
        body: {
          id: teamId,
          data: { json: data, rank, is_public: isPublic },
        },
        region: FunctionRegion.UsEast1,
      });
      expect(result).toEqual({ success: true });
    });

    it('should update team without rank', async () => {
      const teamId = 'team-123';
      const data = { title: 'Updated Team' };
      const isPublic = false;
      const mockFunctionResult = createMockEdgeFunctionResponse({ success: true });

      supabase.functions.invoke.mockResolvedValue(mockFunctionResult);

      const result = await editTeamMessage(teamId, data, undefined, isPublic);

      expect(supabase.functions.invoke).toHaveBeenCalledWith('update_team', {
        headers: {
          Authorization: 'Bearer test-token',
        },
        body: {
          id: teamId,
          data: { json: data, is_public: isPublic },
        },
        region: FunctionRegion.UsEast1,
      });
      expect(result).toEqual({ success: true });
    });

    it('should return undefined when no session', async () => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

      const result = await editTeamMessage('team-123', {}, 1, true);

      expect(supabase.functions.invoke).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('getTeamMembersApi', () => {
    it('should fetch team members with user details', async () => {
      const teamId = 'team-123';
      const mockRoles = [createMockRole()];
      const mockUsers = [mockUser];

      getTeamRoles.mockResolvedValue({ error: null, data: mockRoles });
      getUsersByIds.mockResolvedValue(mockUsers);

      const result = await getTeamMembersApi(mockPaginationParams, mockSortOrder, teamId);

      expect(getTeamRoles).toHaveBeenCalledWith(mockPaginationParams, mockSortOrder, teamId);
      expect(getUsersByIds).toHaveBeenCalledWith(['user-123']);
      expect(result).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            user_id: 'user-123',
            team_id: 'team-123',
            email: 'test@example.com',
            role: 'member',
            display_name: 'Test User',
          }),
        ]),
      });
    });

    it('should handle missing user details', async () => {
      const teamId = 'team-123';
      const mockRoles = [createMockRole()];

      getTeamRoles.mockResolvedValue({ error: null, data: mockRoles });
      getUsersByIds.mockResolvedValue([]);

      const result = await getTeamMembersApi(mockPaginationParams, mockSortOrder, teamId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).not.toBeNull();
      expect(result.data?.[0]?.email).toBe('');
    });

    it('should handle role fetch error', async () => {
      const teamId = 'team-123';
      const mockError = { message: 'Failed to fetch roles' };

      getTeamRoles.mockResolvedValue({ error: mockError, data: null });

      const result = await getTeamMembersApi(mockPaginationParams, mockSortOrder, teamId);

      expect(result).toEqual({
        success: false,
        data: null,
      });
    });

    it('should handle exceptions', async () => {
      const teamId = 'team-123';

      getTeamRoles.mockRejectedValue(new Error('Unexpected error'));

      const result = await getTeamMembersApi(mockPaginationParams, mockSortOrder, teamId);

      expect(result).toEqual({
        success: false,
        data: null,
      });
    });
  });

  describe('addTeamMemberApi', () => {
    it('should add new member to team', async () => {
      const teamId = 'team-123';
      const email = 'newmember@example.com';
      const userId = 'user-456';

      getUserIdByEmail.mockResolvedValue(userId);
      getRoleByuserId.mockResolvedValue({ data: [], error: null });
      addRoleApi.mockResolvedValue(null);

      const result = await addTeamMemberApi(teamId, email);

      expect(getUserIdByEmail).toHaveBeenCalledWith(email);
      expect(getRoleByuserId).toHaveBeenCalledWith(userId);
      expect(addRoleApi).toHaveBeenCalledWith(userId, teamId, 'is_invited');
      expect(result).toEqual({ error: null });
    });

    it('should return error when user not registered', async () => {
      const teamId = 'team-123';
      const email = 'notregistered@example.com';

      getUserIdByEmail.mockResolvedValue(null);

      const result = await addTeamMemberApi(teamId, email);

      expect(result).toEqual({
        error: {
          message: 'notRegistered',
        },
      });
      expect(addRoleApi).not.toHaveBeenCalled();
    });

    it('should return error when user already in team', async () => {
      const teamId = 'team-123';
      const email = 'existing@example.com';
      const userId = 'user-456';

      getUserIdByEmail.mockResolvedValue(userId);
      getRoleByuserId.mockResolvedValue({
        data: [createMockRole()],
        error: null,
      });

      const result = await addTeamMemberApi(teamId, email);

      expect(result).toEqual({
        error: {
          message: 'exists',
        },
      });
      expect(addRoleApi).not.toHaveBeenCalled();
    });
  });

  describe('addTeam', () => {
    it('should create new team', async () => {
      const teamId = 'team-123';
      const data = { title: 'New Team' };
      const rank = 1;
      const isPublic = true;

      const builder = createQueryBuilder(createMockSuccessResponse(null));
      supabase.from.mockReturnValue(builder);

      const result = await addTeam(teamId, data, rank, isPublic);

      expect(supabase.from).toHaveBeenCalledWith('teams');
      expect(builder.insert).toHaveBeenCalledWith({
        id: teamId,
        json: data,
        rank,
        is_public: isPublic,
      });
      expect(result).toBeNull();
    });

    it('should return error on insert failure', async () => {
      const teamId = 'team-123';
      const data = { title: 'New Team' };
      const mockError = { message: 'Insert failed' };

      const builder = createQueryBuilder({ error: mockError });
      supabase.from.mockReturnValue(builder);

      const result = await addTeam(teamId, data, 1, true);

      expect(result).toEqual(mockError);
    });
  });

  describe('getUnrankedTeams', () => {
    it('should fetch unranked teams with owner information', async () => {
      const mockTeams = [createMockTeam({ rank: 0 })];
      const mockUserRoles = [{ user_id: 'user-123', team_id: 'team-123', role: 'owner' }];
      const mockUserEmails = [{ id: 'user-123', email: 'owner@example.com' }];

      const mockResult = createMockSuccessResponse(mockTeams, 1);
      const builder = createQueryBuilder(mockResult);
      supabase.from.mockReturnValue(builder);

      getUserIdsByTeamIds.mockResolvedValue(mockUserRoles);
      getUserEmailByUserIds.mockResolvedValue(mockUserEmails);

      const result = await getUnrankedTeams(mockPaginationParams);

      expect(supabase.from).toHaveBeenCalledWith('teams');
      expect(builder.eq).toHaveBeenCalledWith('rank', 0);
      expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(builder.range).toHaveBeenCalledWith(0, 9);
      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            user_id: 'user-123',
            ownerEmail: 'owner@example.com',
          }),
        ]),
        success: true,
        total: 1,
      });
    });

    it('should handle empty results', async () => {
      const mockResult = createMockSuccessResponse([], 0);
      const builder = createQueryBuilder(mockResult);
      supabase.from.mockReturnValue(builder);

      const result = await getUnrankedTeams(mockPaginationParams);

      expect(result).toEqual({
        data: [],
        success: true,
        total: 0,
      });
    });

    it('should handle errors gracefully', async () => {
      const builder = createQueryBuilder({ error: new Error('Query failed') });
      supabase.from.mockReturnValue(builder);

      const result = await getUnrankedTeams(mockPaginationParams);

      expect(result).toEqual({
        data: [],
        success: true,
        total: 0,
      });
    });
  });

  describe('updateSort', () => {
    it('should update team sort order', async () => {
      const params = [
        { id: 'team-1', rank: 1 },
        { id: 'team-2', rank: 2 },
      ];

      const mockResult = createMockSuccessResponse(null);
      const builder = createQueryBuilder(mockResult);
      supabase.from.mockReturnValue(builder);

      const result = await updateSort(params);

      expect(supabase.from).toHaveBeenCalledWith('teams');
      expect(builder.upsert).toHaveBeenCalledWith(params, {
        onConflict: 'id',
      });
      expect(result).toEqual(mockResult);
    });

    it('should handle upsert errors', async () => {
      const params = [{ id: 'team-1', rank: 1 }];
      const mockError = createMockErrorResponse('Upsert failed');

      const builder = createQueryBuilder(mockError);
      supabase.from.mockReturnValue(builder);

      const result = await updateSort(params);

      expect(result).toEqual(mockError);
    });
  });
});
