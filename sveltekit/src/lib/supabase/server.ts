import { createServerClient } from '@supabase/ssr';
import type { Database } from '$lib/types/database.types';
import { redirect, error } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const createSupabaseServerClient = async ({
	cookies,
	fetch
}: {
	cookies: Cookies;
	fetch: typeof globalThis.fetch;
}) => {
	const supabase = createServerClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			// Pass SvelteKit cookies implementation to Supabase
			getAll: () => {
				return cookies.getAll().map(({ name, value }) => ({
					name,
					value
				}));
			},
			setAll: (cookieList) => {
				cookieList.forEach(({ name, value, options }) => {
					cookies.set(name, value, { ...options, path: '/' });
				});
			}
		},
		global: {
			fetch
		}
	});

	return supabase;
};

export const getServerSession = async ({ locals }: { locals: App.Locals }) => {
	const { supabase } = locals;

	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) {
		redirect(303, '/auth/login');
	}

	return session;
};

export const requireSession = async ({
	locals,
	redirect: redirectUrl
}: {
	locals: App.Locals;
	redirect?: string;
}) => {
	const { supabase } = locals;

	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) {
		redirect(303, redirectUrl || '/auth/login');
	}

	return session;
};

export const handleLoginRedirect = async ({
	locals,
	redirectTo = '/'
}: {
	locals: App.Locals;
	redirectTo?: string;
}) => {
	const { supabase } = locals;

	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (session) {
		redirect(303, redirectTo);
	}
};
