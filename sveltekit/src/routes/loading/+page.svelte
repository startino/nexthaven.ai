<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { getSearchQuery, setProperties, setError } from '$lib/stores/properties.svelte';
	import { Progress } from '$lib/components/ui/progress';
	import { Search, Home, Building2, MapPin, Database, Brain, Star, CheckCircle, ArrowLeft, X } from 'lucide-svelte';
	import { PUBLIC_API_URL } from '$env/static/public';
	import Button from '$lib/components/ui/button/button.svelte';
	
	// API endpoints
	const API_BASE_URL = PUBLIC_API_URL || 'http://localhost:8000';
	// Remove API_PREFIX to match how the React app makes API calls directly
	// const API_PREFIX = '/api';
	
	// Loading step configuration - matching React implementation
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
	let lastProgressUpdate = $state(Date.now());
	let targetProgress = $state(20); // Target progress value for smooth animation
	
	// Define step ranges for more consistent progress per step
	// Each step gets roughly the same progress range (12-13%)
	const stepProgressRanges = [
		{ min: 0, max: 13 },    // Step 1: 0-13%
		{ min: 13, max: 25 },   // Step 2: 13-25%
		{ min: 25, max: 38 },   // Step 3: 25-38%
		{ min: 38, max: 50 },   // Step 4: 38-50%
		{ min: 50, max: 63 },   // Step 5: 50-63%
		{ min: 63, max: 75 },   // Step 6: 63-75%
		{ min: 75, max: 88 },   // Step 7: 75-88%
		{ min: 88, max: 100 }   // Step 8: 88-100%
	];
	
	// Define accelerated times for completing each step
	// Front-loaded time distribution to make early steps feel faster
	const stepTimeDistribution = [
		{ threshold: 0, progress: 0 },     // Starting point
		{ threshold: 8, progress: 13 },    // Step 1 completes faster (8s → 13%)
		{ threshold: 18, progress: 25 },   // Step 2 completes in 10s (18s → 25%)
		{ threshold: 35, progress: 38 },   // Step 3 completes in 17s (35s → 38%)
		{ threshold: 50, progress: 50 },   // Step 4 completes in 15s (50s → 50%)
		{ threshold: 70, progress: 63 },   // Step 5 completes in 20s (70s → 63%)
		{ threshold: 90, progress: 75 },   // Step 6 completes in 20s (90s → 75%)
		{ threshold: 115, progress: 88 },  // Step 7 completes in 25s (115s → 88%)
		{ threshold: 135, progress: 100 }  // Step 8 completes in 20s (135s → 100%)
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
		
		// Set initial target progress - start at the beginning of step 2
		targetProgress = stepProgressRanges[1].min; // 13%
		currentStep = 1; // Explicitly set to step 2
		
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
					const propertyCount = statusResponse.properties_count;
					let propertyBasedProgress;
					
					// Map property count to progress within steps 2-4 (13%-50%)
					// Distribute property finding progress across these steps
					if (propertyCount <= 5) {
						// First 5 properties advance through step 2 (13-25%)
						propertyBasedProgress = stepProgressRanges[1].min + 
							(propertyCount / 5) * (stepProgressRanges[1].max - stepProgressRanges[1].min);
					} else if (propertyCount <= 15) {
						// Next 10 properties advance through step 3 (25-38%)
						propertyBasedProgress = stepProgressRanges[2].min + 
							((propertyCount - 5) / 10) * (stepProgressRanges[2].max - stepProgressRanges[2].min);
					} else {
						// Additional properties advance through step 4 (38-50%)
						const extraProperties = Math.min(propertyCount - 15, 20); // Cap at 20 more properties
						propertyBasedProgress = stepProgressRanges[3].min + 
							(extraProperties / 20) * (stepProgressRanges[3].max - stepProgressRanges[3].min);
					}
					
					targetProgress = Math.max(targetProgress, propertyBasedProgress);
					
					// Update current step based on progress
					for (let i = 0; i < stepProgressRanges.length; i++) {
						if (targetProgress >= stepProgressRanges[i].min && targetProgress < stepProgressRanges[i].max) {
							currentStep = i;
							break;
						}
					}
					
					console.log(`Updated target progress to ${targetProgress}% based on ${propertyCount} properties (Step ${currentStep + 1})`);
				} else {
					// If no properties count but still processing, gradually increase progress within current step
					const timeInPolling = (Date.now() - lastProgressUpdate) / 1000;
					
					if (timeInPolling > 3) {
						// Find current step based on progress
						let currentStepIndex = 0;
						for (let i = 0; i < stepProgressRanges.length; i++) {
							if (targetProgress >= stepProgressRanges[i].min && targetProgress < stepProgressRanges[i].max) {
								currentStepIndex = i;
								break;
							}
						}
						
						// Calculate how far we are through the current step (0-1)
						const stepRange = stepProgressRanges[currentStepIndex];
						const progressInStep = (targetProgress - stepRange.min) / (stepRange.max - stepRange.min);
						
						// Increase more at the beginning of a step, less near the end
						const incrementFactor = Math.max(0.05, 0.3 * (1 - progressInStep));
						const stepSize = (stepRange.max - stepRange.min) * incrementFactor;
						const newProgress = Math.min(stepRange.max - 0.1, targetProgress + stepSize);
						
						targetProgress = newProgress;
						lastProgressUpdate = Date.now();
						console.log(`Gradually increased target progress to ${targetProgress}% within step ${currentStepIndex + 1}`);
					}
				}
				
				if (statusResponse.status === 'completed' && statusResponse.completed) {
					// Once completed, evaluate with preferences
					console.log("Property search completed, proceeding to evaluation");
					if (statusInterval) clearInterval(statusInterval);
					clearTimeout(pollingTimeout);
					
					// Jump target progress to show completion of this phase - start of step 5
					targetProgress = stepProgressRanges[4].min; // 50%
					currentStep = 4; // Step 5 (0-indexed)
					
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
			
			// Update target progress to step 5 (50-63%)
			targetProgress = stepProgressRanges[4].min; // 50%
			currentStep = 4; // Fifth step (0-indexed)
			
			console.log("Evaluating properties with session ID:", sessionId);
			console.log(`Starting evaluation at ${new Date().toISOString()}`);
			
			// Simulate continuous progress during evaluation spreading across steps 5-7
			const evaluationProgressInterval = setInterval(() => {
				// Find current step based on progress
				let currentStepIndex = 0;
				for (let i = 0; i < stepProgressRanges.length; i++) {
					if (targetProgress >= stepProgressRanges[i].min && targetProgress < stepProgressRanges[i].max) {
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
			
			try {
				// Call the evaluate endpoint
				console.log("Calling evaluation API...");
				const properties = await evaluateWithPrefs(sessionId, preferences);
				
				// Clear the evaluation progress interval
				clearInterval(evaluationProgressInterval);
				
				// Validate the results
				if (!properties) {
					throw new Error('No evaluation results returned');
				}
				
				// Store the results
				if (properties && properties.length > 0) {
					console.log(`Properties evaluated successfully, found: ${properties.length} at ${new Date().toISOString()}`);
					setProperties(properties);
					
					// Final step progress (88-100%)
					targetProgress = stepProgressRanges[7].min; // 88%
					currentStep = 7; // Last step (0-indexed)
					
					// Final step progress and navigation
					setTimeout(() => {
						// Force progress to 100%
						progress = 100;
						targetProgress = 100;
						
						// Then navigate after a short moment
						setTimeout(() => {
							goto('/compare');
						}, 500);
					}, 1000);
				} else {
					// If no properties found, show a specific message
					console.log("No properties found matching criteria");
					redirectToSearchWithError("No properties found matching your criteria. Please try with different preferences.");
				}
			} catch (evaluationError) {
				clearInterval(evaluationProgressInterval);
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
		let progressInterval: ReturnType<typeof setInterval>;
		
		try {
			// Start the search process
			processSearch();
			
			// Initialize the target progress based on the first step
			targetProgress = 0;
			currentStep = 0;
			
			// Set up the animation for steps
			animationInterval = setInterval(() => {
				if (!isProcessing) {
					clearInterval(animationInterval);
					return;
				}
				
				timeElapsed += 1;
				
				// Use step time distribution for initial progress (before session ID)
				if (!sessionId) {
					for (let i = 1; i < stepTimeDistribution.length; i++) {
						const prevThreshold = stepTimeDistribution[i-1].threshold;
						const nextThreshold = stepTimeDistribution[i].threshold;
						
						if (timeElapsed >= prevThreshold && timeElapsed < nextThreshold) {
							// Calculate progress within this time range
							const timeProgress = (timeElapsed - prevThreshold) / (nextThreshold - prevThreshold);
							const rangeStart = stepTimeDistribution[i-1].progress;
							const rangeEnd = stepTimeDistribution[i].progress;
							const calculatedProgress = rangeStart + timeProgress * (rangeEnd - rangeStart);
							
							targetProgress = calculatedProgress;
							
							// Update current step based on progress
							for (let j = 0; j < stepProgressRanges.length; j++) {
								if (targetProgress >= stepProgressRanges[j].min && targetProgress < stepProgressRanges[j].max) {
									currentStep = j;
									break;
								}
							}
							
							break;
						}
					}
				}
				
				// Add timeout safety
				if (timeElapsed > 20 && !sessionId) {
					clearInterval(animationInterval);
					redirectToSearchWithError("Search timed out. Please try again.");
				}
			}, 1000);
			
			// Separate interval for smooth progress updates
			progressInterval = setInterval(() => {
				if (!isProcessing) {
					clearInterval(progressInterval);
					return;
				}
				
				// Smoothly animate progress toward target
				if (progress < targetProgress) {
					// Calculate distance to target
					const distance = targetProgress - progress;
					
					// Speed based on distance and which step we're in
					let step;
					if (distance > 10) {
						step = 0.7; // Move quickly when far from target
					} else if (distance < 1) {
						step = 0.05; // Move very slowly when approaching target
					} else {
						// Scale between 0.05 and 0.7 based on distance
						step = 0.05 + (distance / 10) * 0.65;
					}
					
					// Apply the step with slight randomization for more natural movement
					const randomFactor = 0.8 + Math.random() * 0.4; // Random between 0.8-1.2
					progress = Math.min(targetProgress, progress + (step * randomFactor));
				}
			}, 50);
		} catch (err) {
			console.error("Error in loading page:", err);
			const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
			redirectToSearchWithError(`Error: ${errorMessage}`);
		}
		
		return () => {
			if (animationInterval) clearInterval(animationInterval);
			if (progressInterval) clearInterval(progressInterval);
			if (statusInterval) clearInterval(statusInterval);
			if (redirectTimeout) clearTimeout(redirectTimeout);
		};
	});
</script>

<div class="min-h-screen bg-background flex items-center justify-center">
	<div class="w-full max-w-md px-4 py-6 space-y-8">

		<div class="text-center space-y-4">
			<h1 class="text-4xl font-serif text-gradient">nexthaven.ai</h1>
			<p class="text-lg text-foreground/70">Our AI agents are working their magic</p>
			<p class="text-sm text-foreground/50">This may take a few minutes</p>
			
			{#if error}
				<div class="mt-6 p-4 bg-destructive/20 rounded-md w-full mb-6">
					<div class="flex items-start gap-3">
						<div class="mt-1">⚠️</div>
						<div class="flex-1">
							<h3 class="font-medium mb-1 text-foreground">We hit a snag</h3>
							<p class="text-sm text-foreground/80">{error}</p>
							<div class="mt-4 flex space-x-3">
								<Button 
									variant="outline"
									size="default"
									class="flex items-center gap-2"
									href="/search">
									<ArrowLeft class="h-4 w-4" />
									<span>Back to Search</span>
								</Button>
							</div>
						</div>
					</div>
				</div>
			{:else}
				<!-- Cancel button -->
				<Button 
					variant="ghost"
					size="sm"
					class="mt-2 flex items-center gap-1.5"
					href="/search">
					<X class="h-3.5 w-3.5" />
					<span>Cancel search</span>
				</Button>
			{/if}
			
		</div>
		
		<!-- Steps - match React styling and animations -->
		<div class="space-y-4">
			{#each steps as step, index}
				<div class="flex items-center gap-4" 
					style="opacity: {index === currentStep ? 1 : (index < currentStep ? 0.7 : 0.3)}; 
						   transform: translateX({index === currentStep ? '10px' : '0px'}); 
						   transition: all 0.3s ease-in-out;">
					<div class={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300
						${index === currentStep 
							? 'bg-gradient-to-r gradient-primary shadow-lg shadow-primary/20' 
							: (index < currentStep ? 'bg-primary/50' : 'bg-foreground/10')}`}>
						<svelte:component 
							this={step.icon} 
							class="text-foreground" 
							size={index === currentStep ? 22 : 20}
							style={index === currentStep ? 'animation: spin 2s infinite;' : ''}
						/>
					</div>
					<span class={`truncate ${
						index === currentStep ? 'text-foreground font-medium' : (index < currentStep ? 'text-foreground/70' : 'text-foreground/40')
					}`}>
						{step.text}
					</span>
						</div>
			{/each}
		</div>
		
		<!-- Progress Bar - match React styling -->
		<div class="space-y-2 mt-6 w-full">
			<div class="flex justify-between text-sm text-foreground/70 w-full">
				<span>Progress: {Math.round(progress)}%</span>
				<span>Est. time remaining: {formatTime(timeRemaining)}</span>
			</div>
			<div class="w-full h-3 bg-foreground/10 rounded-full overflow-hidden">
				<div 
					class="h-full bg-gradient-to-r gradient-primary rounded-full transition-all duration-300 relative"
					style="width: {Math.min(progress, 100)}%; box-shadow: 0 0 10px hsl(var(--ring)/50%);"
				>
					<!-- Animated pulse effect to show activity -->
					<div class="absolute inset-0 bg-foreground/20 animate-pulse-subtle"></div>
				</div>
			</div>
		</div>
	</div>
	</div>

<style>
	@keyframes spin {
		0% { transform: scale(1) rotate(0deg); }
		50% { transform: scale(1.2) rotate(180deg); }
		100% { transform: scale(1) rotate(360deg); }
	}
	
	@keyframes pulse-subtle {
		0% { opacity: 0; }
		50% { opacity: 0.3; }
		100% { opacity: 0; }
	}
	
	.animate-pulse-subtle {
		animation: pulse-subtle 1.5s ease-in-out infinite;
	}
</style> 