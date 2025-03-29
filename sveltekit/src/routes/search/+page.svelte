<!-- 
  Main search page for Rentino
  This page allows users to search properties with a comprehensive filter system
-->
<script lang="ts">
	import { setSearchQuery, clearStore, setError, getErrorMessage } from '$lib/stores/properties.svelte';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { SubscriptionStatus } from '$lib/utils/subscription';
	
	// Import components
	import FilterSidebar from './FilterSidebar.svelte';
	import SearchForm from './SearchForm.svelte';
	import PropertyDisplays from './PropertyDisplays.svelte';
	import ActiveFilters from './ActiveFilters.svelte';
		
	// Import utilities
	import { TEMPLATE_TEXT, loadPreviousPreferences } from './preferences';
	import { parseDateRange, calculateStartDate, formatDateRange } from './dateHelpers';
	import { fade } from 'svelte/transition';
	
	// Import filter system
	import { 
		popularDestinations, 
		roomOptions, 
		propertyTypes, 
		amenities, 
		timeFrames, 
		durations, 
		filterGroups,
		prepareSearchQuery
	} from './filters';
	import type { SavedPreference, PreferenceStrength } from './types';
	
	// Define interface for page data
	interface PageData {
		popularDestinations: Array<{ name: string; id?: string; image?: string }>;
		subscriptionStatus?: SubscriptionStatus;
		session?: any;
		supabase?: any;
	}
	
	// Get data from loader
	let { data } = $props<{ data: PageData }>();
	
	// Local state
	let destination = $state('');
	let dateRange = $state('');
	let startDate = $state('');
	let selectedTimeFrame = $state('');
	let duration = $state('');
	let budget = $state('600');
	let selectedRooms = $state(1);
	let preferences = $state('');
	let error = $derived(getErrorMessage());
	let previousPreferences = $state<SavedPreference[]>([]);
	let activePreferenceModal = $state<string | null>(null);
	let preferenceStrength = $state<Record<string, PreferenceStrength>>({});
	
	// Combined filter state for all categories
	let selectedFilters = $state<Record<string, string[]>>({
		'property-type': [],
		'amenities': [],
		'property-style': [],
		'nearby': [],
		'view-type': [],
		'privacy-level': [],
		'surroundings': [],
		'safety-rating': [],
		'review-consideration': [],
		'verified-stay': [],
		'review-timeframe': [],
		'flooring': [],
		'accessibility': [],
		'safety-features': [],
		'house-rules': [],
		'rating': []
	});
	
	// Create an effect to clear the error after a timeout
	$effect(() => {
		if (error) {
			const timeout = setTimeout(() => {
				setError(null);
			}, 5000);
			
			return () => clearTimeout(timeout);
		}
	});
	
	// Get previously saved preferences on mount
	onMount(() => {
		previousPreferences = loadPreviousPreferences();
		// Clear the store on mount
		clearStore();
	});
	
	// Function to handle removing a filter
	function removeFilter(groupId: string, filterId: string) {
		if (Array.isArray(selectedFilters[groupId])) {
			selectedFilters[groupId] = selectedFilters[groupId].filter(id => id !== filterId);
		}
	}
	
	function selectDestination(dest: string) {
		destination = dest;
	}
	
	function selectTimeFrame(time: string) {
		selectedTimeFrame = time;
		startDate = calculateStartDate(time);
		updateDateRange();
	}
	
	function selectDuration(time: string) {
		duration = time;
		updateDateRange();
	}
	
	function updateDateRange() {
		dateRange = formatDateRange(selectedTimeFrame, duration);
	}
	
	function handleDateRangeBlur() {
		const result = parseDateRange(dateRange);
		if (result.timeFrame) {
			selectedTimeFrame = result.timeFrame;
		}
		if (result.duration) {
			duration = result.duration;
		}
	}
	
	function closePreferenceModal() {
		activePreferenceModal = null;
	}
	
	// Function to submit the search
    async function submitSearch() {
        // Build search query with all filters
        const searchQueryJson = prepareSearchQuery({
            destination,
            dateRange,
            budget,
            selectedRooms,
            preferences,
            selectedPropertyType: selectedFilters['property-type'].length > 0 ? selectedFilters['property-type'] : null,
            selectedAmenities: selectedFilters['amenities'],
            selectedLocationFeatures: selectedFilters['nearby'],
            selectedAccessibility: selectedFilters['accessibility'],
            selectedSafetyFeatures: selectedFilters['safety-features'],
            selectedHouseRules: selectedFilters['house-rules'],
            selectedRating: selectedFilters['rating'],
            preferenceStrength
        });
        
        try {
            console.log("Storing search query and navigating to loading page");
            
            // Store the search query using the reactive store
            setSearchQuery(searchQueryJson);
            
            // Save to Supabase and navigate
            await saveSearchToSupabaseAndNavigate(searchQueryJson);
        } catch (error) {
            console.error('Error starting search:', error);
        }
    }
    
    // Save search to Supabase and navigate to results
    async function saveSearchToSupabaseAndNavigate(searchQueryJson: string): Promise<void> {
        try {
            // Use the API endpoint instead of form action
            const response = await fetch('/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    searchQuery: searchQueryJson
                })
            });
            
            const result = await response.json();
            console.log('saveSearch result:', result);
            
            if (!response.ok) {
                console.error('Error saving search to Supabase:', result.message);
            } else if (result.searchId) {
                // Store the search ID for updating with results later
                console.log('Search saved with ID:', result.searchId);
            }
            
            // After saving to Supabase, navigate using goto which preserves state better
            const searchIdParam = result.searchId ? `?searchId=${result.searchId}` : '';
            console.log('Navigating to loading page with params:', searchIdParam);
            goto('/loading' + searchIdParam);
        } catch (error) {
            console.error('Error calling search API:', error);
            // Still attempt to navigate even if the save fails, but without searchId
            goto('/loading');
        }
    }
</script>

<div class="flex h-screen overflow-hidden">
	<!-- Left Sidebar - Comprehensive Filter System -->
	<FilterSidebar
		selectedFilters={selectedFilters}
		{activePreferenceModal}
		{preferenceStrength}
	/>

	<!-- Main Content Area -->
	<div class="flex-1 overflow-y-auto">
		<div class="p-6 md:p-8">
			<!-- Error message box -->
			{#if error}
			<div 
				class="w-full mb-8 p-4 bg-destructive/20 text-destructive rounded-lg border border-destructive/30"
				transition:fade={{ duration: 200 }}
			>
				<div class="flex items-start gap-3">
				<div class="mt-1">⚠️</div>
				<div>
					<h3 class="font-medium mb-1">Error</h3>
					<p class="text-sm">{error}</p>
				</div>
				</div>
			</div>
			{/if} 					
			
			<!-- Search Inputs -->
			<SearchForm
				{destination}
				{dateRange}
				{budget}
				{selectedRooms}
				{preferences}
				{previousPreferences}
				onSubmit={submitSearch}
			/>
			
			<!-- Active Filters -->
			<ActiveFilters 
				filters={selectedFilters}
				{preferenceStrength}
				onRemove={removeFilter}
			/>
			
			<!-- Properties Section -->
			<PropertyDisplays />
		</div>
	</div>
</div>

<!-- Click outside detector to close preference modal -->
{#if activePreferenceModal}
	<button 
		class="fixed inset-0 z-0 w-full h-full border-0 bg-transparent cursor-default"
		onclick={closePreferenceModal}
		aria-label="Close filter preference modal"
	></button>
{/if} 