import { request } from '@umijs/max';
// @ts-ignore
/* eslint-disable */
import { supabase } from '@/services/supabase';
import { FunctionRegion } from '@supabase/supabase-js';

/** 获取当前的用户 GET /api/currentUser */
export async function currentUser(options?: { [key: string]: any }) {
  const { data } = await supabase.auth.getUser();
  if (data?.user === null) {
    return null;
  }
  const user: API.CurrentUser = {
    name: data?.user?.user_metadata?.display_name ?? data?.user?.email,
    userid: data?.user?.id,
    teamid: data?.user?.user_metadata?.team_id,
    email: data?.user?.email,
    role: data?.user?.role,
  };
  return user;
}

/** 退出登录接口 POST /api/login/outLogin */
export async function outLogin(options?: { [key: string]: any }) {
  const { error } = await supabase.auth.signOut();
  return error;
}

/** 登录接口 POST /api/login/account */
export async function login(body: API.LoginParams, options?: { [key: string]: any }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email ?? '',
    password: body.password ?? '',
  });
  if (error) {
    return { status: 'error', type: body.type, currentAuthority: 'guest' };
  }
  return { status: 'ok', type: body.type, currentAuthority: data.user.role };
}

export async function sendMagicLink(body: API.LoginParams, options?: { [key: string]: any }) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email: body.email ?? '',
  });

  if (error) {
    return { status: 'error', message: error.message, type: body.type, currentAuthority: 'guest' };
  }
  return { status: 'ok', type: body.type, currentAuthority: 'guest' };
}

export async function signUp(body: API.LoginParams, options?: { [key: string]: any }) {
  const { data, error } = await supabase.auth.signUp({
    email: body.email ?? '',
    password: body.confirmPassword ?? '',
  });
  // console.log(body.type);
  if (!data || error) {
    return { status: 'error', type: body.type, currentAuthority: 'guest' };
  }
  if (data.user?.role === '') {
    // console.log('user existed');
    return { status: 'existed', type: body.type, currentAuthority: 'guest' };
  }
  return { status: 'ok', type: body.type, currentAuthority: 'guest' };
}

export async function reauthenticate(options?: { [key: string]: any }) {
  const { data, error } = await supabase.auth.reauthenticate();

  console.log(data, error);

  if (error) {
    return { status: 'error', message: error.message, currentAuthority: 'guest' };
  }
  return { status: 'ok', currentAuthority: data?.user?.role ?? 'guest' };
}

export async function changePassword(body: any, options?: { [key: string]: any }) {
  const { data } = await supabase.auth.signInWithPassword({
    email: body.email ?? '',
    password: body.currentPassword ?? '',
  });

  if (data.user !== null) {
    const { error } = await supabase.auth.updateUser({
      email: body.email ?? '',
      password: body.confirmNewPassword ?? '',
    });
    if (error) {
      return {
        status: 'error',
        message: 'User not found',
        type: body.type,
        currentAuthority: 'guest',
      };
    } else {
      return { status: 'ok', type: body.type, currentAuthority: data.user.role };
    }
  } else {
    return {
      status: 'error',
      message: 'Password incorrect',
      type: body.type,
      currentAuthority: 'guest',
    };
  }
}

export async function changeEmail(body: any, options?: { [key: string]: any }) {
  if (body.email !== null) {
    const { error } = await supabase.auth.updateUser({
      email: body.confirmNewEmail ?? '',
    });
    if (error) {
      return {
        status: 'error',
        message: error.message,
        type: body.type,
      };
    } else {
      return { status: 'ok', type: body.type };
    }
  } else {
    return {
      status: 'error',
      message: 'An error occurred, please try again later!',
      type: body.type,
    };
  }
}

export async function forgotPasswordSendEmail(
  body: API.LoginParams,
  options?: { [key: string]: any },
) {
  const { error } = await supabase.auth.resetPasswordForEmail(body.email ?? '', {
    redirectTo: 'https://lca.tiangong.earth/user/login/password_reset',
  });

  if (error) {
    return { status: 'error', message: error.message, type: body.type, currentAuthority: 'guest' };
  }
  return { status: 'ok', type: body.type, currentAuthority: 'guest' };
}

export async function setPassword(body: any, options?: { [key: string]: any }) {
  const { data, error } = await supabase.auth.updateUser({
    email: body.email ?? '',
    password: body.confirmNewPassword ?? '',
  });

  if (error) {
    return { status: 'error', message: error.message, type: body.type, currentAuthority: 'guest' };
  } else {
    return { status: 'ok', type: body.type, currentAuthority: data.user.role };
  }
}

export async function setProfile(body: any, options?: { [key: string]: any }) {
  const { data, error } = await supabase.auth.updateUser({
    data: {
      display_name: body.name ?? '',
    },
  });

  if (error) {
    return { status: 'error', message: error.message, type: body.type, currentAuthority: 'guest' };
  } else {
    return { status: 'ok', type: body.type, currentAuthority: data.user.role };
  }
}

export async function cognitoSignUp(password: string) {
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    await supabase.functions.invoke('sign_up_cognito', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body: { password },
      region: FunctionRegion.UsEast1,
    });
  }
}

/** 此处后端没有提供注释 GET /api/notices */
export async function getNotices(options?: { [key: string]: any }) {
  return request<API.NoticeIconList>('/api/notices', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取规则列表 GET /api/rule */
export async function rule(
  params: {
    // query
    /** 当前的页码 */
    current?: number;
    /** 页面的容量 */
    pageSize?: number;
  },
  options?: { [key: string]: any },
) {
  return request<API.RuleList>('/api/rule', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 更新规则 PUT /api/rule */
export async function updateRule(options?: { [key: string]: any }) {
  return request<API.RuleListItem>('/api/rule', {
    method: 'POST',
    data: {
      method: 'update',
      ...(options || {}),
    },
  });
}

/** 新建规则 POST /api/rule */
export async function addRule(options?: { [key: string]: any }) {
  return request<API.RuleListItem>('/api/rule', {
    method: 'POST',
    data: {
      method: 'post',
      ...(options || {}),
    },
  });
}

/** 删除规则 DELETE /api/rule */
export async function removeRule(options?: { [key: string]: any }) {
  return request<Record<string, any>>('/api/rule', {
    method: 'POST',
    data: {
      method: 'delete',
      ...(options || {}),
    },
  });
}
