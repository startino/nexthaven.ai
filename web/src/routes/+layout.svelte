<script lang="ts">
	import '../app.css';
	import { setContext } from 'svelte';
	import type { UnifiedProperty } from '$lib/types/unified-property';
	import NavigationBar from '$lib/components/ui/NavigationBar.svelte';

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

	let { children } = $props();
</script>

<div class="bg-background text-foreground dark min-h-screen">
	<!-- Navigation -->
	<NavigationBar />

	<!-- Page content -->
	<main class="container py-6">
		{@render children()}
	</main>
</div>
