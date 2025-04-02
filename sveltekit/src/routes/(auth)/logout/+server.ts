import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
	const { supabase } = locals;
	await supabase.auth.signOut();

	redirect(303, '/login');
};

// Handle GET requests too for simplicity
export const GET: RequestHandler = async ({ locals }) => {
	const { supabase } = locals;
	await supabase.auth.signOut();

	redirect(303, '/login');
};
