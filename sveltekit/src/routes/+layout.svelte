<script lang="ts">
	import '../app.css';
	import { setContext } from 'svelte';
	import { invalidate } from '$app/navigation';
	import NavigationBar from '$lib/components/ui/NavigationBar.svelte';
	import { collectionState, setCollections } from '$lib/stores/collections.svelte';
	import { CollectionService } from '$lib/services/collection.service';


	// Setup Supabase client and auth listener
	let { data, children } = $props();
	
	let { supabase, session } = data;
	
	$effect(() => {
		loadCollections();
		const { data: authListener } = supabase.auth.onAuthStateChange(
			(event, _session) => {
				if (_session?.expires_at !== session?.expires_at) {
					invalidate('supabase:auth');
				}
				
				// Explicitly refresh subscription status on sign in events
				if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
					console.log('Auth event detected, refreshing subscription status');
					invalidate('subscription:status');
				}
			}
		);

		return () => {
			authListener.subscription.unsubscribe();
		};
	});

	// Load collections for the current user
	async function loadCollections() {
		try {
			if (!session?.user?.id) {
				return;
			}
			collectionState.isLoading = true;
			const userCollections = await CollectionService.getCollections(session.user.id);

			// If no 'My Trip' collection exists, create it
			if (!userCollections.some((collection) => collection.name === 'My Trip')) {
				await CollectionService.ensureDefaultCollection(session.user.id);
				// Reload collections after creating default
				const updatedCollections = await CollectionService.getCollections(session.user.id);
				setCollections(updatedCollections);
				
			} else {
				setCollections(userCollections);
			}
		} catch (error) {
			console.error('Failed to load collections:', error);
		} finally {
			collectionState.isLoading = false;
		}
	}
</script>

<div class="min-h-screen bg-black dark text-foreground">
	<!-- Navigation -->
	<NavigationBar />

	<!-- Page content -->
	<main>
		{@render children()}
	</main>
</div>
