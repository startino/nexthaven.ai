<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Badge } from '$lib/components/ui/badge';
	import { getSearchQuery, setProperties, setError,} from '$lib/stores/properties.svelte';
	import { Progress } from '$lib/components/ui/progress';
	import {
		Search,
		Home,
		Building2,
		MapPin,
		Database,
		Brain,
		Star,
		CheckCircle,
		ArrowLeft,	Clock,
		AlertCircle,
		X
	} from 'lucide-svelte';
	import { PUBLIC_API_URL } from '$env/static/public';
	import Button from '$lib/components/ui/button/button.svelte';
	import { page } from '$app/stores';
	import { streamEvents } from '$lib/event.js';
	import { propertyService } from '$lib/services/api';
	import { subscribeToEvent, type PropertyEvaluationEventData, type PropertyEvaluationStep } from '$lib/event';
	import { PropertyCard } from '$lib/components/property';
	import type { UnifiedProperty } from '$lib/types/unified-property';

	// Get data passed from the server
	let { data } = $props();
	let searchId = $derived(data.searchId);

	// API endpoints
	const API_BASE_URL = PUBLIC_API_URL || 'http://localhost:8000';
	// Remove API_PREFIX to match how the React app makes API calls directly
	// const API_PREFIX = '/api';

	// Loading step configuration - matching React implementation
	const steps = [
		{ icon: Search, text: 'Analyzing your preferences...', duration: 15 },
		{ icon: Database, text: 'Searching property databases...', duration: 20 },
		{ icon: Building2, text: 'Evaluating property features...', duration: 25 },
		{ icon: MapPin, text: 'Analyzing location data...', duration: 20 },
		{ icon: Brain, text: 'Running AI matching algorithms...', duration: 30 },
		{ icon: Star, text: 'Calculating property scores...', duration: 25 },
		{ icon: Home, text: 'Curating your perfect matches...', duration: 20 },
		{ icon: CheckCircle, text: 'Finalizing results...', duration: 15 }
	];

	// Calculate total duration
	const totalDuration = steps.reduce((acc, step) => acc + step.duration, 0);

	// State
	let currentStep = $state(0);
	let currentStepName = $state<PropertyEvaluationStep | undefined>(undefined);
	let progress = $state(0);
	let timeElapsed = $state(0);
	let error = $state<string | null>(null);
	let isProcessing = $state(true);
	let statusInterval: ReturnType<typeof setInterval> | undefined = $state(undefined);
	let sessionId = $state<string | null>(null);
	let redirectTimeout: ReturnType<typeof setTimeout> | undefined = $state(undefined);
	let lastProgressUpdate = $state(Date.now());
	let targetProgress = $state(20); // Target progress value for smooth animation

	// Store the properties that arrive from the stream
	let streamedProperties: UnifiedProperty[] = $state([]);
	let propertyCount = $state(0);

	// Define step ranges for more consistent progress per step
	// Each step gets roughly the same progress range (12-13%)
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

	// Define accelerated times for completing each step
	// Front-loaded time distribution to make early steps feel faster
	const stepTimeDistribution = [
		{ threshold: 0, progress: 0 }, // Starting point
		{ threshold: 8, progress: 13 }, // Step 1 completes faster (8s → 13%)
		{ threshold: 18, progress: 25 }, // Step 2 completes in 10s (18s → 25%)
		{ threshold: 35, progress: 38 }, // Step 3 completes in 17s (35s → 38%)
		{ threshold: 50, progress: 50 }, // Step 4 completes in 15s (50s → 50%)
		{ threshold: 70, progress: 63 }, // Step 5 completes in 20s (70s → 63%)
		{ threshold: 90, progress: 75 }, // Step 6 completes in 20s (90s → 75%)
		{ threshold: 115, progress: 88 }, // Step 7 completes in 25s (115s → 88%)
		{ threshold: 135, progress: 100 } // Step 8 completes in 20s (135s → 100%)
	];

	// Get search query using the getter function
	let query = $derived(getSearchQuery());

	// Format time as MM:SS - matching React implementation
	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
	}

	// Computed value for time remaining
	let timeRemaining = $derived(Math.max(0, totalDuration - timeElapsed));

	// Redirect to search with error
	function redirectToSearchWithError(errorMessage: string) {
		// Clear any existing redirect timeout
		if (redirectTimeout) clearTimeout(redirectTimeout);

		// Set the error message in the store
		setError(errorMessage);

		// Set local error for display
		error = errorMessage;
		isProcessing = false;

		// Don't automatically redirect - let the user click the button instead
	}

	// Custom API functions that match React's implementation
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
			const apiUrl = `${API_BASE_URL}/properties/query`;
			console.log('Making request to:', apiUrl);
			console.log('Request payload:', payload);

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
					console.error('Response not OK:', response.status, errorText);
					throw new Error(`Property query failed: ${response.status} ${errorText}`);
				}

				const data = await response.json();
				console.log('API Response:', data);

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
			console.error('Property query error:', err);
			const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
			redirectToSearchWithError(`Failed to start property search: ${errorMessage}`);
			throw err;
		}
	}

	async function checkQueryStatus(sessionId: string) {
		try {
			console.log('Checking status for session:', sessionId);

			// Update URL format to match the correct endpoint structure
			const apiUrl = `${API_BASE_URL}/properties/query/${sessionId}/status`;
			console.log('Status API URL:', apiUrl);

			// Add timeout to prevent hanging
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

			try {
				const response = await fetch(apiUrl, {
					signal: controller.signal
				});

				clearTimeout(timeoutId);

				if (!response.ok) {
					const errorText = await response.text();
					console.error('Response not OK:', response.status, errorText);
					throw new Error(`Status check failed: ${response.status} ${errorText}`);
				}

				const data = await response.json();
				console.log('Status Response:', data);

				return data;
			} catch (fetchError: any) {
				if (fetchError.name === 'AbortError') {
					throw new Error('Status check timed out after 10 seconds');
				}
				throw fetchError;
			}
		} catch (err) {
			console.error('Error checking query status:', err);
			const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
			redirectToSearchWithError(`Error checking search status: ${errorMessage}`);
			throw err;
		}
	}

	// async function evaluateWithPrefs(sessionId: string, preferences: string) {
	// 	try {
	// 		const apiUrl = `${API_BASE_URL}/properties/evaluate`;
	// 		console.log('Making request to:', apiUrl);
	// 		console.log('Request payload:', { session_id: sessionId, preferences });

	// 		// Transform request to match React app's approach
	// 		const requestBody = {
	// 			session_id: sessionId,
	// 			preferences: preferences
	// 		};

	// 		const response = await fetch(apiUrl, {
	// 			method: 'POST',
	// 			headers: { 'Content-Type': 'application/json' },
	// 			body: JSON.stringify(requestBody)
	// 		});

	// 		if (!response.ok) {
	// 			const errorText = await response.text();
	// 			console.error('Response not OK:', response.status, errorText);

	// 			// Try to parse the error message if it's JSON - match React app's approach
	// 			try {
	// 				const errorJson = JSON.parse(errorText);
	// 				throw new Error(
	// 					`Property evaluation failed: ${errorJson.detail || errorJson.message || response.status}`
	// 				);
	// 			} catch (e) {
	// 				// If parsing fails, use the raw error text
	// 				throw new Error(`Property evaluation failed: ${response.status} ${errorText}`);
	// 			}
	// 		}

	// 		const data = await response.json();
	// 		console.log('API Response:', data);

	// 		if (data.status !== 'success') {
	// 			throw new Error(`Property evaluation failed: ${data.message}`);
	// 		}

	// 		return data.results;
	// 	} catch (err) {
	// 		console.error('Property evaluation error:', err);
	// 		const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
	// 		redirectToSearchWithError(`Failed to evaluate properties: ${errorMessage}`);
	// 		throw err;
	// 	}
	// }

	async function processSearch() {
		if (!query) {
			// Redirect to search page if no query exists
			goto('/search');
			return;
		}

		try {
			// Parse the search query
			let payload;
			try {
				payload = JSON.parse(query);
			} catch (err) {
				throw new Error('Invalid search query format');
			}

			// Validate the payload has required fields
			if (!payload.query) {
				throw new Error('Missing destination in search query');
			}

			// Start the property query - using direct API calls to match React implementation
			const sessionIdResponse = await queryProperties({
				query: payload.query,
				date: payload.date,
				budget: {
					min: parseInt(payload.budget.min) || 200,
					max: parseInt(payload.budget.max) || 600
				},
				adults: payload.adults || 2,
				children: payload.children || 0,
				number_of_rooms: payload.number_of_rooms || 1
			});

			if (!sessionIdResponse) {
				throw new Error(`Failed to start property search`);
			}

			// Set session ID and start status polling
			sessionId = sessionIdResponse;

			// Make sure sessionId is defined before starting polling
			if (sessionId) {
				startStatusPolling(sessionId, payload.preferences);
			} else {
				throw new Error('No session ID returned from API');
			}
		} catch (err) {
			console.error('Error processing search:', err);
			const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
			redirectToSearchWithError(`Error starting search: ${errorMessage}`);
		}
	}

	async function startStatusPolling(sessionId: string, preferences: string) {
		// Safety check for valid sessionId
		if (!sessionId) {
			console.error('Invalid session ID for polling');
			redirectToSearchWithError('Search session not found');
			return;
		}

		// Add a safety timeout to prevent infinite polling
		const maxPollingTime = 300000; // 5 minutes
		const pollingTimeout = setTimeout(() => {
			if (statusInterval) {
				clearInterval(statusInterval);
				redirectToSearchWithError('Search is taking too long. Please try again later.');
			}
		}, maxPollingTime);

		// Set initial target progress - start at the beginning of step 2
		targetProgress = stepProgressRanges[1].min; // 13%
		currentStep = 1; // Explicitly set to step 2

		// Poll the status endpoint every 3 seconds
		statusInterval = setInterval(async () => {
			try {
				if (!sessionId) {
					console.error('No session ID available for status polling');
					if (statusInterval) clearInterval(statusInterval);
					clearTimeout(pollingTimeout);
					redirectToSearchWithError('Search session not found');
					return;
				}

				// Check query status
				console.log('Polling status for session at /properties/query/' + sessionId + '/status');
				const statusResponse = await checkQueryStatus(sessionId);
				console.log('Status response:', statusResponse);

				// Update progress based on properties count (if available)
				if (statusResponse.properties_count && statusResponse.properties_count > 0) {
					const propertyCount = statusResponse.properties_count;
					let propertyBasedProgress;

					// Map property count to progress within steps 2-4 (13%-50%)
					// Distribute property finding progress across these steps
					if (propertyCount <= 5) {
						// First 5 properties advance through step 2 (13-25%)
						propertyBasedProgress =
							stepProgressRanges[1].min +
							(propertyCount / 5) * (stepProgressRanges[1].max - stepProgressRanges[1].min);
					} else if (propertyCount <= 15) {
						// Next 10 properties advance through step 3 (25-38%)
						propertyBasedProgress =
							stepProgressRanges[2].min +
							((propertyCount - 5) / 10) * (stepProgressRanges[2].max - stepProgressRanges[2].min);
					} else {
						// Additional properties advance through step 4 (38-50%)
						const extraProperties = Math.min(propertyCount - 15, 20); // Cap at 20 more properties
						propertyBasedProgress =
							stepProgressRanges[3].min +
							(extraProperties / 20) * (stepProgressRanges[3].max - stepProgressRanges[3].min);
					}

					targetProgress = Math.max(targetProgress, propertyBasedProgress);

					// Update current step based on progress
					for (let i = 0; i < stepProgressRanges.length; i++) {
						if (
							targetProgress >= stepProgressRanges[i].min &&
							targetProgress < stepProgressRanges[i].max
						) {
							currentStep = i;
							break;
						}
					}

					console.log(
						`Updated target progress to ${targetProgress}% based on ${propertyCount} properties (Step ${currentStep + 1})`
					);
				} else {
					// If no properties count but still processing, gradually increase progress within current step
					const timeInPolling = (Date.now() - lastProgressUpdate) / 1000;

					if (timeInPolling > 3) {
						// Find current step based on progress
						let currentStepIndex = 0;
						for (let i = 0; i < stepProgressRanges.length; i++) {
							if (
								targetProgress >= stepProgressRanges[i].min &&
								targetProgress < stepProgressRanges[i].max
							) {
								currentStepIndex = i;
								break;
							}
						}

						// Calculate how far we are through the current step (0-1)
						const stepRange = stepProgressRanges[currentStepIndex];
						const progressInStep =
							(targetProgress - stepRange.min) / (stepRange.max - stepRange.min);

						// Increase more at the beginning of a step, less near the end
						const incrementFactor = Math.max(0.05, 0.3 * (1 - progressInStep));
						const stepSize = (stepRange.max - stepRange.min) * incrementFactor;
						const newProgress = Math.min(stepRange.max - 0.1, targetProgress + stepSize);

						targetProgress = newProgress;
						lastProgressUpdate = Date.now();
						console.log(
							`Gradually increased target progress to ${targetProgress}% within step ${currentStepIndex + 1}`
						);
					}
				}

				if (statusResponse.status === 'completed' && statusResponse.completed) {
					// Once completed, evaluate with preferences
					console.log('Property search completed, proceeding to evaluation');
					if (statusInterval) clearInterval(statusInterval);
					clearTimeout(pollingTimeout);

					// Jump target progress to show completion of this phase - start of step 5
					targetProgress = stepProgressRanges[4].min; // 50%
					currentStep = 4; // Step 5 (0-indexed)

					// Continue to evaluation
					await streamEvents(
						propertyService.evaluatePropertiesWithPreferences(sessionId, preferences)
					);
				} else if (statusResponse.status === 'error' || statusResponse.error) {
					// Handle error
					console.error(
						'Error in status response:',
						statusResponse.error || statusResponse.message
					);
					if (statusInterval) clearInterval(statusInterval);
					clearTimeout(pollingTimeout);
					const errorMessage = statusResponse.error || statusResponse.message || 'Unknown error';
					redirectToSearchWithError(`Error searching properties: ${errorMessage}`);
				} else {
					console.log('Search still in progress. Status:', statusResponse.status);
				}
			} catch (err) {
				console.error('Error checking query status:', err);
				if (statusInterval) clearInterval(statusInterval);
				clearTimeout(pollingTimeout);
				const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
				redirectToSearchWithError(`Error checking search status: ${errorMessage}`);
			}
		}, 3000);
	}

	async function evaluateProperties(sessionId: string, preferences: string) {
		try {
			// Validate sessionId and preferences
			if (!sessionId) {
				throw new Error('Missing session ID for property evaluation');
			}

			if (!preferences || preferences.trim() === '') {
				throw new Error('Missing preferences for property evaluation');
			}

			// Update target progress to step 5 (50-63%)
			targetProgress = stepProgressRanges[4].min; // 50%
			currentStep = 4; // Fifth step (0-indexed)

			console.log('Evaluating properties with session ID:', sessionId);
			console.log(`Starting evaluation at ${new Date().toISOString()}`);

			// Simulate continuous progress during evaluation spreading across steps 5-7
			const evaluationProgressInterval = setInterval(() => {
				// Find current step based on progress
				let currentStepIndex = 0;
				for (let i = 0; i < stepProgressRanges.length; i++) {
					if (
						targetProgress >= stepProgressRanges[i].min &&
						targetProgress < stepProgressRanges[i].max
					) {
						currentStepIndex = i;
						break;
					}
				}

				// Only advance up to step 7 (max 88%)
				if (currentStepIndex < 7) {
					// Calculate small increment within current step
					const stepRange = stepProgressRanges[currentStepIndex];
					const stepProgress = (targetProgress - stepRange.min) / (stepRange.max - stepRange.min);

					// Move to next step if we're near the end of current step
					if (stepProgress > 0.95) {
						// Move to beginning of next step
						targetProgress = stepProgressRanges[currentStepIndex + 1].min;
						currentStep = currentStepIndex + 1;
					} else {
						// Small increment within current step
						const increment = (stepRange.max - stepRange.min) * 0.01; // 1% of step range
						targetProgress = Math.min(stepRange.max - 0.1, targetProgress + increment);
					}
				}
			}, 800);

				// Call the evaluate endpoint
				console.log('Calling evaluation API...');
				streamEvents(
					propertyService.evaluatePropertiesWithPreferences(sessionId, preferences)
				);
			
			
		} catch (err) {
			console.error('Error evaluating properties:', err);
			const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
			redirectToSearchWithError(`Failed to evaluate properties: ${errorMessage}`);
		}
	}

	// Handle property evaluation events
	async function handlePropertyEvaluationEvent(data: PropertyEvaluationEventData) {
		console.log('Received property evaluation event:', data);
		
		// Update progress based on the event data
		if (data.progress !== undefined) {
			targetProgress = data.progress;
			updateProgressSmooth();
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
					console.log('Property retrieval step - properties count:', data.properties_count);
					break;
				case 'retrieved':
					currentStep = 2;
					// This is where properties should come in
					console.log('Property RETRIEVED step - properties count:', data.properties_count);
					console.log('Properties array in retrieved step:', data.properties);
					
					// Process the properties if they exist in the data
					if (data.properties && data.properties.length > 0) {
						console.log('Adding properties from retrieved step:', data.properties.length);
						
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
			console.log('Updating property count to:', data.properties_count);
			propertyCount = data.properties_count;
		}
		
		// Always try to process properties if they exist in the payload
		if (data.properties && data.properties.length > 0 && data.step !== 'retrieved') {
			console.log(`Adding ${data.properties.length} properties from step: ${data.step || 'unknown'}`);
			streamedProperties = data.properties;
		}
		
		// Handle final results when evaluation is completed
		if (data.status === 'completed' && data.results && data.results.length > 0) {
			console.log('Received final results:', data.results.length);
			console.log('First result in array:', JSON.stringify(data.results[0]));
		
			
			streamedProperties = data.results;
			
			// Then, save to the global store for the compare page
			setProperties(data.results);
			
			await updateSearchHistoryWithResults(data.results.length, data.results);
			
			// Update property count if it wasn't set
			if (!propertyCount && data.count) {
				propertyCount = data.count;
			}
			
			// Schedule redirect to compare page
			scheduleRedirect();
		} else if (data.status === 'completed' && (!data.results || data.results.length === 0)) {
			console.warn('Results array in completed status is empty or invalid');
			
			// If we have streamed properties but no results, use the streamed properties
			if (streamedProperties.length > 0) {
				console.log('Using streamed properties as results:', streamedProperties.length);
				setProperties(streamedProperties);
				scheduleRedirect();
			}
		}
		
		// for debugging purposes - log the current state
		console.log('Current state:', {
			currentStep,
			currentStepName,
			progress,
			propertyCount,
			streamedProperties: streamedProperties.length
		});
		
		// Handle completed status even if no results
		if (data.status === 'completed') {
			console.log('Evaluation process completed');
			targetProgress = 100;
			updateProgressSmooth();
			
			// If we have no properties yet but the process completed
			if (streamedProperties.length === 0) {
				redirectToSearchWithError('No properties found. Please try a different search.');
			} 
			else {
				// We have properties - either from streaming 
				console.log(`Redirecting to compare page with ${streamedProperties.length} properties`);
				// Save properties to the store for the compare page
				setProperties(streamedProperties);
				// Schedule redirect to compare page
				scheduleRedirect();
			}
		}
		
		// Handle error status (from error field, not status)
		if (data.error) {
			const errorMsg = data.error || 'An error occurred during property evaluation';
			redirectToSearchWithError(errorMsg);
		}
	}
	
	// Subscribe to property evaluation events when the component mounts
	let unsubscribe: (() => void) | undefined;
	
	onMount(() => {
		// Subscribe to property evaluation events
		unsubscribe = subscribeToEvent('property_evaluation', handlePropertyEvaluationEvent);
		
		// Start the request to evaluate properties
		startPropertyEvaluation();
		
		// Set up the interval to update progress smoothly
		progressInterval = setInterval(updateProgressSmooth, 100);
		
		// Clean up on unmount
		return () => {
			if (unsubscribe) unsubscribe();
			if (progressInterval) clearInterval(progressInterval);
			if (redirectTimeout) clearTimeout(redirectTimeout);
		};
	});
	
	// Interval for smooth progress updates
	let progressInterval: ReturnType<typeof setInterval> | undefined;
	
	// Update progress smoothly
	function updateProgressSmooth() {
		if (progress < targetProgress) {
			progress = Math.min(targetProgress, progress + 0.5);
		}
	}

	// Update the search history with result count and property data
	async function updateSearchHistoryWithResults(resultsCount: number, properties: any[]) {
		console.log('updateSearchHistoryWithResults properties', properties);
		try {
			// Use the searchId from props directly
			console.log('searchId from props:', searchId);

			if (!searchId) {
				console.log('No search ID found in props, skipping history update');
				return;
			}

			// Ensure we're using the actual count of valid properties
			const validProperties = properties.filter((p) => p && typeof p === 'object');
			const actualCount = validProperties.length;

			// If the counts don't match, log a warning
			if (resultsCount !== actualCount) {
				console.warn(
					`Results count mismatch: passed ${resultsCount}, but found ${actualCount} valid properties`
				);
				resultsCount = actualCount;
			}

			console.log(
				`Updating search history ID ${searchId} with ${resultsCount} results and saving property data`
			);

			// Call the API to update the search history and save property data
			console.log('properties', properties);
			const response = await fetch('/loading', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					searchId,
					resultsCount,
					properties
				})
			});

			const result = await response.json();

			if (!response.ok) {
				console.error('Error updating search history:', result.error);
			} else {
				console.log(
					`Search history updated successfully with ${result.savedProperties || 0} properties saved`
				);

				// Verify that savedProperties matches resultsCount
				if (result.savedProperties !== resultsCount) {
					console.warn(
						`Count mismatch after save: expected ${resultsCount}, but server reported ${result.savedProperties} saved`
					);
				}
			}
		} catch (error) {
			console.error('Error updating search history:', error);
		}
	}

	// Start the property evaluation process
	async function startPropertyEvaluation() {
		if (!query) {
			redirectToSearchWithError('No search query provided');
			return;
		}
		
		try {
			// Parse the search query
			const parsedQuery = JSON.parse(query);
			console.log('Starting property evaluation with query:', parsedQuery);
			sessionId = await queryProperties({
					query: parsedQuery.query || '',
					date: parsedQuery.date || '',
					budget: parsedQuery.budget || { min: 200, max: 600 },
					adults: parsedQuery.adults || 2,
					children: parsedQuery.children || 0,
					number_of_rooms: parsedQuery.number_of_rooms || 1
				});
			// Use the session ID from searchId if available
			if (searchId) {
				console.log('Using provided session ID:', searchId);
				
				
				// Start streaming events for this session
				const apiUrl = `${API_BASE_URL}/properties/evaluate`;
				
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
				
				// Set up streaming of events
				streamEvents(response);
			} else {
				// We need to create a session first
				console.log('No session ID provided, creating a new session');
				
				// Make a request to create a new session (similar to the old queryProperties)
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
					const apiUrl = `${API_BASE_URL}/properties/evaluate`;
					
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
					
					// Set up streaming of events
					streamEvents(response);
				} else {
					throw new Error('Failed to create a session');
				}
			}
		} catch (error) {
			console.error('Failed to start property evaluation:', error);
			const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
			redirectToSearchWithError(`Error: ${errorMessage}`);
		}
	}

	// Schedule redirect to compare page
	function scheduleRedirect() {
		if (redirectTimeout) {
			clearTimeout(redirectTimeout);
		}
		
		console.log('Scheduling redirect to /compare page in 2 seconds');
		
		// Wait 2 seconds to show the completed state before redirecting
		redirectTimeout = setTimeout(() => {
			console.log('Redirecting to /compare page now');
			goto('/compare');
		}, 2000);
	}

	// Check if a property has all the required fields for display
	function isValidProperty(property: any): boolean {
		try {
			// Basic validation of property structure
			if (!property || typeof property !== 'object') return false;
			if (!property.id || !property.name) return false;
			if (!property.media || !property.media.main_image) return false;
			if (!property.pricing || typeof property.pricing.total === 'undefined') return false;
			if (!property.features || !Array.isArray(property.features.amenities)) return false;
			
			console.log(`Property ${property.id} is valid with name: ${property.name}`);
			return true;
		} catch (e) {
			console.error('Error validating property:', e);
			return false;
		}
	}

	$effect(() => {
		// This will run whenever streamedProperties changes
		if (streamedProperties.length > 0) {
			console.log(`Effect detected ${streamedProperties.length} properties for rendering`);
			
			// Check if properties are valid
			const validCount = streamedProperties.filter(isValidProperty).length;
			console.log(`${validCount} out of ${streamedProperties.length} properties are valid for display`);
			
			if (validCount === 0 && streamedProperties.length > 0) {
				console.error('No valid properties found for display! Sample property:', JSON.stringify(streamedProperties[0]));
			}
		}
	});

	// Add effect to redirect when progress is complete
	$effect(() => {
		// This will run whenever progress changes
		if (progress >= 100 && !error && streamedProperties.length > 0) {
			console.log('Progress complete, preparing redirect to compare page');
			// Save final properties to store if not already done
			setProperties(streamedProperties);
			// Redirect
			scheduleRedirect();
		}
	});
