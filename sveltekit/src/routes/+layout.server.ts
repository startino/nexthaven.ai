import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	try {
		const session = await locals.getSession();
		return { session };
	} catch (error) {
		console.error('Error in layout.server.ts:', error);
		return { session: null };
	}
};
