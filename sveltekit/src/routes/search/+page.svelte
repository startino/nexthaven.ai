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
	import { parseDateRange, calculateStartDate, formatDateRange, isValidDate } from './dateHelpers';
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
	
	// Parse a search query
	function parseSearchQuery() {
		let searchParams = new URLSearchParams(window.location.search);
		
		// Check if there's a destination
		if (searchParams.has('q')) {
			destination = searchParams.get('q') || '';
		} else if (searchParams.has('destination')) {
			destination = searchParams.get('destination') || '';
		}
		
		// Check for dates
		if (searchParams.has('dates')) {
			dateRange = searchParams.get('dates') || '';
		} else if (searchParams.has('date')) {
			dateRange = searchParams.get('date') || '';
		} else if (searchParams.has('checkin') && searchParams.has('checkout')) {
			const checkin = searchParams.get('checkin') || '';
			const checkout = searchParams.get('checkout') || '';
			
			if (checkin && checkout) {
				try {
					const checkinDate = new Date(checkin);
					const checkoutDate = new Date(checkout);
					
					if (!isNaN(checkinDate.getTime()) && !isNaN(checkoutDate.getTime())) {
						const formatOptions: Intl.DateTimeFormatOptions = { 
							year: 'numeric', 
							month: 'long', 
							day: 'numeric' 
						};
						dateRange = `${checkinDate.toLocaleDateString('en-US', formatOptions)} - ${checkoutDate.toLocaleDateString('en-US', formatOptions)}`;
					}
				} catch (e) {
					console.error('Failed to parse check-in/out dates:', e);
				}
			}
		}
		
		// Check for budget
		if (searchParams.has('budget')) {
			budget = searchParams.get('budget') || '600';
		} else if (searchParams.has('max_price')) {
			budget = searchParams.get('max_price') || '600';
		}
		
		// Check for number of guests/rooms
		if (searchParams.has('rooms')) {
			selectedRooms = parseInt(searchParams.get('rooms') || '1', 10);
		} else if (searchParams.has('guests')) {
			selectedRooms = Math.ceil(parseInt(searchParams.get('guests') || '2', 10) / 2);
		}
	}
	
	// Handle URL changes and parse the search query
	onMount(() => {
		parseSearchQuery();
		
		// Load previously saved preferences
		previousPreferences = loadPreviousPreferences();
		
		// Add a listener for back/forward navigation
		window.addEventListener('popstate', () => {
			parseSearchQuery();
		});
		
		// Clear the store on mount - ensure a fresh search
		clearStore();
		
		// Check if we should start searching immediately (e.g., if redirected back from a failed search)
		if (searchId) {
			resumeSearch();
		}
		
		return () => {
			// Clean up the popstate listener
			window.removeEventListener('popstate', parseSearchQuery);
			
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
			sessionId = await queryProperties(parsedQuery);
			
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
	
	// Handle form submission for search
	async function handleSearch() {
		// Validate inputs
		if (!destination) {
			setError('Please enter a destination');
			return;
		}
		
		if (!dateRange) {
			setError('Please enter dates for your stay');
			return;
		}
		
		if (!isValidDate(dateRange)) {
			setError('Please enter valid dates for your stay');
			return;
		}
		
		// Reset error state
		setError(null);
		
		// Start the loading state
		isSearching = true;
		progress = 0;
		targetProgress = 0;
		
		// Save user preference if not empty
		if (preferences) {
			previousPreferences = loadPreviousPreferences();
		}
		
		// Prepare the search API query
		try {
			// Prepare budget value
			const budgetValue = {
				min: 50, // Minimum default
				max: budget ? parseInt(budget) : 600, // Default of 600
				currency: 'USD' // Default currency
			};
			
			// Build the query
			const query = prepareSearchQuery({
				destination,
				dateRange,
				budget: budgetValue,
				rooms: selectedRooms,
				preferences,
				filters: selectedFilters
			});
			
			// Set the search query to the store for use in the results
			setSearchQuery({
				destination,
				dateRange,
				budget: budgetValue,
				preferences,
				filters: selectedFilters
			});
			
			// Start the search session
			sessionId = await propertyService.startSearch(query);
			console.log('Search session started with ID:', sessionId);
			
			// Set up the progress animation
			progressInterval = setInterval(updateProgressSmooth, 30);
			
			// Set up SSE events connection for realtime updates
			setupEventStream(sessionId);
		} catch (error) {
			console.error('Error starting search:', error);
			isSearching = false;
			setError('Failed to start search. Please try again.');
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
				onSubmit={handleSearch}
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