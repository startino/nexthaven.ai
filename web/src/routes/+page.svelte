<script lang="ts">
	import { getContext } from 'svelte';
	import HomeScreen from '$lib/components/HomeScreen.svelte';
	import LoadingScreen from '$lib/components/LoadingScreen.svelte';
	// Import other screens as we create them 
	import { propertyService } from '$lib/services/api';
	import type { UnifiedProperty } from '$lib/types/unified-property';
	import { navigating } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// Define the AppState interface
	interface AppState {
		screen: string;
		searchQuery: string;
		selectedProperty: UnifiedProperty | null;
		topProperties: UnifiedProperty[];
	}

	// Access app state from layout
	let appState: AppState;
	let error = $state<string | null>(null);
	
	// Initialize local state if not provided by context
	let localScreen = $state('home');
	let localSearchQuery = $state('');
	let localSelectedProperty = $state<UnifiedProperty | null>(null);
	let localTopProperties = $state<UnifiedProperty[]>([]);
	
	try {
		appState = getContext('appState');
	} catch {
		// Create app state if not available (for testing/SSR)
		appState = {
			get screen() { return localScreen; },
			set screen(value: string) { localScreen = value; },
			
			get searchQuery() { return localSearchQuery; },
			set searchQuery(value: string) { localSearchQuery = value; },
			
			get selectedProperty() { return localSelectedProperty; },
			set selectedProperty(value: UnifiedProperty | null) { localSelectedProperty = value; },
			
			get topProperties() { return localTopProperties; },
			set topProperties(value: UnifiedProperty[]) { localTopProperties = value; }
		};
	}
	
	// Event handlers
	function handleStartNewCampaign() {
		appState.screen = 'search';
		appState.topProperties = [];
		appState.selectedProperty = null;
	}
	
	function handleViewHistory() {
		appState.screen = 'history';
	}
	
	async function handleSearch(query: string) {
		appState.searchQuery = query;
		appState.screen = 'loading';
		appState.topProperties = []; // Clear previous results
		error = null; // Clear any previous errors
		
		try {
			console.log('Received search query:', query);
			const parsedQuery = JSON.parse(query);
			console.log('Parsed query:', parsedQuery);
			
			let properties: UnifiedProperty[] = [];
			
			// Check if we're using the new flow with session_id
			if (parsedQuery.sessionId) {
				console.log('Using new API flow with session ID:', parsedQuery.sessionId);
				// Use the new API endpoint
				properties = await propertyService.evaluatePropertiesWithPreferences(
					parsedQuery.sessionId,
					parsedQuery.preferences
				);
			} else {
				console.log('Using legacy API flow');
				// Use the legacy API endpoint
				properties = await propertyService.evaluateProperties({
					query: parsedQuery.query || '',
					date: parsedQuery.date || '',
					budget: parsedQuery.budget || { min: 200, max: 600 },
					adults: parsedQuery.adults || 2,
					children: parsedQuery.children || 0,
					number_of_rooms: parsedQuery.number_of_rooms || 1,
					preferences: parsedQuery.preferences || '',
				});
			}
			
			console.log('Properties from API:', properties);
			
			if (properties.length === 0) {
				error = 'No properties found. Please try a different search.';
				appState.screen = 'search';
				return;
			}
			
			appState.topProperties = properties;
			appState.screen = 'compare';
		} catch (e) {
			console.error('Search error:', e);
			error = `Search failed: ${e instanceof Error ? e.message : 'Unknown error'}`;
			appState.screen = 'search';
		}
	}
	
	function handleWinnerSelected(property: UnifiedProperty) {
		appState.selectedProperty = property;
		appState.screen = 'booking';
	}
	
	function handleViewCampaign(id: number) {
		// Implement viewing a saved campaign
		console.log('View campaign:', id);
	}

	onMount(() => {
		// Redirect to home page
		goto('/home');
	});
</script>

<div class="flex items-center justify-center h-[80vh]">
	<div class="text-center space-y-4">
		<h1 class="text-4xl font-bold">NextHaven.ai</h1>
		<p class="text-muted-foreground text-lg">Redirecting to home page...</p>
		<div class="mt-4 flex justify-center">
			<div class="relative flex items-center justify-center w-8 h-8">
				<div class="absolute w-full h-full border-2 rounded-full border-primary animate-spin border-t-transparent"></div>
			</div>
		</div>
	</div>
</div>
