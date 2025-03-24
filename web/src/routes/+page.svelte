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
	import { Button } from '$lib/components/ui/button';

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
	
	function navigateToSearch() {
		goto('/search');
	}

	onMount(() => {
		// If the route is directly accessed, redirect to /home
		if (window.location.pathname === '/') {
			goto('/home');
		}
	});
</script>

<div class="flex flex-col items-center justify-center min-h-screen py-12 px-4">
	<!-- Header -->
	<div class="w-full max-w-md text-center mb-16">
		<h1 class="text-4xl font-serif font-bold mb-2">nexthaven.ai</h1>
	</div>
	
	<div class="mt-8 text-center mb-16">
		<h2 class="text-5xl font-serif font-bold leading-tight mb-4">
			Find your <span class="text-gradient">next</span>
		</h2>
		<div class="mt-2 text-5xl font-serif font-bold leading-tight">
			<span class="text-[hsl(var(--hotel))]">hotel</span>
			<span class="mx-2">/</span>
			<span class="text-[hsl(var(--apartment))]">apartment</span>
			<span class="mx-2">/</span>
			<span class="text-[hsl(var(--hostel))]">hostel</span><span>.</span>
		</div>
		<p class="text-muted-foreground font-light mt-4 text-lg">
			Hours of accommodation searching, condensed into seconds.
		</p>
	</div>
	
	<!-- Search Button -->
	<div class="w-full max-w-md">
		<Button 
			variant="default" 
			class="w-full h-14 button-gradient text-white text-lg font-semibold flex items-center justify-between group rounded-2xl shadow-lg p-4"
			onclick={navigateToSearch}
		>
			<div class="flex items-center">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
				Start New Search
			</div>
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="transition-transform group-hover:translate-x-1"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
		</Button>
		
		<div class="mt-20 text-center text-sm">
			<p class="text-muted-foreground text-xs sm:text-sm">
				Interested in partnering with us?
			</p>
			<p class="mt-1 text-xs sm:text-sm">
				Contact:
				<a href="mailto:jorge.lewis@startin.no" class="text-primary hover:text-primary/80 hover:underline">jorge.lewis@startin.no</a>
			</p>
		</div>
	</div>
	
	<!-- Footer -->
	<div class="mt-16 text-center text-gray-400">
		<p class="text-xs sm:text-sm">Made by the <a href="https://startino.no" target="_blank" rel="noopener noreferrer" class="text-purple-400 hover:text-purple-300 hover:underline">Startino Team</a></p>
	</div>
</div>
