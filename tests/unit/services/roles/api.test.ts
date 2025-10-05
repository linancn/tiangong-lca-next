/**
 * Tests for roles service API functions
 * Path: src/services/roles/api.ts
 *
 * Coverage focuses on:
 * - getUserTeamId: Get user's team ID (used throughout the app for team context)
 * - getTeamRoles: Fetch team members with pagination
 * - addRoleApi: Add user to team
 * - getUserRoles: Get current user's roles
 * - getTeamInvitationStatusApi: Check team invitation status
 * - createTeamMessage: Create team and assign owner role
 * - updateRoleApi, acceptTeamInvitationApi, rejectTeamInvitationApi: Team invitation management
 * - getSystemUserRoleApi, getSystemMembersApi: System-level role management
 */

import {
  acceptTeamInvitationApi,
  addReviewMemberApi,
  addRoleApi,
  addSystemMemberApi,
  createTeamMessage,
  delRoleApi,
  getLatestRolesOfMine,
  getReviewMembersApi,
  getReviewUserRoleApi,
  getRoleByUserId,
  getRoleByuserId,
  getSystemMembersApi,
  getSystemUserRoleApi,
  getTeamInvitationStatusApi,
  getTeamRoles,
  getUserIdsByTeamIds,
  getUserManageTableData,
  getUserRoles,
  getUserTeamId,
  reInvitedApi,
  rejectTeamInvitationApi,
  updateRoleApi,
} from '@/services/roles/api';
import { FunctionRegion } from '@supabase/supabase-js';

// Mock dependencies
jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(),
    functions: {
      invoke: jest.fn(),
    },
  },
}));

jest.mock('@/services/teams/api', () => ({
  addTeam: jest.fn(),
}));

jest.mock('@/services/users/api', () => ({
  getUserId: jest.fn(),
  getUserIdByEmail: jest.fn(),
  getUsersByIds: jest.fn(),
}));

jest.mock('@/services/comments/api', () => ({
  getUserManageComments: jest.fn(),
}));

const { supabase } = jest.requireMock('@/services/supabase');
const { addTeam } = jest.requireMock('@/services/teams/api');
const { getUserId, getUsersByIds } = jest.requireMock('@/services/users/api');

