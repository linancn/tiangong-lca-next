// @ts-ignore
/* eslint-disable */
import { supabase } from '@/services/supabase';
import { request } from '@umijs/max';

/** 获取当前的用户 GET /api/currentUser */
export async function currentUser(options?: { [key: string]: any }) {
  const { data } = await supabase.auth.getUser();
  if (data?.user === null) {
    return null;
  }
  const user: API.CurrentUser = {
    name: data?.user?.email,
    userid: data?.user?.id,
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
    email: body.username ?? '',
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

export async function reauthenticate(options?: { [key: string]: any }) {
  const { data, error } = await supabase.auth.reauthenticate();

  if (error) {
    return { status: 'error', message: error.message, currentAuthority: 'guest' };
  }
  return { status: 'ok', currentAuthority: data?.user?.role ?? 'guest' };
}

export async function changePassword(body: any, options?: { [key: string]: any }) {
  const { data } = await supabase.auth.signInWithPassword({
    email: body.email ?? '',
    password: body.current ?? '',
  });

  // const { data } = await supabase.auth.verifyOtp({
  //   email: body.email ?? '',
  //   token: body.code ?? '',
  //   type: 'email',
  // });

  if (data.user !== null) {
    const { error } = await supabase.auth.updateUser({
      email: body.email ?? '',
      password: body.new1 ?? '',
    });
    if (error) {
      return {
        status: 'error',
        message: error.message,
        type: body.type,
        currentAuthority: 'guest',
      };
    } else {
      return { status: 'ok', type: body.type, currentAuthority: data.user.role };
    }
  } else {
    return {
      status: 'error',
      message: 'Invalid current password',
      type: body.type,
      currentAuthority: 'guest',
    };
  }
}

export async function forgotPasswordSendEmail(
  body: API.LoginParams,
  options?: { [key: string]: any },
) {
  const { error } = await supabase.auth.resetPasswordForEmail(body.email ?? '', {
    redirectTo: 'https://lca.tiangong.earth/#/password/set',
  });

  if (error) {
    return { status: 'error', message: error.message, type: body.type, currentAuthority: 'guest' };
  }
  return { status: 'ok', type: body.type, currentAuthority: 'guest' };
}

export async function setPassword(body: any, options?: { [key: string]: any }) {
  console.log(body);
  const { data, error } = await supabase.auth.updateUser({
    email: body.email ?? '',
    password: body.new1 ?? '',
  });
  console.log(data, error);
  if (error) {
    return { status: 'error', message: error.message, type: body.type, currentAuthority: 'guest' };
  } else {
    return { status: 'ok', type: body.type, currentAuthority: data.user.role };
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
