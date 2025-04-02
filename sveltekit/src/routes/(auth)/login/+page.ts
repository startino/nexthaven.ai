import { createSupabaseBrowserClient } from '$lib/supabase';
import { handleLoginRedirect } from '$lib/supabase/server';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	// Get parent data which includes the session
	const { session, supabase } = await parent();

	// If user is already logged in, redirect to home
	if (session) {
		return {
			supabase,
			redirect: '/'
		};
	}

	return { supabase };
};