</script>

<div class="min-h-screen bg-background text-foreground">
	<div class="max-w-7xl mx-auto px-4 pt-6 pb-12">
		<div class="flex justify-between items-center">
			<button 
				onclick={() => goto('/search')}
				class="flex items-center gap-2 text-muted-foreground hover:text-foreground"
				disabled={isProcessing}
			>
				<ArrowLeft size={20} />
				<span>Back to Search</span>
			</button>
			<h1 class="text-xl md:text-3xl font-serif italic text-foreground">Finding Your Perfect Properties</h1>
		</div>
		
		<div class="mt-8">
			<div class="mb-8">
				<Progress value={progress} class="h-2" />
				
				<div class="flex justify-between items-center mt-4">
					<div class="flex items-center gap-2">
						<svelte:component this={steps[currentStep].icon} class="h-5 w-5 text-primary" />
						<span>{steps[currentStep].text}</span>
					</div>
					
					<div class="text-sm text-muted-foreground">
						{#if progress < 100}
							<span class="flex items-center gap-1">
								<Clock class="h-4 w-4" />
								Estimated time: {formatTime(timeRemaining)}
							</span>
						{:else}
							<span class="flex items-center gap-1 text-green-500">
								<CheckCircle class="h-4 w-4" />
								Complete
							</span>
						{/if}
					</div>
				</div>
			</div>

			{#if error}
				<div class="bg-destructive/20 border border-destructive/50 rounded-lg p-6 mb-8">
					<div class="flex items-start gap-3">
						<AlertCircle class="h-6 w-6 text-destructive shrink-0 mt-0.5" />
						<div>
							<h3 class="font-semibold text-destructive mb-1">Error</h3>
							<p class="text-destructive/90">{error}</p>
							
							<div class="mt-4">
								<Button
									variant="destructive" 
									onclick={() => goto('/search')}
								>
									Return to Search
								</Button>
							</div>
						</div>
					</div>
				</div>
			{/if}
			
			<!-- Property Display Section -->
			{#if streamedProperties.length > 0}
				<div class="mt-8 border-t border-border pt-8">
					<div class="flex justify-between items-center mb-6">
						<h2 class="text-xl font-medium flex items-center gap-2">
							<Building2 class="h-5 w-5 text-primary" />
							<span>
								Properties Found: {streamedProperties.length} {#if propertyCount > 0}<span class="text-muted-foreground text-sm">of {propertyCount}</span>{/if}
							</span>
						</h2>
						
						{#if currentStepName === 'retrieving' || currentStepName === 'retrieved'}
							<div class="text-sm text-primary flex items-center gap-1">
								<span class="flex items-center gap-1">
									<Database class="h-4 w-4 animate-pulse" />
									<span>Loading property data...</span>
								</span>
							</div>
						{:else if progress < 100}
							<div class="text-sm text-muted-foreground flex items-center gap-1">
								<span class="flex items-center gap-1">
									<Clock class="h-4 w-4" />
									<span>Processing properties...</span>
								</span>
				</div>
			{:else}
							<div class="text-sm text-green-500 flex items-center gap-1">
								<CheckCircle class="h-4 w-4" />
								<span>Found {streamedProperties.length} properties</span>
							</div>
			{/if}
		</div>

					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{#each streamedProperties as property, i}
							<div class="transition-all duration-500 ease-in-out animate-fade-in animate-scale-in" style="animation-delay: {i * 150}ms">
								<div class="relative">
									<!-- Custom property card with defensive programming to handle missing data -->
									<Card class="overflow-hidden bg-card border-border text-foreground h-[450px] flex flex-col">
										<div class="relative h-56 overflow-hidden">
											<img 
												src={property.media?.main_image || 'https://via.placeholder.com/400x200?text=No+Image'} 
												alt={property.name}
												class="w-full h-full object-cover"
											/>
											<div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
											<div class="absolute bottom-4 left-4 text-white text-2xl font-bold">
												${property.pricing?.total ? Math.round(property.pricing.total) : 'N/A'}
					</div>
				</div>
										
										<div class="absolute top-3 right-3">
											<div class="w-16 h-16 rounded-full flex items-center justify-center bg-background/50 backdrop-blur-sm border-2 border-border text-foreground font-bold text-xl shadow-lg shadow-black/20">
												{property.score || 'N/A'}
											</div>
										</div>
										
										<CardContent class="p-4 space-y-3 flex-1 flex flex-col">
											<div class="space-y-1 text-left">
												<h3 class="font-bold text-lg line-clamp-1">{property.name}</h3>
												<p class="text-sm text-muted-foreground line-clamp-1">{property.location || 'Location information unavailable'}</p>
											</div>
											
											<div class="text-xs text-muted-foreground space-y-1 text-left">
												{#if property.capacity?.bedrooms || property.capacity?.beds}
													<div class="flex items-center gap-2">
														{#if property.capacity?.bedrooms}
															<span>{property.capacity.bedrooms} {property.capacity.bedrooms === 1 ? 'bedroom' : 'bedrooms'}</span>
														{/if}
														{#if property.capacity?.bedrooms && property.capacity?.beds}
															<span>•</span>
														{/if}
														{#if property.capacity?.beds}
															<span>{property.capacity.beds} {property.capacity.beds === 1 ? 'bed' : 'beds'}</span>
														{/if}
													</div>
												{/if}
											</div>
											
											<div class="flex flex-wrap gap-2 my-2">
												{#if property.features?.amenities && Array.isArray(property.features.amenities)}
													{#each property.features.amenities.slice(0, 3) as amenity}
														<Badge variant="outline">{amenity}</Badge>
			{/each}
													{#if property.features.amenities.length > 3}
														<Badge variant="outline" class="text-xs">+{property.features.amenities.length - 3}</Badge>
													{/if}
												{:else}
													<Badge variant="outline">Amenities N/A</Badge>
												{/if}
		</div>
										</CardContent>
									</Card>
								</div>
							</div>
						{/each}
						
						<!-- Placeholder skeletons for remaining properties -->
						{#if propertyCount > streamedProperties.length && propertyCount > 0}
							{#each Array(Math.min(3, propertyCount - streamedProperties.length)) as _, i}
								<div class="animate-pulse">
									<Card class="overflow-hidden bg-card/50 border-border text-foreground h-[450px]">
										<div class="relative h-56 bg-muted-foreground/10">
											<!-- Price skeleton -->
											<div class="absolute bottom-4 left-4 bg-muted/50 h-7 w-20 rounded-md"></div>
											
											<!-- Score skeleton -->
											<div class="absolute top-3 right-3 w-16 h-16 rounded-full bg-muted/50"></div>
			</div>
										<CardContent class="p-4 space-y-3">
											<Skeleton class="h-6 w-3/4" />
											<Skeleton class="h-4 w-1/2" />
											<div class="flex flex-wrap gap-2 my-4">
												<Skeleton class="h-5 w-16 rounded-full" />
												<Skeleton class="h-5 w-24 rounded-full" />
												<Skeleton class="h-5 w-20 rounded-full" />
				</div>
											<div class="flex items-start gap-2 mt-auto pt-3">
												<div class="rounded-full bg-muted/50 h-5 w-5 mt-0.5"></div>
												<Skeleton class="h-6 w-full" />
			</div>
										</CardContent>
									</Card>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			{:else if !error}
				<!-- Always show skeleton placeholders while loading -->
				<div class="mt-8 border-t border-border pt-8">
					<div class="flex justify-between items-center mb-6">
						<h2 class="text-xl font-medium flex items-center gap-2">
							<Database class="h-5 w-5 text-primary animate-pulse" />
							<span>{#if propertyCount > 0}Finding {propertyCount} Properties{:else}Searching for Properties{/if}</span>
						</h2>
						<div class="text-sm text-primary flex items-center gap-1">
							<span class="animate-pulse">{#if currentStepName}{currentStepName}{:else}Searching{/if}...</span>
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{#each Array(Math.max(3, Math.min(6, propertyCount || 3))) as _, i}
							<div class="animate-pulse" style="animation-delay: {i * 150}ms">
								<Card class="overflow-hidden bg-card/50 border-border text-foreground h-[450px]">
									<div class="relative h-56 bg-muted-foreground/10">
										<!-- Price skeleton -->
										<div class="absolute bottom-4 left-4 bg-muted/50 h-7 w-20 rounded-md"></div>
										
										<!-- Score skeleton -->
										<div class="absolute top-3 right-3 w-16 h-16 rounded-full bg-muted/50"></div>
									</div>
									<CardContent class="p-4 space-y-3">
										<Skeleton class="h-6 w-3/4" />
										<Skeleton class="h-4 w-1/2" />
										<div class="flex flex-wrap gap-2 my-4">
											<Skeleton class="h-5 w-16 rounded-full" />
											<Skeleton class="h-5 w-24 rounded-full" />
											<Skeleton class="h-5 w-20 rounded-full" />
										</div>
										<div class="flex items-start gap-2 mt-auto pt-3">
											<div class="rounded-full bg-muted/50 h-5 w-5 mt-0.5"></div>
											<Skeleton class="h-6 w-full" />
										</div>
									</CardContent>
								</Card>
							</div>
						{/each}
					</div>
					
					<p class="text-center text-muted-foreground mt-6">
						{#if currentStepName === 'retrieving' || currentStepName === 'retrieved'}
							Looking for available properties at your destination...
						{:else if progress > 50}
							Evaluating and ranking properties based on your preferences...
						{:else}
							Preparing to show you the best matches for your search...
						{/if}
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	
	@keyframes scaleIn {
		from { transform: scale(0.95); }
		to { transform: scale(1); }
	}
	
	.animate-fade-in {
		animation: fadeIn 0.8s ease-out forwards;
	}
	
	.animate-scale-in {
		animation: scaleIn 0.8s ease-out forwards;
	}
</style>
