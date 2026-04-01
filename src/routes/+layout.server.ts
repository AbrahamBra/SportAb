import { createServerSupabase } from '$lib/supabase/server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
  try {
    const supabase = createServerSupabase(cookies);
    const { data: { session } } = await supabase.auth.getSession();
    return { session };
  } catch {
    return { session: null };
  }
};