describe('Roles API Service (src/services/roles/api.ts)', () => {
  const mockUserId = 'user-123';
  const mockTeamId = 'team-456';
  const mockSession = {
    data: {
      session: {
        user: { id: mockUserId },
        access_token: 'test-token',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue(mockSession);
  });

  describe('getUserTeamId', () => {
    it('should return user team ID successfully', async () => {
      const mockData = [{ user_id: mockUserId, team_id: mockTeamId, role: 'member' }];
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockNeq = jest.fn().mockResolvedValue({ data: mockData });

      supabase.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            neq: mockNeq,
          }),
        }),
      });

      const result = await getUserTeamId();

      expect(supabase.auth.getSession).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith('roles');
      expect(mockEq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(mockNeq).toHaveBeenCalledWith('team_id', '00000000-0000-0000-0000-000000000000');
      expect(result).toBe(mockTeamId);
    });

    it('should return undefined when user has no team', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockNeq = jest.fn().mockResolvedValue({ data: [] });

      supabase.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            neq: mockNeq,
          }),
        }),
      });

      const result = await getUserTeamId();

      expect(result).toBeUndefined();
    });

    it('should exclude system team ID (all zeros)', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockNeq = jest.fn().mockResolvedValue({ data: [] });

      supabase.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            neq: mockNeq,
          }),
        }),
      });

      await getUserTeamId();

      expect(mockNeq).toHaveBeenCalledWith('team_id', '00000000-0000-0000-0000-000000000000');
    });
  });

  describe('getTeamRoles', () => {
    it('should fetch team roles with pagination', async () => {
      const params = { pageSize: 10, current: 1 };
      const sort = { created_at: 'descend' as const };
      const mockRoles = [
        { user_id: 'user1', team_id: mockTeamId, role: 'admin' },
        { user_id: 'user2', team_id: mockTeamId, role: 'member' },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockNeq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockResolvedValue({ data: mockRoles });

      supabase.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            neq: mockNeq.mockReturnValue({
              order: mockOrder.mockReturnValue({
                range: mockRange,
              }),
            }),
          }),
        }),
      });

      const result = await getTeamRoles(params, sort, mockTeamId);

      expect(supabase.from).toHaveBeenCalledWith('roles');
      expect(mockEq).toHaveBeenCalledWith('team_id', mockTeamId);
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockRange).toHaveBeenCalledWith(0, 9);
      expect(result.data).toEqual(mockRoles);
    });

    it('should handle ascending sort order', async () => {
      const params = { pageSize: 20, current: 2 };
      const sort = { modified_at: 'ascend' as const };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockNeq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockResolvedValue({ data: [] });

      supabase.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            neq: mockNeq.mockReturnValue({
              order: mockOrder.mockReturnValue({
                range: mockRange,
              }),
            }),
          }),
        }),
      });

      await getTeamRoles(params, sort, mockTeamId);

      expect(mockOrder).toHaveBeenCalledWith('modified_at', { ascending: true });
      expect(mockRange).toHaveBeenCalledWith(20, 39);
    });

    it('should use default sort when not provided', async () => {
      const params = { pageSize: 10, current: 1 };
      const sort = {};

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockNeq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockResolvedValue({ data: [] });

      supabase.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            neq: mockNeq.mockReturnValue({
              order: mockOrder.mockReturnValue({
                range: mockRange,
              }),
            }),
          }),
        }),
      });

      await getTeamRoles(params, sort, mockTeamId);

      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('addRoleApi', () => {
    it('should add role successfully', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const error = await addRoleApi('user-abc', 'team-xyz', 'member');

      expect(supabase.from).toHaveBeenCalledWith('roles');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-abc',
          role: 'member',
          team_id: 'team-xyz',
          modified_at: expect.any(String),
        }),
      );
      expect(error).toBeNull();
    });

    it('should return error when insert fails', async () => {
      const mockError = { message: 'Insert failed' };
      const mockInsert = jest.fn().mockResolvedValue({ error: mockError });

      supabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const error = await addRoleApi('user-abc', 'team-xyz', 'admin');

      expect(error).toEqual(mockError);
    });

    it('should include timestamp in insert', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValue({
        insert: mockInsert,
      });

      await addRoleApi('user-abc', 'team-xyz', 'review-admin');

      const insertedData = mockInsert.mock.calls[0][0];
      expect(insertedData.modified_at).toBeTruthy();
      expect(new Date(insertedData.modified_at).toISOString()).toBe(insertedData.modified_at);
    });
  });

  describe('getRoleByuserId', () => {
    it('should get roles by user ID', async () => {
      const mockRoles = [
        { user_id: mockUserId, team_id: 'team1', role: 'admin' },
        { user_id: mockUserId, team_id: 'team2', role: 'member' },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockNeq = jest.fn().mockResolvedValue({ data: mockRoles });

      supabase.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            neq: mockNeq,
          }),
        }),
      });

      const result = await getRoleByuserId(mockUserId);

      expect(mockEq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(mockNeq).toHaveBeenCalledWith('team_id', '00000000-0000-0000-0000-000000000000');
      expect(result.data).toEqual(mockRoles);
    });
  });

  describe('getUserRoles', () => {
    it('should get current user roles successfully', async () => {
      const mockRoles = [{ user_id: mockUserId, team_id: mockTeamId, role: 'member' }];
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockNeq = jest.fn().mockResolvedValue({ data: mockRoles });

      supabase.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            neq: mockNeq,
          }),
        }),
      });

      const result = await getUserRoles();

      expect(result).toEqual({
        data: mockRoles,
        success: true,
      });
    });

    it('should return empty array when user has no roles', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockNeq = jest.fn().mockResolvedValue({ data: null });

      supabase.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            neq: mockNeq,
          }),
        }),
      });

      const result = await getUserRoles();

      expect(result).toEqual({
        data: [],
        success: true,
      });
    });
  });

  describe('getUserIdsByTeamIds', () => {
    it('should get user IDs for multiple teams', async () => {
      const teamIds = ['team1', 'team2'];
      const mockRoles = [
        { user_id: 'user1', team_id: 'team1', role: 'admin' },
        { user_id: 'user2', team_id: 'team2', role: 'member' },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockIn = jest.fn().mockResolvedValue({ data: mockRoles });

      supabase.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          in: mockIn,
        }),
      });

      const result = await getUserIdsByTeamIds(teamIds);

      expect(supabase.from).toHaveBeenCalledWith('roles');
      expect(mockIn).toHaveBeenCalledWith('team_id', teamIds);
      expect(result).toEqual(mockRoles);
    });

    it('should return empty array when no data found', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockIn = jest.fn().mockResolvedValue({ data: null });

      supabase.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          in: mockIn,
        }),
      });

      const result = await getUserIdsByTeamIds(['team1']);

      expect(result).toEqual([]);
    });
  });

  describe('getTeamInvitationStatusApi', () => {
    it('should get invitation status with default time filter', async () => {
      getUserId.mockResolvedValue(mockUserId);
      const mockRole = { user_id: mockUserId, team_id: mockTeamId, role: 'is_invited' };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockNeq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockGte = jest.fn().mockReturnThis();
      const mockMaybeSingle = jest.fn().mockResolvedValue({ data: mockRole, error: null });

      supabase.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            neq: mockNeq.mockReturnValue({
              order: mockOrder.mockReturnValue({
                gte: mockGte.mockReturnValue({
                  maybeSingle: mockMaybeSingle,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await getTeamInvitationStatusApi(3);

      expect(getUserId).toHaveBeenCalled();
      expect(mockOrder).toHaveBeenCalledWith('modified_at', { ascending: false });
      expect(mockGte).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        data: mockRole,
      });
    });

    it('should handle no time filter (0 or negative)', async () => {
      getUserId.mockResolvedValue(mockUserId);

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockNeq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });

      supabase.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            neq: mockNeq.mockReturnValue({
              order: mockOrder.mockReturnValue({
                maybeSingle: mockMaybeSingle,
              }),
            }),
          }),
        }),
      });

      const result = await getTeamInvitationStatusApi(0);

      expect(result).toEqual({
        success: true,
        data: null,
      });
      // Should not call gte when timeFilter <= 0
    });

    it('should return error when user ID not found', async () => {
      getUserId.mockResolvedValue('');

      const result = await getTeamInvitationStatusApi();

      expect(result).toEqual({
        success: false,
        data: null,
      });
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should handle database error', async () => {
      getUserId.mockResolvedValue(mockUserId);
      const mockError = { message: 'Database error' };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockNeq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockGte = jest.fn().mockReturnThis();
      const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: mockError });

      supabase.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            neq: mockNeq.mockReturnValue({
              order: mockOrder.mockReturnValue({
                gte: mockGte.mockReturnValue({
                  maybeSingle: mockMaybeSingle,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await getTeamInvitationStatusApi();

      expect(result).toEqual({
        success: false,
        data: null,
      });
    });
  });

  describe('createTeamMessage', () => {
    it('should create team and assign owner role', async () => {
      const teamData = { name: 'New Team', description: 'Test team' };
      addTeam.mockResolvedValue(null);

      // Create delete chain mock
      const deleteChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockResolvedValue({ error: null }),
      };

      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValueOnce(deleteChain).mockReturnValueOnce({
        insert: mockInsert,
      });

      const error = await createTeamMessage(mockTeamId, teamData, 1, true);

      expect(addTeam).toHaveBeenCalledWith(mockTeamId, teamData, 1, true);
      expect(deleteChain.delete).toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          role: 'owner',
          team_id: mockTeamId,
        }),
      );
      expect(error).toBeNull();
    });

    it('should delete rejected roles before creating team', async () => {
      addTeam.mockResolvedValue(null);

      const deleteChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockResolvedValue({ error: null }),
      };
      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValueOnce(deleteChain).mockReturnValueOnce({
        insert: mockInsert,
      });

      await createTeamMessage(mockTeamId, {}, 1, false);

      expect(deleteChain.delete).toHaveBeenCalled();
      expect(deleteChain.eq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(deleteChain.eq).toHaveBeenCalledWith('role', 'rejected');
      expect(deleteChain.neq).toHaveBeenCalledWith(
        'team_id',
        '00000000-0000-0000-0000-000000000000',
      );
    });

    it('should return error when team creation fails', async () => {
      const mockError = { message: 'Team creation failed' };
      addTeam.mockResolvedValue(mockError);

      const deleteChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockResolvedValue({ error: null }),
      };

      supabase.from.mockReturnValue(deleteChain);

      const error = await createTeamMessage(mockTeamId, {}, 1, false);

      expect(error).toEqual(mockError);
    });
  });

  describe('updateRoleApi', () => {
    it('should update role via edge function', async () => {
      const mockResult = { data: { success: true }, error: null };
      supabase.functions.invoke.mockResolvedValue(mockResult);

      const result = await updateRoleApi(mockTeamId, mockUserId, 'admin');

      expect(supabase.functions.invoke).toHaveBeenCalledWith('update_role', {
        headers: {
          Authorization: 'Bearer test-token',
        },
        body: {
          teamId: mockTeamId,
          userId: mockUserId,
          data: { role: 'admin' },
        },
        region: FunctionRegion.UsEast1,
      });
      expect(result).toEqual({ success: true });
    });

    it('should log error when edge function fails', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockError = { message: 'Function error' };
      supabase.functions.invoke.mockResolvedValue({ data: null, error: mockError });

      await updateRoleApi(mockTeamId, mockUserId, 'member');

      expect(consoleLogSpy).toHaveBeenCalledWith('error', mockError);
      consoleLogSpy.mockRestore();
    });

    it('should handle all valid role types', async () => {
      supabase.functions.invoke.mockResolvedValue({ data: {}, error: null });

      const roles: Array<'admin' | 'member' | 'review-admin' | 'review-member'> = [
        'admin',
        'member',
        'review-admin',
        'review-member',
      ];

      for (const role of roles) {
        await updateRoleApi(mockTeamId, mockUserId, role);
        expect(supabase.functions.invoke).toHaveBeenCalledWith(
          'update_role',
          expect.objectContaining({
            body: expect.objectContaining({
              data: { role },
            }),
          }),
        );
      }
    });
  });

  describe('delRoleApi', () => {
    it('should delete role successfully', async () => {
      const mockDelete = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockResult = { data: null, error: null };

      supabase.from.mockReturnValue({
        delete: mockDelete.mockReturnValue({
          eq: mockEq.mockReturnValue({
            eq: jest.fn().mockResolvedValue(mockResult),
          }),
        }),
      });

      const result = await delRoleApi(mockTeamId, mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('roles');
      expect(mockDelete).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe('Team invitation management', () => {
    describe('reInvitedApi', () => {
      it('should re-invite user to team', async () => {
        const mockResult = { data: { error: null }, error: null };
        supabase.functions.invoke.mockResolvedValue(mockResult);

        const error = await reInvitedApi(mockUserId, mockTeamId);

        expect(supabase.functions.invoke).toHaveBeenCalledWith(
          'update_role',
          expect.objectContaining({
            body: expect.objectContaining({
              data: { role: 'is_invited' },
            }),
          }),
        );
        expect(error).toBeNull();
      });
    });

    describe('rejectTeamInvitationApi', () => {
      it('should reject team invitation', async () => {
        const mockResult = { data: { error: null }, error: null };
        supabase.functions.invoke.mockResolvedValue(mockResult);

        const result = await rejectTeamInvitationApi(mockTeamId, mockUserId);

        expect(supabase.functions.invoke).toHaveBeenCalledWith(
          'update_role',
          expect.objectContaining({
            body: expect.objectContaining({
              data: { role: 'rejected' },
            }),
          }),
        );
        expect(result).toEqual({
          success: true,
          error: null,
        });
      });

      it('should handle rejection error', async () => {
        const mockError = { message: 'Rejection failed' };
        supabase.functions.invoke.mockResolvedValue({ data: { error: mockError }, error: null });

        const result = await rejectTeamInvitationApi(mockTeamId, mockUserId);

        expect(result).toEqual({
          success: true,
          error: mockError,
        });
      });
    });

    describe('acceptTeamInvitationApi', () => {
      it('should accept team invitation', async () => {
        const mockResult = { data: { success: true, message: 'Accepted' }, error: null };
        supabase.functions.invoke.mockResolvedValue(mockResult);

        const result = await acceptTeamInvitationApi(mockTeamId, mockUserId);

        expect(supabase.functions.invoke).toHaveBeenCalledWith(
          'update_role',
          expect.objectContaining({
            body: expect.objectContaining({
              data: { role: 'member' },
            }),
          }),
        );
        expect(result).toEqual({
          success: true,
          message: 'Accepted',
        });
      });
    });
  });

  describe('System role management', () => {
    describe('getSystemUserRoleApi', () => {
      it('should get system user role', async () => {
        const mockRole = { user_id: mockUserId, role: 'admin' };

        const queryChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: mockRole, error: null }),
        };

        supabase.from.mockReturnValue(queryChain);

        const result = await getSystemUserRoleApi();

        expect(queryChain.eq).toHaveBeenCalledWith('user_id', mockUserId);
        expect(queryChain.eq).toHaveBeenCalledWith(
          'team_id',
          '00000000-0000-0000-0000-000000000000',
        );
        expect(result).toEqual(mockRole);
      });

      it('should return null on error', async () => {
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

        const queryChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
        };

        supabase.from.mockReturnValue(queryChain);

        const result = await getSystemUserRoleApi();

        expect(result).toBeNull();
        expect(consoleLogSpy).toHaveBeenCalled();
        consoleLogSpy.mockRestore();
      });
    });

    describe('getSystemMembersApi', () => {
      it('should get system members with user details', async () => {
        const params = { pageSize: 10, current: 1 };
        const sort = { created_at: 'descend' as const };
        const mockRoles = [
          { user_id: 'user1', role: 'admin' },
          { user_id: 'user2', role: 'member' },
        ];
        const mockUsers = [
          { id: 'user1', email: 'admin@test.com', display_name: 'Admin User' },
          { id: 'user2', email: 'member@test.com', display_name: 'Member User' },
        ];

        const mockSelect = jest.fn().mockReturnThis();
        const mockEq = jest.fn().mockReturnThis();
        const mockIn = jest.fn().mockReturnThis();
        const mockOrder = jest.fn().mockReturnThis();
        const mockRange = jest.fn().mockResolvedValue({ data: mockRoles, error: null, count: 2 });

        supabase.from.mockReturnValue({
          select: mockSelect.mockReturnValue({
            eq: mockEq.mockReturnValue({
              in: mockIn.mockReturnValue({
                order: mockOrder.mockReturnValue({
                  range: mockRange,
                }),
              }),
            }),
          }),
        });

        getUsersByIds.mockResolvedValue(mockUsers);

        const result = await getSystemMembersApi(params, sort);

        expect(supabase.from).toHaveBeenCalledWith('roles');
        expect(mockEq).toHaveBeenCalledWith('team_id', '00000000-0000-0000-0000-000000000000');
        expect(mockIn).toHaveBeenCalledWith('role', ['admin', 'owner', 'member']);
        expect(getUsersByIds).toHaveBeenCalledWith(['user1', 'user2']);
        expect(result).toEqual({
          data: [
            {
              user_id: 'user1',
              role: 'admin',
              email: 'admin@test.com',
              display_name: 'Admin User',
              team_id: '00000000-0000-0000-0000-000000000000',
            },
            {
              user_id: 'user2',
              role: 'member',
              email: 'member@test.com',
              display_name: 'Member User',
              team_id: '00000000-0000-0000-0000-000000000000',
            },
          ],
          success: true,
          total: 2,
        });
      });

      it('should handle errors gracefully', async () => {
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        const mockSelect = jest.fn().mockReturnThis();
        const mockEq = jest.fn().mockReturnThis();
        const mockIn = jest.fn().mockReturnThis();
        const mockOrder = jest.fn().mockReturnThis();
        const mockRange = jest
          .fn()
          .mockResolvedValue({ data: null, error: new Error('DB error'), count: 0 });

        supabase.from.mockReturnValue({
          select: mockSelect.mockReturnValue({
            eq: mockEq.mockReturnValue({
              in: mockIn.mockReturnValue({
                order: mockOrder.mockReturnValue({
                  range: mockRange,
                }),
              }),
            }),
          }),
        });

        const result = await getSystemMembersApi({}, {});

        expect(result).toEqual({
          data: [],
          total: 0,
          success: true,
        });
        consoleLogSpy.mockRestore();
      });
    });

    describe('addSystemMemberApi', () => {
      const { getUserIdByEmail } = jest.requireMock('@/services/users/api');

      it('should add system member successfully', async () => {
        const email = 'newmember@test.com';
        const newUserId = 'new-user-id';
        getUserIdByEmail.mockResolvedValue(newUserId);

        const mockInsert = jest.fn().mockResolvedValue({ error: null });
        supabase.from.mockReturnValue({
          insert: mockInsert,
        });

        const result = await addSystemMemberApi(email);

        expect(getUserIdByEmail).toHaveBeenCalledWith(email);
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: newUserId,
            team_id: '00000000-0000-0000-0000-000000000000',
            role: 'member',
          }),
        );
        expect(result).toEqual({ success: true });
      });

      it('should return error when user not registered', async () => {
        getUserIdByEmail.mockResolvedValue(null);

        const result = await addSystemMemberApi('nonexistent@test.com');

        expect(result).toEqual({
          success: false,
          error: 'notRegistered',
        });
      });

      it('should handle database errors', async () => {
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        getUserIdByEmail.mockResolvedValue('user-id');

        const mockInsert = jest.fn().mockResolvedValue({ error: new Error('DB error') });
        supabase.from.mockReturnValue({
          insert: mockInsert,
        });

        const result = await addSystemMemberApi('test@test.com');

        expect(result).toEqual({ success: false });
        consoleLogSpy.mockRestore();
      });
    });
  });

  describe('Review role management', () => {
    const { getUserManageComments } = jest.requireMock('@/services/comments/api');

    describe('getReviewUserRoleApi', () => {
      it('should get review user role', async () => {
        const mockRole = { user_id: mockUserId, role: 'review-admin' };

        const queryChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: mockRole, error: null }),
        };

        supabase.from.mockReturnValue(queryChain);

        const result = await getReviewUserRoleApi();

        expect(queryChain.eq).toHaveBeenCalledWith('user_id', mockUserId);
        expect(queryChain.eq).toHaveBeenCalledWith(
          'team_id',
          '00000000-0000-0000-0000-000000000000',
        );
        expect(queryChain.in).toHaveBeenCalledWith('role', ['review-admin', 'review-member']);
        expect(result).toEqual(mockRole);
      });

      it('should return null on error', async () => {
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

        const queryChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
        };

        supabase.from.mockReturnValue(queryChain);

        const result = await getReviewUserRoleApi();

        expect(result).toBeNull();
        consoleLogSpy.mockRestore();
      });
    });

    describe('getUserManageTableData', () => {
      it('should get user manage table data with comments', async () => {
        const params = { pageSize: 10, current: 1 };
        const sort = { created_at: 'descend' as const };
        const mockRoles = [
          { user_id: 'reviewer1', role: 'review-admin' },
          { user_id: 'reviewer2', role: 'review-member' },
        ];
        const mockUsers = [
          { id: 'reviewer1', email: 'reviewer1@test.com', display_name: 'Reviewer 1' },
          { id: 'reviewer2', email: 'reviewer2@test.com', display_name: 'Reviewer 2' },
        ];
        const mockComments = [
          { reviewer_id: 'reviewer1', state_code: 0 },
          { reviewer_id: 'reviewer1', state_code: 1 },
          { reviewer_id: 'reviewer2', state_code: 0 },
          { reviewer_id: 'reviewer2', state_code: 2 },
        ];

        const queryChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ data: mockRoles, error: null, count: 2 }),
        };

        supabase.from.mockReturnValue(queryChain);
        getUsersByIds.mockResolvedValue(mockUsers);
        getUserManageComments.mockResolvedValue({ data: mockComments });

        const result = await getUserManageTableData(params, sort);

        expect(queryChain.in).toHaveBeenCalledWith('role', ['review-admin', 'review-member']);
        expect(result).toEqual({
          data: [
            {
              user_id: 'reviewer1',
              role: 'review-admin',
              email: 'reviewer1@test.com',
              display_name: 'Reviewer 1',
              team_id: '00000000-0000-0000-0000-000000000000',
              pendingCount: 1,
              reviewedCount: 1,
            },
            {
              user_id: 'reviewer2',
              role: 'review-member',
              email: 'reviewer2@test.com',
              display_name: 'Reviewer 2',
              team_id: '00000000-0000-0000-0000-000000000000',
              pendingCount: 1,
              reviewedCount: 1,
            },
          ],
          success: true,
          total: 2,
        });
      });

      it('should filter by specific role', async () => {
        const params = { pageSize: 10, current: 1 };
        const sort = {};
        const mockRoles = [{ user_id: 'reviewer1', role: 'review-admin' }];
        const mockUsers = [{ id: 'reviewer1', email: 'reviewer1@test.com', display_name: 'R1' }];

        // The chain builds: select -> eq(team_id) -> in(role) -> order -> range -> eq(role)
        const mockEqForRole = jest
          .fn()
          .mockResolvedValue({ data: mockRoles, error: null, count: 1 });
        const queryChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnValue({
            eq: mockEqForRole, // This is the conditional role filter
          }),
        };

        supabase.from.mockReturnValue(queryChain);
        getUsersByIds.mockResolvedValue(mockUsers);
        getUserManageComments.mockResolvedValue({ data: [] });

        await getUserManageTableData(params, sort, 'review-admin');

        // Should be called for the role filter after range
        expect(mockEqForRole).toHaveBeenCalledWith('role', 'review-admin');
      });

      it('should handle errors gracefully', async () => {
        const queryChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockRejectedValue(new Error('DB error')),
        };

        supabase.from.mockReturnValue(queryChain);

        const result = await getUserManageTableData({}, {});

        expect(result).toEqual({
          data: [],
          total: 0,
          success: true,
        });
      });
    });

    describe('getReviewMembersApi', () => {
      it('should get review members', async () => {
        const params = { pageSize: 10, current: 1 };
        const sort = { created_at: 'descend' as const };
        const mockRoles = [
          { user_id: 'reviewer1', role: 'review-member' },
          { user_id: 'reviewer2', role: 'review-member' },
        ];
        const mockUsers = [
          { id: 'reviewer1', email: 'r1@test.com', display_name: 'R1' },
          { id: 'reviewer2', email: 'r2@test.com', display_name: 'R2' },
        ];

        const queryChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ data: mockRoles, error: null, count: 2 }),
        };

        supabase.from.mockReturnValue(queryChain);
        getUsersByIds.mockResolvedValue(mockUsers);

        const result = await getReviewMembersApi(params, sort);

        expect(queryChain.in).toHaveBeenCalledWith('role', ['review-admin', 'review-member']);
        expect(result).toEqual({
          data: [
            {
              user_id: 'reviewer1',
              role: 'review-member',
              email: 'r1@test.com',
              display_name: 'R1',
              team_id: '00000000-0000-0000-0000-000000000000',
            },
            {
              user_id: 'reviewer2',
              role: 'review-member',
              email: 'r2@test.com',
              display_name: 'R2',
              team_id: '00000000-0000-0000-0000-000000000000',
            },
          ],
          success: true,
          total: 2,
        });
      });

      it('should handle errors gracefully', async () => {
        const queryChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockRejectedValue(new Error('DB error')),
        };

        supabase.from.mockReturnValue(queryChain);

        const result = await getReviewMembersApi({}, {});

        expect(result).toEqual({
          data: [],
          total: 0,
          success: true,
        });
      });
    });

    describe('addReviewMemberApi', () => {
      it('should add review member successfully', async () => {
        const userId = 'new-reviewer-id';

        const mockInsert = jest.fn().mockResolvedValue({ error: null });
        supabase.from.mockReturnValue({
          insert: mockInsert,
        });

        const result = await addReviewMemberApi(userId);

        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: userId,
            team_id: '00000000-0000-0000-0000-000000000000',
            role: 'review-member',
          }),
        );
        expect(result).toEqual({ success: true, error: null });
      });

      it('should handle errors', async () => {
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        const mockError = new Error('DB error');

        const mockInsert = jest.fn().mockResolvedValue({ error: mockError });
        supabase.from.mockReturnValue({
          insert: mockInsert,
        });

        const result = await addReviewMemberApi('user-id');

        expect(result).toEqual({ success: false, error: mockError });
        consoleLogSpy.mockRestore();
      });
    });
  });

  describe('Utility functions', () => {
    describe('getLatestRolesOfMine', () => {
      it('should get latest role of current user', async () => {
        getUserId.mockResolvedValue(mockUserId);
        const mockRole = {
          user_id: mockUserId,
          team_id: mockTeamId,
          role: 'admin',
          modified_at: '2024-01-01T00:00:00Z',
        };

        const queryChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: mockRole }),
        };

        supabase.from.mockReturnValue(queryChain);

        const result = await getLatestRolesOfMine();

        expect(getUserId).toHaveBeenCalled();
        expect(queryChain.eq).toHaveBeenCalledWith('user_id', mockUserId);
        expect(queryChain.in).toHaveBeenCalledWith('role', ['admin', 'member', 'is_invited']);
        expect(queryChain.order).toHaveBeenCalledWith('modified_at', { ascending: false });
        expect(queryChain.limit).toHaveBeenCalledWith(1);
        expect(result).toEqual(mockRole);
      });

      it('should return null when user ID not found', async () => {
        getUserId.mockResolvedValue(null);

        const result = await getLatestRolesOfMine();

        expect(result).toBeNull();
        expect(supabase.from).not.toHaveBeenCalled();
      });
    });

    describe('getRoleByUserId', () => {
      it('should get all roles for current user', async () => {
        getUserId.mockResolvedValue(mockUserId);
        const mockRoles = [
          { team_id: 'team1', role: 'admin' },
          { team_id: 'team2', role: 'member' },
        ];

        const queryChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: mockRoles }),
        };

        supabase.from.mockReturnValue(queryChain);

        const result = await getRoleByUserId();

        expect(getUserId).toHaveBeenCalled();
        expect(queryChain.select).toHaveBeenCalledWith('team_id,role');
        expect(queryChain.eq).toHaveBeenCalledWith('user_id', mockUserId);
        expect(result).toEqual(mockRoles);
      });
    });
  });
});
