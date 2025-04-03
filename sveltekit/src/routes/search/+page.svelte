<!-- 
  Main search page for Rentino
  This page allows users to search properties with a tag-based preference system
-->
<script lang="ts">
	import { setSearchQuery, clearStore, setError, getErrorMessage, setProperties } from '$lib/stores/properties.svelte';
	import { onMount } from 'svelte';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { streamEvents } from '$lib/event';
	import { subscribeToEvent, type PropertyEvaluationEventData, type PropertyEvaluationStep } from '$lib/event';
	import type { UnifiedProperty } from '$lib/types/unified-property';
	import { propertyService } from '$lib/services/api';
	// Import components
	import SearchForm from './SearchForm.svelte';
	import PropertyResults from './PropertyResults.svelte';
	import SearchProgress from './SearchProgress.svelte';
	import Map from './Map.svelte';
	import { ResizablePane, ResizablePaneGroup, ResizableHandle } from '$lib/components/ui/resizable';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { X, MapPin, Clock, Search, Check } from 'lucide-svelte';
	import { searchQuotaState } from '$lib/stores/search-quota.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
		
	// Import utilities
	import { loadPreviousPreferences, savePreference } from './preferences';
	import { parseDateRange, calculateStartDate, formatDateRange, isValidDate } from './dateHelpers';
	import { saveSearchToSupabaseAndNavigate } from './searchData';
	import { fade, fly, scale } from 'svelte/transition';
	import { ensureCompleteAnonymousSearchInfo } from './anonymousSearch';
	
	// Import necessary types
	import type { SavedPreference, SearchFormParams } from './types';
	
	// Define interface for page data
	interface PageData {
		popularDestinations: Array<{ name: string; id?: string; image?: string }>;
		subscriptionStatus?: {
			isActive: boolean;
			planId?: string;
			planName?: string;
			currentPeriodEnd?: string;
			isInTrial?: boolean;
			trialEnd?: string;
			isAnonymous?: boolean;
		};
		session?: any;
		supabase?: any;
		searchId?: string;
		anonymousSearchInfo?: {
			isAnonymous: boolean;
			hasReachedLimit: boolean;
			remainingSearches: number;
			searchCount: number;
		};
	}
	
	// Get data from loader
	let { data } = $props<{ data: PageData }>();
	
	let searchId = $derived(data.searchId);
	
	// Use the utility to ensure we have complete anonymousSearchInfo
	const isAnonymous = data.subscriptionStatus?.isAnonymous || false;
	
	// Log all the data we received from the server
	console.log("Raw data received in +page.svelte:", {
		searchId: data.searchId,
		isAnonymous: isAnonymous,
		subscriptionStatus: data.subscriptionStatus,
		anonymousSearchInfo: data.anonymousSearchInfo
	});
	
	
	// Check if we should show the search screen or account creation screen
	// Anonymous users should be able to search if they haven't reached their limit
	let showSearchScreen = $derived(!searchQuotaState.hasReachedLimit);
	let showLimitReachedDialog = $state(false);
	// Ensure the showSearchScreen state is updated whenever hasReachedLimit changes
	$effect(() => {
		if (searchQuotaState.hasReachedLimit && showSearchScreen) {
			console.log('Limit reached, hiding search screen');
			showSearchScreen = false;
		}
	});
	
	// Log important state info for debugging
	$effect(() => {
		console.log('Page data loaded:', {
			isAnonymous: searchQuotaState.isAnonymous,
			hasReachedLimit: searchQuotaState.hasReachedLimit,
			remainingSearches: searchQuotaState.remainingSearches,
			searchCount: searchQuotaState.searchCount,
			showSearchScreen
		});
	});
	
	// Local state
	let destination = $state('');
	let dateRange = $state('');

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
	let propertyCount = $state(0);
	let streamedProperties = $state<UnifiedProperty[]>([]);
	let progressInterval: ReturnType<typeof setInterval> | undefined;
	
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
						// Ensure coordinates are preserved
						const propertiesToSet = data.properties.map(property => {
							// Validate coordinates structure if present
							if (property.coordinates && 
								typeof property.coordinates.lat === 'number' && 
								typeof property.coordinates.lng === 'number') {
								// Valid coordinates, use them
								return property;
							} else if (property.location) {
								// Try to use any existing coordinates or preserve as undefined to match the type
								return { ...property, coordinates: property.coordinates || undefined };
							}
							return property;
						});
						
						streamedProperties = propertiesToSet;
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
			// Ensure coordinates are preserved for map display
			const propertiesToSet = data.properties.map(property => {
				// Validate coordinates structure if present
				if (property.coordinates && 
					typeof property.coordinates.lat === 'number' && 
					typeof property.coordinates.lng === 'number') {
					// Valid coordinates, use them
					return property;
				} else if (property.location) {
					// Try to use any existing coordinates or preserve as undefined to match the type
					return { ...property, coordinates: property.coordinates || undefined };
				}
				return property;
			});
			
			streamedProperties = propertiesToSet;
		}
		
		// Handle final results when evaluation is completed
		if (data.status === 'completed' && data.results && data.results.length > 0) {
			// Ensure coordinates are preserved for map display in final results
			const propertiesToSet = data.results.map(property => {
				// Validate coordinates structure if present
				if (property.coordinates && 
					typeof property.coordinates.lat === 'number' && 
					typeof property.coordinates.lng === 'number') {
					// Valid coordinates, use them
					return property;
				} else if (property.location) {
					// Try to use any existing coordinates or preserve as undefined to match the type
					return { ...property, coordinates: property.coordinates || undefined };
				}
				return property;
			});
			
			streamedProperties = propertiesToSet;
			
			// Then, save to the global store for the compare page
			setProperties(propertiesToSet);
			
			// Update property count if it wasn't set
			if (!propertyCount && data.count) {
				propertyCount = data.count;
			}
			
			// Mark search as complete
			setTimeout(() => {
				isSearching = false;
				
				// Check if anonymous user has now reached their limit
				if (searchQuotaState.isAnonymous && searchQuotaState.hasReachedLimit) {
					console.log('Search complete and user has reached limit - showing upgrade screen');
					// Give a brief moment to see the results before showing the upgrade screen
					setTimeout(() => {
						showSearchScreen = false;
					}, 3000);
				}
			}, 1000);
		}
		
		// Handle completed status even if no results
		if (data.status === 'completed') {
			targetProgress = 100;
			
			// Check anonymous user status after search completes
			if (searchQuotaState.isAnonymous) {
				// If they've reached their limit, make sure UI state reflects this
				if (searchQuotaState.remainingSearches === 0 || searchQuotaState.hasReachedLimit) {
					searchQuotaState.hasReachedLimit = true;
				}
			}
			
			// If we have no properties, show an error
			if (streamedProperties.length === 0) {
				setError('No properties found. Please try a different search.');
				isSearching = false;
			} else {
				// Finalize the search process
				setTimeout(() => {
					isSearching = false;
					
					// Check if anonymous user has now reached their limit
					if (searchQuotaState.isAnonymous && searchQuotaState.hasReachedLimit) {
						console.log('Search complete and user has reached limit - showing upgrade screen');
						// Give a brief moment to see the results before showing the upgrade screen
						setTimeout(() => {
							showSearchScreen = false;
						}, 3000);
					}
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
	
	
	// Handle form submission for search
	async function handleSearch({ destination, dateRange, budget, selectedRooms, preferences, selectedPropertyType, selectedAmenities }: SearchFormParams) {
		// Add debugging logs
		console.log('Search button clicked with destination:', destination);
		console.log('Destination type:', typeof destination, 'Length:', destination ? destination.length : 0);
		
		// First check if the user has already reached their limit
		if (searchQuotaState.isAnonymous && searchQuotaState.hasReachedLimit) {
			console.log('Search blocked: Anonymous user has already reached their search limit');
			showLimitReachedDialog = true;
			return;
		}
		
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
			
			// FIRST: Save search to database to increment search count for anonymous users
			// This uses the server-side endpoint that increments the search count
			try {
				const searchQueryObj = {
					query: destination,
					date: dateRange,
					budget: budgetValue,
					adults: selectedRooms * 2,
					children: 0,
					number_of_rooms: selectedRooms,
					preferences: preferences || ''
				};
				
				console.log('Saving search to increment counter:', searchQueryObj);
				
				const saveResponse = await fetch('/search', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ searchQuery: JSON.stringify(searchQueryObj) })
				});
				
				const saveResult = await saveResponse.json();
				console.log('Search saved result:', saveResult);
				
				// If we hit the limit for anonymous users, show error and stop
				if (!saveResponse.ok && saveResult.limitReached) {
					isSearching = false;
					setError(saveResult.message || 'You have reached your search limit. Please create an account to continue.');
					
					// Update anonymous user state to reflect limit reached
					searchQuotaState.hasReachedLimit = true;
					searchQuotaState.remainingSearches = 0;

					// Show the limit reached screen after a short delay
					setTimeout(() => {
						showSearchScreen = false;
					}, 1500);
					
					return;
				}
				
				// For anonymous users, check if this search will be their last allowed search
				if (searchQuotaState.isAnonymous) {
					// If they had exactly 1 search remaining before this search, they'll have 0 after
					if (searchQuotaState.remainingSearches === 1) {
						// Update the local state to reflect they've reached their limit
						searchQuotaState.remainingSearches = 0;
						searchQuotaState.hasReachedLimit = true;
						searchQuotaState.searchCount = searchQuotaState.searchCount + 1;
						
						// We'll continue with this search but show the limit message after it completes
						console.log('This is the last allowed search for this anonymous user. Will show upgrade message after completion.');
					}
				}
			} catch (saveError) {
				console.error('Error saving search to increment counter:', saveError);
				// Continue with search even if saving fails
			}
			
			// SECOND: Start the actual search session using queryProperties
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
			
			
			console.log('Search session started with ID:', response.session_id);
			
			// Set up the progress animation
			progressInterval = setInterval(updateProgressSmooth, 30);
			
			// Set up SSE events connection for realtime updates
			setupEventStream(response.session_id);
			
			// Check if we need to show the limit reached UI after search completes
			if (searchQuotaState.isAnonymous && searchQuotaState.hasReachedLimit) {
				// Set up a listener to handle the end of search
				const searchCompleteListener = () => {
					// When the search is complete, update the UI to show limit reached
					if (!isSearching && searchQuotaState.hasReachedLimit) {
						console.log('Search completed, showing limit reached message');
						// Short timeout to allow results to display briefly
						setTimeout(() => {
							showSearchScreen = false;
						}, 3000);
					}
				};
				
				// Check search status periodically
				const checkInterval = setInterval(() => {
					searchCompleteListener();
					if (!isSearching) {
						clearInterval(checkInterval);
					}
				}, 1000);
			}
		} catch (error) {
			console.error('Error starting search:', error);
			isSearching = false;
			
			// Check if the error might be related to the anonymous search limit
			if (searchQuotaState.isAnonymous) {
				if (searchQuotaState.remainingSearches <= 1) {
					// If they had 1 or 0 searches remaining, they've likely hit their limit
					console.log('Error during search - anonymous user assumed to have reached limit');
					
					// Set appropriate error message
					setError('You have reached your search limit. Please create an account to continue searching.');
					
					// Update anonymous user state
					searchQuotaState.hasReachedLimit = true;
					searchQuotaState.remainingSearches = 0;
					
					// Show the upgrade screen
					setTimeout(() => {
						showSearchScreen = false;
					}, 1500);
				} else {
					// Regular error for anonymous users with searches remaining
					setError('Failed to start search. Please try again or create an account for better results.');
				}
			} else {
				// Standard error for regular users
				setError('Failed to start search. Please try again.');
			}
		}
	}
	
	// Function to toggle map visibility
	function toggleMapVisibility() {
		showMap = !showMap;
	}
