import { createSupabaseBrowserClient } from '$lib/supabase';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data, depends }) => {
	depends('supabase:auth');
	depends('subscription:status');

	const supabase = createSupabaseBrowserClient();

	const {
		data: { session }
	} = await supabase.auth.getSession();

	return {
		supabase,
		session: session || data.session,
		subscriptionStatus: data.subscriptionStatus
	};
};
