import { supabase } from '@/services/supabase';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { history, useIntl, useModel } from '@umijs/max';
import { message } from 'antd';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

const Login: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const { initialState, setInitialState } = useModel('@@initialState');
  const intl = useIntl();

  const fetchUserInfo = async () => {
    const userInfo = await initialState?.fetchUserInfo?.();
    if (userInfo) {
      flushSync(() => {
        setInitialState((s: any) => ({
          ...s,
          currentUser: userInfo,
        }));
      });
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} />;
  } else {
    const defaultLoginSuccessMessage = intl.formatMessage({
      id: 'pages.login.success',
      defaultMessage: '登录成功！',
    });
    message.success(defaultLoginSuccessMessage);
    fetchUserInfo();
    const urlParams = new URL(window.location.href).searchParams;
    history.push(urlParams.get('redirect') || '/');
    return;
  }
};

export default Login;
