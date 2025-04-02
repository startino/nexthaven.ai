import { createSupabaseServerClient } from '$lib/supabase/server';
import type { Handle } from '@sveltejs/kit';
import { PRIVATE_SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = await createSupabaseServerClient({
		serviceRoleKey: PRIVATE_SUPABASE_SERVICE_ROLE_KEY,
		cookies: event.cookies,
		fetch: event.fetch
	});

	event.locals.getSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		return session;
	};

	return resolve(event, {
		filterSerializedResponseHeaders: (name) => name === 'content-range'
	});
};
