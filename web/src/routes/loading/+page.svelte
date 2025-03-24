<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { getSearchQuery, setProperties, setError } from '$lib/stores/properties.svelte';
	import { Progress } from '$lib/components/ui/progress';
	import { Search, Home, Building2, MapPin, Database, Brain, Star, CheckCircle } from 'lucide-svelte';
	import { PUBLIC_API_URL } from '$env/static/public';
	
	// API endpoints
	const API_BASE_URL = PUBLIC_API_URL || 'http://localhost:8000';
	// Remove API_PREFIX to match how the React app makes API calls directly
	// const API_PREFIX = '/api';
	
	// Loading step configuration
	const steps = [
		{ icon: Search, text: "Analyzing your preferences...", duration: 15 },
		{ icon: Database, text: "Searching property databases...", duration: 20 },
		{ icon: Building2, text: "Evaluating property features...", duration: 25 },
		{ icon: MapPin, text: "Analyzing location data...", duration: 20 },
		{ icon: Brain, text: "Running AI matching algorithms...", duration: 30 },
		{ icon: Star, text: "Calculating property scores...", duration: 25 },
		{ icon: Home, text: "Curating your perfect matches...", duration: 20 },
		{ icon: CheckCircle, text: "Finalizing results...", duration: 15 }
	];
	
	// Calculate total duration
	const totalDuration = steps.reduce((acc, step) => acc + step.duration, 0);
	
	// State
	let currentStep = $state(0);
	let progress = $state(0);
	let timeElapsed = $state(0);
	let error = $state<string | null>(null);
	let isProcessing = $state(true);
	let statusInterval: ReturnType<typeof setInterval> | undefined = $state(undefined);
	let sessionId = $state<string | null>(null);
	let redirectTimeout: ReturnType<typeof setTimeout> | undefined = $state(undefined);
	
	// Get search query using the getter function
	let query = $derived(getSearchQuery());
	
	// Redirect to search with error
	function redirectToSearchWithError(errorMessage: string) {
		// Clear any existing redirect timeout
		if (redirectTimeout) clearTimeout(redirectTimeout);
		
		// Set the error message in the store
		setError(errorMessage);
		
		// Set local error for display
		error = errorMessage;
		isProcessing = false;
		
		// Show error message for 3 seconds, then redirect
		redirectTimeout = setTimeout(() => {
			goto('/search');
		}, 3000);
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
			const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
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
			console.error("Error checking query status:", err);
			const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
			redirectToSearchWithError(`Error checking search status: ${errorMessage}`);
			throw err;
		}
	}
	
	async function evaluateWithPrefs(sessionId: string, preferences: string) {
		try {
			const apiUrl = `${API_BASE_URL}/properties/evaluate`;
			console.log('Making request to:', apiUrl);
			console.log('Request payload:', { session_id: sessionId, preferences });
			
			// Transform request to match React app's approach
			const requestBody = {
				session_id: sessionId,
				preferences: preferences,
			};
			
			const response = await fetch(apiUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody)
			});
			
			if (!response.ok) {
				const errorText = await response.text();
				console.error('Response not OK:', response.status, errorText);
				
				// Try to parse the error message if it's JSON - match React app's approach
				try {
					const errorJson = JSON.parse(errorText);
					throw new Error(`Property evaluation failed: ${errorJson.detail || errorJson.message || response.status}`);
				} catch (e) {
					// If parsing fails, use the raw error text
					throw new Error(`Property evaluation failed: ${response.status} ${errorText}`);
				}
			}
			
			const data = await response.json();
			console.log('API Response:', data);
			
			if (data.status !== 'success') {
				throw new Error(`Property evaluation failed: ${data.message}`);
			}
			
			return data.results;
		} catch (err) {
			console.error('Property evaluation error:', err);
			const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
			redirectToSearchWithError(`Failed to evaluate properties: ${errorMessage}`);
			throw err;
		}
	}
	
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
			console.error("Error processing search:", err);
			const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
			redirectToSearchWithError(`Error starting search: ${errorMessage}`);
		}
	}
	
	async function startStatusPolling(sessionId: string, preferences: string) {
		// Safety check for valid sessionId
		if (!sessionId) {
			console.error("Invalid session ID for polling");
			redirectToSearchWithError("Search session not found");
			return;
		}
		
		// Add a safety timeout to prevent infinite polling
		const maxPollingTime = 180000; // 3 minutes
		const pollingTimeout = setTimeout(() => {
			if (statusInterval) {
				clearInterval(statusInterval);
				redirectToSearchWithError("Search is taking too long. Please try again later.");
			}
		}, maxPollingTime);
		
		// Poll the status endpoint every 3 seconds
		statusInterval = setInterval(async () => {
			try {
				if (!sessionId) {
					console.error("No session ID available for status polling");
					if (statusInterval) clearInterval(statusInterval);
					clearTimeout(pollingTimeout);
					redirectToSearchWithError("Search session not found");
					return;
				}
				
				// Check query status
				console.log("Polling status for session at /properties/query/" + sessionId + "/status");
				const statusResponse = await checkQueryStatus(sessionId);
				console.log("Status response:", statusResponse);
				
				// Update progress based on properties count (if available)
				if (statusResponse.properties_count && statusResponse.properties_count > 0) {
					// Set progress to show at least 50% for finding properties
					progress = Math.min(50, 20 + (statusResponse.properties_count / 20) * 30);
					console.log(`Updated progress to ${progress}% based on ${statusResponse.properties_count} properties`);
				}
				
				if (statusResponse.status === 'completed' && statusResponse.completed) {
					// Once completed, evaluate with preferences
					console.log("Property search completed, proceeding to evaluation");
					if (statusInterval) clearInterval(statusInterval);
					clearTimeout(pollingTimeout);
					
					// Continue to evaluation
					await evaluateProperties(sessionId, preferences);
				} else if (statusResponse.status === 'error' || statusResponse.error) {
					// Handle error
					console.error("Error in status response:", statusResponse.error || statusResponse.message);
					if (statusInterval) clearInterval(statusInterval);
					clearTimeout(pollingTimeout);
					const errorMessage = statusResponse.error || statusResponse.message || 'Unknown error';
					redirectToSearchWithError(`Error searching properties: ${errorMessage}`);
				} else {
					console.log("Search still in progress. Status:", statusResponse.status);
				}
			} catch (err) {
				console.error("Error checking query status:", err);
				if (statusInterval) clearInterval(statusInterval);
				clearTimeout(pollingTimeout);
				const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
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
			
			// Update progress to show we're evaluating
			progress = 60;
			currentStep = 4; // "Running AI matching algorithms" step
			
			console.log("Evaluating properties with session ID:", sessionId);
			
			try {
				// Call the evaluate endpoint - using direct API call to match React implementation
				const properties = await evaluateWithPrefs(sessionId, preferences);
				
				// Validate the results
				if (!properties) {
					throw new Error('No evaluation results returned');
				}
				
				// Store the results
				if (properties && properties.length > 0) {
					console.log("Properties evaluated successfully, found:", properties.length);
					setProperties(properties);
					
					// Set progress to 100%
					progress = 100;
					currentStep = steps.length - 1;
					
					// Navigate to the results page after a short delay
					setTimeout(() => {
						goto('/compare');
					}, 1000);
				} else {
					// If no properties found, show a specific message
					console.log("No properties found matching criteria");
					redirectToSearchWithError("No properties found matching your criteria. Please try with different preferences.");
				}
			} catch (evaluationError) {
				console.error("Property evaluation error:", evaluationError);
				throw evaluationError;
			}
		} catch (err) {
			console.error("Error evaluating properties:", err);
			const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
			redirectToSearchWithError(`Failed to evaluate properties: ${errorMessage}`);
		}
	}
	
	// Update the progress animation for visual feedback
	onMount(() => {
		let animationInterval: ReturnType<typeof setInterval>;
		
		try {
			// Start the search process
			processSearch();
			
			// Set up the animation
			animationInterval = setInterval(() => {
				if (!isProcessing) {
					clearInterval(animationInterval);
					return;
				}
				
				timeElapsed += 1;
				
				// Only update visual progress if not already updated by API
				if (!sessionId) {
					// Gradually increase up to 20% during initial request
					const newProgress = Math.min(20, (timeElapsed / 10) * 20);
					progress = newProgress;
				}
				
				// Determine which step we should be on based on progress
				for (let i = 0; i < steps.length; i++) {
					const thresholdPercent = ((i + 1) / steps.length) * 100;
					if (progress < thresholdPercent) {
						currentStep = i;
						break;
					}
				}
				
				// Add timeout safety - if taking too long without session ID, consider it an error
				if (timeElapsed > 20 && !sessionId) {
					clearInterval(animationInterval);
					redirectToSearchWithError("Search timed out. Please try again.");
				}
			}, 1000);
		} catch (err) {
			console.error("Error in loading page:", err);
			const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
			redirectToSearchWithError(`Error: ${errorMessage}`);
		}
		
		return () => {
			if (animationInterval) clearInterval(animationInterval);
			if (statusInterval) clearInterval(statusInterval);
			if (redirectTimeout) clearTimeout(redirectTimeout);
		};
	});
</script>

<div class="flex flex-col items-center justify-center min-h-screen py-12 px-4">
	<div class="text-center space-y-4 mb-8">
		<h1 class="text-3xl font-bold mb-2">Finding Your Perfect Stays</h1>
		<p class="text-muted-foreground max-w-xl mx-auto">
			Our AI is searching multiple platforms and optimizing for your preferences.
		</p>
	</div>
	
	<!-- Loading Progress -->
	<div class="w-full max-w-2xl mb-12">
		<div class="h-2 w-full bg-secondary rounded-full overflow-hidden">
			<div 
				class="h-full bg-primary transition-all duration-300 ease-out" 
				style="width: {progress}%"
			></div>
		</div>
		<div class="flex justify-between text-xs text-muted-foreground mt-2">
			<span>Searching properties</span>
			<span>{Math.round(progress)}%</span>
		</div>
	</div>
	
	<!-- Current Step -->
	<div class="mb-12 w-full max-w-lg">
		<div class="flex items-start gap-4 p-4 bg-card rounded-lg border border-border">
			<div class="bg-primary text-primary-foreground rounded-full p-3">
				<svelte:component this={steps[currentStep].icon} class="h-6 w-6" />
			</div>
			<div>
				<h3 class="font-medium mb-1">{steps[currentStep].text}</h3>
				<p class="text-sm text-muted-foreground">This might take a moment...</p>
			</div>
			</div>
		</div>
		
		<!-- Property Skeleton Cards -->
	{#if !error}
		<div class="w-full max-w-3xl mb-8">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			{#each Array(2) as _, i}
					<Card class="overflow-hidden bg-card">
					<div class="h-44 overflow-hidden">
						<Skeleton class="w-full h-full" />
					</div>
					<CardContent class="p-4 space-y-4">
						<div class="flex justify-between">
							<Skeleton class="h-6 w-[150px]" />
							<Skeleton class="h-6 w-[50px] rounded-full" />
						</div>
						<Skeleton class="h-4 w-full" />
						<Skeleton class="h-4 w-[70%]" />
						<div class="flex gap-2 pt-2">
							<Skeleton class="h-8 w-16 rounded-full" />
							<Skeleton class="h-8 w-20 rounded-full" />
							<Skeleton class="h-8 w-16 rounded-full" />
						</div>
						<div class="flex justify-between pt-2">
							<Skeleton class="h-8 w-24" />
							<Skeleton class="h-8 w-[100px]" />
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>
	</div>
	{/if}
	
	<!-- Error Display -->
	{#if error}
		<div class="mt-4 p-4 bg-destructive/20 text-destructive rounded-md max-w-lg w-full">
			<div class="flex items-start gap-3">
				<div class="mt-1">⚠️</div>
				<div>
					<h3 class="font-medium mb-1">Error</h3>
					<p class="text-sm">{error}</p>
					<p class="mt-2 text-xs text-destructive/80">
						Redirecting to search page in 3 seconds...
					</p>
				</div>
			</div>
	</div>
	{/if}
</div> 