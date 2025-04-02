<!-- 
  Main search page for Rentino
  This page allows users to search properties with a tag-based preference system
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
	import SearchForm from './SearchForm.svelte';
	import PropertyResults from './PropertyResults.svelte';
	import SearchProgress from './SearchProgress.svelte';
	import { ResizablePane, ResizablePaneGroup, ResizableHandle } from '$lib/components/ui/resizable';
	import { Button } from '$lib/components/ui/button';
	import { X, MapPin } from 'lucide-svelte';
		
	// Import utilities
	import { TEMPLATE_TEXT, loadPreviousPreferences } from './preferences';
	import { parseDateRange, calculateStartDate, formatDateRange, isValidDate } from './dateHelpers';
	import { fade } from 'svelte/transition';
	
	// Import necessary types
	import type { SavedPreference } from './types';
	
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
	let showMap = $state(true); // Track if map section is visible
	
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
	
	// Create an effect to clear the error after a timeout
	$effect(() => {
		if (error) {
			const timeout = setTimeout(() => {
				setError(null);
			}, 5000);
			
			return () => clearTimeout(timeout);
		}
	});
	
	// Log when destination changes
	$effect(() => {
		console.log("Parent component destination updated:", destination);
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
	
	// Function to setup event stream for property updates
	function setupEventStream(sessionId: string) {
		// Set up the evaluation endpoint URL
		const apiUrl = `${PUBLIC_API_URL}/properties/evaluate`;
		
		// Ensure preferences are properly formatted and used
		const tagsPreferences = preferences.trim();
		console.log("Sending tag preferences to backend:", tagsPreferences);
		
		// Construct the request body
		const requestBody = {
			session_id: sessionId,
			preferences: tagsPreferences || ''
		};
		
		// Make the request
		const response = fetch(apiUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		
		// Set up subscription for property evaluation events
		const unsubscribe = subscribeToEvent('property_evaluation', handlePropertyEvaluationEvent);
		
		// Start streaming events from the response
		streamEvents(response);
	}
	
	// Function to start or resume a search
	async function resumeSearch() {
		// Implement logic to resume a search based on searchId
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
			currentStepName = undefined; // Explicitly reset the current step name
			
			// Clear any existing progress interval
			if (progressInterval) {
				clearInterval(progressInterval);
			}
			
			// Start tracking progress
			progressInterval = setInterval(updateProgressSmooth, 100);
			
			// Make a request to create a new session
			sessionId = await queryProperties(parsedQuery);
			
			if (sessionId) {
				console.log('Created session ID:', sessionId);
				
				// Set up SSE events connection for realtime updates
				setupEventStream(sessionId);
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
		// Add debugging logs
		console.log('Search button clicked with destination:', destination);
		console.log('Destination type:', typeof destination, 'Length:', destination ? destination.length : 0);
		
		// Validate inputs
		if (!destination || destination.trim() === '') {
			setError('Please enter a location');
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
		
		// Start the loading state and reset all search-related state variables
		isSearching = true;
		progress = 0;
		targetProgress = 0;
		currentStep = 0;
		currentStepName = undefined; // Explicitly reset the current step name to ensure loading indicators start fresh
		streamedProperties = []; // Reset properties from previous search
		propertyCount = 0; // Reset property count
		
		// Clear any existing progress interval
		if (progressInterval) {
			clearInterval(progressInterval);
			progressInterval = undefined;
		}
		
		// Save user preference if not empty
		if (preferences) {
			previousPreferences = loadPreviousPreferences();
		}
		
		// Prepare the search API query
		try {
			// Prepare budget value - parse from format like "nightly:70-200" or "total:500-2000"
			let budgetValue = {
				min: 50,  // Default minimum
				max: 600  // Default maximum
			};
			
			// Parse the budget string from SearchForm component
			if (budget && typeof budget === 'string') {
				console.log('Raw budget string:', budget);
				
				// Check if this is a nightly or total budget
				const isNightly = budget.startsWith('nightly:');
				const isTotal = budget.startsWith('total:');
				const rangeString = budget.replace(/^(nightly:|total:)/, '');
				
				// Parse the range values
				if (rangeString.includes('-')) {
					const [minStr, maxStr] = rangeString.split('-');
					
					// Convert to integers with parseInt
					const min = parseInt(minStr, 10);
					const max = parseInt(maxStr, 10);
					
					if (!isNaN(min) && !isNaN(max)) {
						// If this is a nightly budget, calculate the total based on nights
						if (isNightly) {
							// Calculate nights from date range
							let nights = 7; // Default to 7 nights if we can't calculate
							
							try {
								if (dateRange) {
									// Try to parse dates from the range
									const parsed = parseDateRange(dateRange);
									if (parsed.startDate && parsed.endDate) {
										const startDate = new Date(parsed.startDate);
										const endDate = new Date(parsed.endDate);
										const timeDiff = endDate.getTime() - startDate.getTime();
										nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
										
										// Ensure nights is at least 1 and a reasonable number
										nights = Math.max(1, Math.min(nights, 90));
									}
								}
							} catch (e) {
								console.error('Error calculating nights from date range:', e);
								// Keep default 7 nights
							}
							
							console.log(`Converting nightly budget to total using ${nights} nights`);
							
							// Multiply nightly values by number of nights to get total
							budgetValue = {
								min: Math.max(0, Math.floor(min * nights)),
								max: Math.max(Math.floor(min * nights) + 1, Math.floor(max * nights))
							};
						} else {
							// If it's already a total budget, use as is
							budgetValue = {
								min: Math.max(0, Math.floor(min)),
								max: Math.max(Math.floor(min) + 1, Math.floor(max))
							};
						}
						
						console.log('Parsed budget values:', budgetValue);
					} else {
						console.error('Failed to parse budget range values. Using defaults instead.', { minStr, maxStr });
					}
				} else {
					console.error('Budget string does not contain range separator. Using defaults.', rangeString);
				}
			} else {
				console.warn('No budget string provided. Using default budget values:', budgetValue);
			}
			
			// Final validation check to ensure budget has valid integers
			if (!Number.isInteger(budgetValue.min) || !Number.isInteger(budgetValue.max) ||
				budgetValue.min < 0 || budgetValue.max <= 0 || budgetValue.min >= budgetValue.max) {
				console.error('Invalid budget values detected, resetting to defaults:', budgetValue);
				budgetValue = {
					min: 50,
					max: 600
				};
			}
			
			console.log('Final TOTAL budget being sent to API:', budgetValue, '(API only accepts total budgets)');
			
			// Set the search query to the store for use in the results
			setSearchQuery({
				destination,
				dateRange,
				budget: budgetValue,
				preferences,
				filters: {} // Removed filters, using tags instead
			});
			
			// Start the search session using queryProperties
			const requestBody = {
				query: destination,
				date: dateRange,
				budget: budgetValue,
				adults: selectedRooms * 2, // Assume 2 adults per room
				children: 0,
				number_of_rooms: selectedRooms
			};
			
			// Log the complete request
			console.log('Full API request payload:', JSON.stringify(requestBody));
			
			const response = await propertyService.queryProperties(requestBody);
			
			sessionId = response.session_id;
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
	
	// Function to toggle map visibility
	function toggleMapVisibility() {
		showMap = !showMap;
	}
</script>

<div class="w-full h-screen overflow-hidden">
	<ResizablePaneGroup direction="horizontal" class="h-full">
		<!-- Left sidebar with search inputs and results -->
		<ResizablePane minSize={20} defaultSize={showMap ? 66 : 100}>
			<div class="h-full overflow-y-auto">
				<div class="p-4 md:p-6">
					<!-- Error message box -->
					{#if error}
					<div 
						class="w-full mb-4 p-3 bg-destructive/20 text-destructive rounded-lg border border-destructive/30"
						transition:fade={{ duration: 200 }}
					>
						<div class="flex items-start gap-3">
							<div class="mt-1">⚠️</div>
							<div>
								<h3 class="font-medium mb-1 text-sm">Error</h3>
								<p class="text-xs">{error}</p>
							</div>
						</div>
					</div>
					{/if} 					
					
					<!-- Search Inputs -->
					<SearchForm
						bind:destination
						bind:dateRange
						bind:budget
						bind:selectedRooms
						bind:preferences
						{previousPreferences}
						onSubmit={handleSearch}
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
		</ResizablePane>
		
		{#if showMap}
			<!-- Resizable handle with visible grip -->
			<ResizableHandle withHandle />
			
			<!-- Map section (right side - 1/3 of screen width) -->
			<ResizablePane minSize={20} defaultSize={34}>
				<div class="h-full bg-muted/40 relative flex flex-col">
					<div class="p-3 border-b flex items-center justify-between bg-background/80">
						<div class="flex items-center gap-2">
							<MapPin class="h-5 w-5 text-primary" />
							<h3 class="font-medium text-sm">Map View</h3>
						</div>
						<Button 
							variant="outline" 
							size="sm" 
							onclick={toggleMapVisibility}
							class="h-8 px-3 flex items-center gap-1.5"
							aria-label="Close map"
						>
							<X class="h-4 w-4" />
							<span>Close</span>
						</Button>
					</div>
					
					<div class="flex-1 flex items-center justify-center">
						<div class="text-center p-6">
							<div class="bg-primary/10 rounded-full p-4 inline-block mb-3">
								<MapPin class="h-8 w-8 text-primary/70" />
							</div>
							<h4 class="text-lg font-medium mb-2">Map View Coming Soon</h4>
							<p class="text-sm text-muted-foreground max-w-[250px] mx-auto mb-4">
								We're working on a beautiful interactive map to help you find properties more easily.
							</p>
							<Button 
								variant="outline" 
								size="sm" 
								onclick={toggleMapVisibility}
								class="text-xs"
							>
								Hide Map & Get More Space
							</Button>
						</div>
					</div>
				</div>
			</ResizablePane>
		{:else}
			<!-- Show a small button to restore the map -->
			<div class="absolute top-[72px] md:top-4 right-4 z-10">
				<Button 
					variant="outline" 
					size="sm" 
					onclick={toggleMapVisibility}
					class="flex items-center gap-1.5 shadow-sm"
				>
					<MapPin class="h-4 w-4" />
					<span>Show Map</span>
				</Button>
			</div>
		{/if}
	</ResizablePaneGroup>
</div>

<style>
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out forwards;
  }
</style> 