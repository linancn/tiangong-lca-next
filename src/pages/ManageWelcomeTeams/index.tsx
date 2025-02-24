import AllTeams from '@/components/AllTeams';
import { getAuth } from '@/services/manageWelcomeTeams/api';
import { useEffect, useState } from 'react';

export default function ManageWelcomeTeams() {
  const [userRole, setUserRole] = useState<string | undefined>(undefined);
  useEffect(() => {
    getAuth().then((data) => {
      setUserRole(data.user?.role);
    });
  }, []);

  return <>{userRole === 'admin' && <AllTeams />}</>;
}
