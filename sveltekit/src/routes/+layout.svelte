<script lang="ts">
	import '../app.css';
	import { setContext } from 'svelte';
	import { invalidate } from '$app/navigation';
	import type { UnifiedProperty } from '$lib/types/unified-property';
	import NavigationBar from '$lib/components/ui/NavigationBar.svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';

	// Common reactive state that might need to be shared between routes
	let selectedProperty = $state<UnifiedProperty | null>(null);
	let topProperties = $state<UnifiedProperty[]>([]);

	// Create app state to share with child components
	const appState = {
		get selectedProperty() {
			return selectedProperty;
		},
		set selectedProperty(value: UnifiedProperty | null) {
			selectedProperty = value;
		},

		get topProperties() {
			return topProperties;
		},
		set topProperties(value: UnifiedProperty[]) {
			topProperties = value;
		}
	};

	// Make app state available to all child components
	setContext('appState', appState);

	// Setup Supabase client and auth listener
	let { data, children } = $props();
	
	let { supabase, session } = data;
	
	$effect(() => {
		const { data: authListener } = supabase.auth.onAuthStateChange(
			(event, _session) => {
				if (_session?.expires_at !== session?.expires_at) {
					invalidate('supabase:auth');
				}
			}
		);

		return () => {
			authListener.subscription.unsubscribe();
		};
	});
</script>

<div class="min-h-screen bg-black dark text-foreground">
	<!-- Navigation -->
	<!-- <NavigationBar /> -->

	<!-- Page content -->
	<main>
		{@render children()}
	</main>
</div>
