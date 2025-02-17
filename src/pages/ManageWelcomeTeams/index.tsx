import AllTeams from '@/components/AllTeams';
import { supabase } from '@/services/supabase';
import { useEffect,useState } from 'react';

export default function ManageWelcomeTeams() {
    const [userRole, setUserRole] = useState<string | undefined>(undefined);
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserRole(data.user?.role);
        });
    }, []);

    return <>
        {userRole === 'admin' && <AllTeams />}
    </>;
}

