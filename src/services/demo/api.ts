import { supabase } from '@/services/supabase';
import { FunctionRegion } from '@supabase/supabase-js';

export async function flowHybridSearch(query: string) {
    const { data } = await supabase
        .rpc('flow_hybrid_search', { query: query })
    return data;
}

export async function returnUserEdgeFunction() {
    const session = await supabase.auth.getSession();
    const { data } = await supabase.functions.invoke('return_user', {
        headers: {
            "Authorization": `Bearer ${session.data.session?.access_token ?? ''}`
        },
        body: {},
        region: FunctionRegion.UsEast1
    })
    return data;
}

