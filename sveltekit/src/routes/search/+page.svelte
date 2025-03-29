<!-- 
  Main search page for Rentino
  This page allows users to search properties with a comprehensive filter system
-->
<script lang="ts">
	import { setSearchQuery, clearStore, setError, getErrorMessage, setProperties } from '$lib/stores/properties.svelte';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { SubscriptionStatus } from '$lib/utils/subscription';
	import { propertyService } from '$lib/services/api';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { streamEvents } from '$lib/event';
	import { subscribeToEvent, type PropertyEvaluationEventData, type PropertyEvaluationStep } from '$lib/event';
	import type { UnifiedProperty } from '$lib/types/unified-property';
	
	// Import components
	import FilterSidebar from './FilterSidebar.svelte';
	import SearchForm from './SearchForm.svelte';
	import ActiveFilters from './ActiveFilters.svelte';
	import PropertyResults from './PropertyResults.svelte';
	import SearchProgress from './SearchProgress.svelte';
		
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
		searchId?: string;
	}
	
	// Get data from loader
	let { data } = $props<{ data: PageData }>();
	let searchId = $derived(data.searchId);
	
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
	
	// Search state
	let isSearching = $state(false);
	let progress = $state(0);
	let targetProgress = $state(0);
	let currentStep = $state(0);
	let currentStepName = $state<PropertyEvaluationStep | undefined>(undefined);
	let sessionId = $state<string | null>(null);
	let propertyCount = $state(0);
	let streamedProperties = $state<UnifiedProperty[]>([]);
	let progressInterval: ReturnType<typeof setInterval> | undefined;
	
	// Define step ranges for progress tracking
	const stepProgressRanges = [
		{ min: 0, max: 13 }, // Step 1: 0-13%
		{ min: 13, max: 25 }, // Step 2: 13-25%
		{ min: 25, max: 38 }, // Step 3: 25-38%
		{ min: 38, max: 50 }, // Step 4: 38-50%
		{ min: 50, max: 63 }, // Step 5: 50-63%
		{ min: 63, max: 75 }, // Step 6: 63-75%
		{ min: 75, max: 88 }, // Step 7: 75-88%
		{ min: 88, max: 100 } // Step 8: 88-100%
	];
	
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
		
		// Check if we should start searching immediately (e.g., if redirected back from a failed search)
		if (searchId) {
			resumeSearch();
		}
		
		return () => {
			// Clean up intervals
			if (progressInterval) clearInterval(progressInterval);
		};
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
	
	// Function to start or resume a search
	async function resumeSearch() {
		// TODO: Implement logic to resume a search based on searchId
		console.log("Resuming search with ID:", searchId);
	}
	
	// Update progress smoothly
	function updateProgressSmooth() {
		if (progress < targetProgress) {
			progress = Math.min(targetProgress, progress + 0.5);
		}
	}
	
	// Handle property evaluation events from SSE
	async function handlePropertyEvaluationEvent(data: PropertyEvaluationEventData) {
		console.log('Received property evaluation event:', data);
		
		// Update progress based on the event data
		if (data.progress !== undefined) {
			targetProgress = data.progress;
		}
		
		// Update the display message based on the step
		if (data.step) {
			currentStepName = data.step;
			switch (data.step) {
				case 'checking':
					currentStep = 0;
					break;
				case 'retrieving':
					currentStep = 1;
					break;
				case 'retrieved':
					currentStep = 2;
					// This is where properties should come in
					if (data.properties && data.properties.length > 0) {
						streamedProperties = data.properties;
					}
					break;
				case 'updating':
					currentStep = 3;
					break;
				case 'processing':
					currentStep = 5;
					break;
				case 'formatting':
					currentStep = 7;
					break;
			}
		}
		
		// Update the property count
		if (data.properties_count) {
			propertyCount = data.properties_count;
		}
		
		// Always try to process properties if they exist in the payload
		if (data.properties && data.properties.length > 0 && data.step !== 'retrieved') {
			streamedProperties = data.properties;
		}
		
		// Handle final results when evaluation is completed
		if (data.status === 'completed' && data.results && data.results.length > 0) {
			streamedProperties = data.results;
			
			// Then, save to the global store for the compare page
			setProperties(data.results);
			
			// Update property count if it wasn't set
			if (!propertyCount && data.count) {
				propertyCount = data.count;
			}
			
			// Mark search as complete
			setTimeout(() => {
				isSearching = false;
				// No redirection to compare page - we'll show results right here
			}, 1000);
		}
		
		// Handle completed status even if no results
		if (data.status === 'completed') {
			targetProgress = 100;
			
			// If we have no properties, show an error
			if (streamedProperties.length === 0) {
				setError('No properties found. Please try a different search.');
				isSearching = false;
			} else {
				// Finalize the search process
				setTimeout(() => {
					isSearching = false;
				}, 1000);
			}
		}
		
		// Handle error status
		if (data.error) {
			const errorMsg = data.error || 'An error occurred during property evaluation';
			setError(errorMsg);
			isSearching = false;
		}
	}
	
	// Start the property evaluation process
	async function startPropertyEvaluation(searchQueryJson: string) {
		try {
			// Parse the search query
			const parsedQuery = JSON.parse(searchQueryJson);
			
			// Reset state
			streamedProperties = [];
			propertyCount = 0;
			progress = 0;
			targetProgress = 0;
			currentStep = 0;
			
			// Start tracking progress
			progressInterval = setInterval(updateProgressSmooth, 100);
			
			// Make a request to create a new session
			sessionId = await queryProperties({
				query: parsedQuery.query || '',
				date: parsedQuery.date || '',
				budget: parsedQuery.budget || { min: 200, max: 600 },
				adults: parsedQuery.adults || 2,
				children: parsedQuery.children || 0,
				number_of_rooms: parsedQuery.number_of_rooms || 1
			});
			
			if (sessionId) {
				console.log('Created session ID:', sessionId);
				
				// Now stream the evaluation
				const apiUrl = `${PUBLIC_API_URL}/properties/evaluate`;
				
				// Construct the request body
				const requestBody = {
					session_id: sessionId,
					preferences: parsedQuery.preferences || ''
				};
				
				// Make the request and start streaming events
				const response = fetch(apiUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(requestBody)
				});
				
				// Set up subscription for property evaluation events
				const unsubscribe = subscribeToEvent('property_evaluation', handlePropertyEvaluationEvent);
				
				// Set up streaming of events
				streamEvents(response);
			} else {
				throw new Error('Failed to create a session');
			}
		} catch (error) {
			console.error('Failed to start property evaluation:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
			setError(`Error: ${errorMessage}`);
			isSearching = false;
		}
	}
	
	// Custom API function for querying properties
	async function queryProperties(payload: {
		query: string;
		date: string;
		budget: {
			min: number;
			max: number;
		};
		adults: number;
		children: number;
		number_of_rooms: number;
	}) {
		try {
			const apiUrl = `${PUBLIC_API_URL}/properties/query`;
			
			// Add timeout to prevent hanging
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout
			
			try {
				// Transform request to match React app's approach
				const requestBody = {
					query: payload.query,
					date: payload.date,
					budget: {
						min: payload.budget.min,
						max: payload.budget.max
					},
					adults: payload.adults,
					children: payload.children,
					number_of_rooms: payload.number_of_rooms
				};
				
				const response = await fetch(apiUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(requestBody),
					signal: controller.signal
				});
				
				clearTimeout(timeoutId);
				
				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(`Property query failed: ${response.status} ${errorText}`);
				}
				
				const data = await response.json();
				
				if (data.status !== 'processing') {
					throw new Error(`Property query failed: ${data.message}`);
				}
				
				return data.session_id;
			} catch (fetchError: any) {
				if (fetchError.name === 'AbortError') {
					throw new Error('Property query timed out after 15 seconds');
				}
				throw fetchError;
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
			setError(`Failed to start property search: ${errorMessage}`);
			throw err;
		}
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
            console.log("Storing search query and starting search process");
            
            // Store the search query using the reactive store
            setSearchQuery(searchQueryJson);
            
            // Set search state to true to show loading UI
            isSearching = true;
            
            // Save to Supabase first
            await saveSearchToSupabase(searchQueryJson);
            
            // Start the property evaluation process
            await startPropertyEvaluation(searchQueryJson);
        } catch (error) {
            console.error('Error starting search:', error);
            isSearching = false;
        }
    }
    
    // Save search to Supabase
    async function saveSearchToSupabase(searchQueryJson: string): Promise<void> {
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
            
            if (!response.ok) {
                console.error('Error saving search to Supabase:', result.message);
            } else if (result.searchId) {
                // Store the search ID for updating with results later
                console.log('Search saved with ID:', result.searchId);
                searchId = result.searchId;
            }
        } catch (error) {
            console.error('Error calling search API:', error);
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
			
			<!-- Search Progress Bar (when searching) -->
			<SearchProgress
				{progress}
				{currentStep}
				{currentStepName}
				isSearching={isSearching}
			/>
			
			<!-- Properties Section -->
			<PropertyResults
				properties={streamedProperties}
				{propertyCount}
				isSearching={isSearching}
				{currentStepName}
			/>
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

<style>
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out forwards;
  }
</style> 