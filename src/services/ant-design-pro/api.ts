// @ts-ignore
/* eslint-disable */
import { supabase } from '@/services/supabase';
import { request } from '@umijs/max';

/** 获取当前的用户 GET /api/currentUser */
export async function currentUser(options?: { [key: string]: any }) {
  const session = await supabase.auth.getSession();
  if (session.data.session === undefined || session.data.session === null) {
    return null;
  }
  const user: API.CurrentUser = {
    name: session.data.session.user?.email,
    avatar: session.data.session.user?.user_metadata?.avatar_url,
    userid: session.data.session.user?.id,
    email: session.data.session.user?.email,
    signature: 'signature',
    title: 'title',
    group: 'group',
    tags: [
      {
        key: '0',
        label: 'label',
      },
    ],
    notifyCount: 12,
    unreadCount: 11,
    country: 'country',
    access: 'access',
    geographic: {
      province: {
        label: 'province',
        key: 'key',
      },
      city: {
        label: 'city',
        key: 'key',
      },
    },
    address: 'address',
    phone: 'phone',
  };
  return user;
}

/** 退出登录接口 POST /api/login/outLogin */
export async function outLogin(options?: { [key: string]: any }) {
  const { error } = await supabase.auth.signOut();
  return error;
}

/** 登录接口 POST /api/login/account */
// export async function login(body: API.LoginParams, options?: { [key: string]: any }) {
//   return request<API.LoginResult>('/api/login/account', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     data: body,
//     ...(options || {}),
//   });
// }

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