</script>

<div class="w-full h-screen overflow-hidden" transition:fade={{ duration: 300 }}>
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
						{destination}
						{dateRange}
						{budget}
						{preferences}
						{selectedRooms}
						{previousPreferences}
						isLoading={isSearching}
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
					
					<div class="flex-1">
						<!-- Interactive Google Map with property markers -->
						<Map 
							properties={streamedProperties} 
							selectedLocation={destination}
							height="100%"
						/>
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
<!-- Anonymous limit reached screen - simplified with shadcn -->
<Dialog.Root bind:open={showLimitReachedDialog}>

	<Dialog.Content class="max-w-md w-full">
		<Card class="overflow-hidden border-primary/10">
			<CardHeader class="bg-primary/5 border-b">
				<CardTitle class="flex items-center gap-2">
					<Search class="h-5 w-5 text-primary" />
					<span>Free Search Used</span>
				</CardTitle>
			</CardHeader>
			
			<CardContent class="pt-6">
				<div class="space-y-4">
					<div>
						<h3 class="text-xl font-medium mb-2">Create an account to continue</h3>
						<CardDescription class="text-base">
							You've used your free anonymous search. Create an account now to unlock the full experience.
						</CardDescription>
					</div>
					
					<div class="bg-muted/50 rounded-lg p-4 border">
						<h4 class="font-medium mb-2">With an account, you'll get:</h4>
						<ul class="space-y-2">
							<li class="flex items-start gap-2 text-sm">
								<Check class="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
								<span>Full 14-day trial with <strong>unlimited searches</strong></span>
							</li>
							<li class="flex items-start gap-2 text-sm">
								<Check class="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
								<span>Save your favorite properties for later comparison</span>
							</li>
							<li class="flex items-start gap-2 text-sm">
								<Check class="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
								<span>Personalized recommendations based on your preferences</span>
							</li>
							<li class="flex items-start gap-2 text-sm">
								<Check class="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
								<span>Access to search filters and tools</span>
							</li>
						</ul>
					</div>
				</div>
			</CardContent>
			
			<CardFooter class="flex flex-col sm:flex-row gap-3 border-t pt-4 pb-4 bg-muted/20">
				<Button href="/signup?redirect=/search" class="w-full sm:w-auto">
					Create Free Account
				</Button>
				<Button href="/login?redirect=/search" variant="outline" class="w-full sm:w-auto">
					Sign In
				</Button>
				
				<p class="text-xs text-muted-foreground mt-3 sm:ml-auto sm:mt-auto">
					No credit card required
				</p>
			</CardFooter>
		</Card>
	</Dialog.Content>
</Dialog.Root>

<style>
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style> 