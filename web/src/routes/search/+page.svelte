<script lang="ts">
	import { setSearchQuery, clearStore, setError, getErrorMessage } from '$lib/stores/properties.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { MapPin, Calendar, DollarSign, Layers, Sparkles, ArrowLeft, ArrowRight, Search, Clock } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import { fade } from 'svelte/transition';
	
	// Define interface for saved preferences
	interface SavedPreference {
		id: number;
		date: string;
		preferences: string;
	}
	
	// Get data from loader
	let { data } = $props();
	
	// Create a constant for the template text that can be reused
	const TEMPLATE_TEXT = `Type of property: [apartment / hostel / co-living / etc.]

Ambience: [modern / rustic / cozy / minimalist / traditional / bohemian / elegant]

Amenities: [pool / gym / parking / etc.]

Location: [15min walk to the beach / 10min drive to the city center / etc.]

Literally any other preferences:
[Any other specific requirements or preferences you have]`;
	
	// Local state
	let searchStep = $state(0);
	let destination = $state('');
	let dateRange = $state('');
	let startDate = $state('');
	let selectedTimeFrame = $state('');
	let duration = $state('');
	let budget = $state('600');
	let selectedRooms = $state(1);
	let preferences = $state(TEMPLATE_TEXT);
	let error = $derived(getErrorMessage());
	let previousPreferences = $state<SavedPreference[]>([]);
	let showPreviousPreferences = $state(false);
	
	// Create an effect to clear the error after a timeout
	$effect(() => {
		if (error) {
			const timeout = setTimeout(() => {
				setError(null);
			}, 5000);
			
			return () => clearTimeout(timeout);
		}
	});
	
	// Presets
	const popularDestinations = data?.popularDestinations?.map(d => d.name) || 
		['Kuala Lumpur', 'Bali', 'Da Nang'];
	const timeFrames = ['Next Week', 'Two Weeks', 'Next Month'];
	const durations = ['1 Week', '1 Month', '3 Months'];
	const roomOptions = [1, 2, 3, 4];
	
	// Get previously saved preferences on mount
	onMount(() => {
		loadPreviousPreferences();
	});
	
	// Function to load previous preferences from localStorage
	function loadPreviousPreferences() {
		try {
			const storedPreferences = localStorage.getItem('previousPreferences');
			if (storedPreferences) {
				previousPreferences = JSON.parse(storedPreferences);
			} else {
				// Default preferences if none found
				previousPreferences = [
					{
						id: 1,
						date: '2025-03-15',
						preferences: 'Modern apartment with a home office setup, high-speed internet, and a quiet neighborhood. Must have in-unit laundry and a balcony.'
					}
				];
			}
		} catch (error) {
			console.error('Error retrieving preferences from localStorage:', error);
		}
	}
	
	// Function to select a previous preference
	function selectPreviousPreference(preferenceText: string) {
		preferences = preferenceText;
		showPreviousPreferences = false;
	}
	
	// Clear the store on mount
	clearStore();
	
	function handleSearch() {
		console.log("Discover Properties button clicked");
		
		// Save current preference
		savePreference();
		
		console.log("Search data:", {
			query: destination,
			date: dateRange,
			budget: {
				min: parseInt(budget) || 200,
				max: parseInt(budget) * 1.5 || 600
			},
			adults: 2,
			children: 0,
			number_of_rooms: selectedRooms,
			preferences: preferences
		});
		
		// Build search query object
		const searchQueryJson = JSON.stringify({
			query: destination,
			date: dateRange,
			budget: {
				min: parseInt(budget) || 200,
				max: parseInt(budget) * 1.5 || 600
			},
			adults: 2,
			children: 0,
			number_of_rooms: selectedRooms,
			preferences: preferences
		});
		
		try {
			console.log("Storing search query and navigating to loading page");
			
			// Store the search query using the new reactive store
			setSearchQuery(searchQueryJson);
			
			// Navigate to loading page using direct window location
			console.log("Navigating to /loading");
			window.location.href = '/loading';
		} catch (error) {
			console.error('Error starting search:', error);
		}
	}
	
	// Save the current preference to localStorage
	function savePreference() {
		try {
			const newPreference = {
				id: Date.now(),
				date: new Date().toISOString().split('T')[0],
				preferences: preferences
			};
			
			// Prepend new preference and keep only the 6 most recent
			const updatedPreferences = [newPreference, ...previousPreferences.slice(0, 5)];
			localStorage.setItem('previousPreferences', JSON.stringify(updatedPreferences));
		} catch (error) {
			console.error('Error saving preferences to localStorage:', error);
		}
	}
	
	function selectDestination(dest: string) {
		destination = dest;
	}
	
	function selectTimeFrame(time: string) {
		selectedTimeFrame = time;
		let now = new Date();
		
		if (time === 'Next Week') {
			const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
			startDate = nextWeek.toISOString().split('T')[0];
		} else if (time === 'Two Weeks') {
			const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
			startDate = twoWeeks.toISOString().split('T')[0];
		} else if (time === 'Next Month') {
			const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
			startDate = nextMonth.toISOString().split('T')[0];
		}
		
		updateDateRange();
	}
	
	function selectDuration(time: string) {
		duration = time;
		updateDateRange();
	}
	
	function updateDateRange() {
		if (!selectedTimeFrame && !duration) return;
		
		if (selectedTimeFrame && duration) {
			dateRange = `${selectedTimeFrame} for ${duration}`;
		} else if (selectedTimeFrame) {
			dateRange = selectedTimeFrame;
		} else if (duration) {
			dateRange = `for ${duration}`;
		}
	}
	
	// Parse manually entered dateRange and update buttons
	function parseDateRange() {
		if (!dateRange) return;
		
		// Full format: "Next Week for 1 Month"
		const fullMatch = dateRange.match(/^(Next Week|Two Weeks|Next Month)\s+for\s+(1 Week|1 Month|3 Months)$/i);
		
		if (fullMatch) {
			// Update the timeframe and duration from input
			const timeframe = fullMatch[1];
			const period = fullMatch[2];
			
			// Only update if valid options
			if (timeFrames.includes(timeframe) && durations.includes(period)) {
				selectedTimeFrame = timeframe;
				duration = period;
			}
			return;
		}
		
		// Only timeframe: "Next Week"
		const timeframeMatch = dateRange.match(/^(Next Week|Two Weeks|Next Month)$/i);
		if (timeframeMatch) {
			const timeframe = timeframeMatch[1];
			if (timeFrames.includes(timeframe)) {
				selectedTimeFrame = timeframe;
			}
			return;
		}
		
		// Only duration: "for 1 Month"
		const durationMatch = dateRange.match(/^for\s+(1 Week|1 Month|3 Months)$/i);
		if (durationMatch) {
			const period = durationMatch[1];
			if (durations.includes(period)) {
				duration = period;
			}
		}
	}
	
	function formatDate(date: Date): string {
		const month = date.toLocaleString('default', { month: 'short' });
		return `${month} ${date.getDate()}`;
	}
	
	function nextStep() {
		searchStep++;
	}
	
	function prevStep() {
		searchStep--;
	}
</script>

<div class="max-w-4xl mx-auto py-8 px-4">
	<div class="flex justify-between items-center mb-8">
		<h1 class="text-3xl font-serif font-bold">Find your perfect stay</h1>
		<Button variant="outline" onclick={() => window.location.href = '/'}>
			Back to Home
		</Button>
	</div>
	
	<!-- Error message box -->
	{#if error}
		<div 
			class="w-full max-w-lg mx-auto mb-6 p-4 bg-destructive/20 text-destructive rounded-lg border border-destructive/30"
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
	
	{#if searchStep === 0}
		<!-- Destination Step -->
		<div class="w-full max-w-lg bg-card p-6 rounded-lg border border-border mx-auto">
			<div class="text-left mb-8">
				<h2 class="text-3xl font-bold">Find your perfect stay</h2>
				<p class="text-muted-foreground mt-1">Tell us what you're looking for</p>
			</div>
			
			<div class="mb-8">
				<div class="flex items-center gap-2 mb-3">
					<MapPin class="h-5 w-5" />
					<label class="text-lg font-medium">Where would you like to stay?</label>
				</div>
				
				<Input 
					type="text" 
					placeholder="e.g. Chiang Mai, Thailand"
					value={destination}
					oninput={(e: Event) => destination = (e.target as HTMLInputElement).value}
					class="h-12 bg-black/40 border-border"
				/>
				
				<div class="mt-4">
					<p class="text-sm text-muted-foreground mb-2">Popular destinations:</p>
					<div class="flex flex-wrap gap-2">
						{#each popularDestinations as dest}
							<Badge 
								variant={destination === dest ? 'default' : 'secondary'}
								class={`cursor-pointer ${destination === dest ? 'bg-primary text-primary-foreground' : 'bg-black/40'}`}
								onclick={() => selectDestination(dest)}
							>
								{dest}
							</Badge>
						{/each}
					</div>
				</div>
			</div>
			
			<div class="mb-8">
				<div class="flex items-center gap-2 mb-3">
					<Calendar class="h-5 w-5" />
					<label class="text-lg font-medium">When?</label>
				</div>
				
				<p class="text-sm text-muted-foreground mb-3">Use the buttons or type your own dates in the field below.</p>
				
				<div class="mb-4">
					<p class="text-sm mb-2">When:</p>
					<div class="flex flex-wrap gap-2">
						{#each timeFrames as time}
							<Badge 
								variant={selectedTimeFrame === time ? 'default' : 'secondary'}
								class={`cursor-pointer ${selectedTimeFrame === time ? 'bg-primary text-primary-foreground' : 'bg-black/40'}`}
								onclick={() => selectTimeFrame(time)}
							>
								{time}
							</Badge>
						{/each}
					</div>
				</div>
				
				<div class="mb-4">
					<p class="text-sm mb-2">Period:</p>
					<div class="flex flex-wrap gap-2">
						{#each durations as period}
							<Badge 
								variant={duration === period ? 'default' : 'secondary'}
								class={`cursor-pointer ${duration === period ? 'bg-primary text-primary-foreground' : 'bg-black/40'}`}
								onclick={() => selectDuration(period)}
							>
								{period}
							</Badge>
						{/each}
					</div>
				</div>
				
				<Input 
					type="text" 
					placeholder="e.g. Next Week for 1 Month"
					value={dateRange}
					oninput={(e: Event) => dateRange = (e.target as HTMLInputElement).value}
					onblur={parseDateRange}
					class="h-12 bg-black/40 border-border"
				/>
			</div>
			
			<Button 
				variant="default" 
				class="w-full h-12 button-gradient text-lg flex items-center justify-center"
				onclick={() => nextStep()}
				disabled={!destination || !dateRange}
			>
				Continue to Details
				<ArrowRight class="h-5 w-5 ml-2" />
			</Button>
		</div>
	{:else if searchStep === 1}
		<!-- Budget Step -->
		<div class="w-full max-w-lg bg-card p-6 rounded-lg border border-border mx-auto">
			<div class="text-left mb-8">
				<h2 class="text-3xl font-bold">Find your perfect stay</h2>
				<p class="text-muted-foreground mt-1">Tell us what you're looking for</p>
			</div>
			
			<div class="mb-8">
				<div class="flex items-center gap-2 mb-3">
					<DollarSign class="h-5 w-5" />
					<label class="text-lg font-medium">Total Budget for Stay</label>
				</div>
				
				<div class="flex items-center">
					<Input 
						type="number" 
						value={budget}
						oninput={(e: Event) => budget = (e.target as HTMLInputElement).value}
						class="h-12 bg-black/40 border-border"
					/>
				</div>
			</div>
			
			<div class="mb-8">
				<div class="flex items-center gap-2 mb-3">
					<Layers class="h-5 w-5" />
					<label class="text-lg font-medium">Number of Rooms</label>
				</div>
				
				<div class="grid grid-cols-4 gap-3">
					{#each roomOptions as rooms}
						<Button 
							variant={selectedRooms === rooms ? 'default' : 'secondary'}
							class={`h-14 ${selectedRooms === rooms ? 'bg-primary text-primary-foreground' : 'bg-black/40'}`}
							onclick={() => selectedRooms = rooms}
						>
							{rooms} {rooms === 1 ? 'Room' : 'Rooms'}
						</Button>
					{/each}
				</div>
			</div>
			
			<div class="flex gap-3">
				<Button 
					variant="outline" 
					class="flex-1 h-12"
					onclick={() => prevStep()}
				>
					<ArrowLeft class="h-5 w-5 mr-1" />
					Back
				</Button>
				
				<Button 
					variant="default" 
					class="flex-1 h-12 button-gradient"
					onclick={() => nextStep()}
					disabled={!budget}
				>
					Continue
					<ArrowRight class="h-5 w-5 ml-1" />
				</Button>
			</div>
		</div>
	{:else if searchStep === 2}
		<!-- Preferences Step -->
		<div class="w-full max-w-lg bg-card p-6 rounded-lg border border-border mx-auto">
			<div class="text-left mb-6">
				<h2 class="text-3xl font-bold">Find your perfect stay</h2>
				<p class="text-muted-foreground mt-1">Tell us what you're looking for</p>
			</div>
			
			<div class="mb-6">
				<div class="flex items-center gap-2 mb-3">
					<Sparkles class="h-5 w-5" />
					<label class="text-lg font-medium">Your Preferences</label>
				</div>
				
				<div class="mb-4 flex items-center justify-between">
					<p class="text-sm text-muted-foreground">Fill out the template or write your own description.</p>
					{#if previousPreferences.length > 0}
						<Button 
							variant="outline"
							size="sm"
							onclick={() => showPreviousPreferences = !showPreviousPreferences}
						>
							<Clock class="h-5 w-5 mr-1" /> 
							Previous Preferences
							<svg 
								xmlns="http://www.w3.org/2000/svg" 
								width="24" 
								height="24" 
								viewBox="0 0 24 24" 
								fill="none" 
								stroke="currentColor" 
								stroke-width="2" 
								stroke-linecap="round" 
								stroke-linejoin="round" 
								class={`w-4 h-4 ml-1 transition-transform ${showPreviousPreferences ? 'rotate-180' : ''}`}
							>
								<polyline points="6 9 12 15 18 9"></polyline>
							</svg>
						</Button>
					{/if}
				</div>
				
				{#if showPreviousPreferences}
					<div 
						class="mb-4 p-3 border border-border rounded-lg bg-black/20 overflow-hidden transition-all duration-300 ease-in-out" 
						transition:slide={{ duration: 300, easing: cubicOut }}
					>
						<p class="text-sm font-medium mb-2">Select a previous preference:</p>
						<div class="space-y-2">
							{#each previousPreferences as pref}
								<div 
									class="p-2 border border-border rounded cursor-pointer hover:bg-black/40 transition-colors"
									onclick={() => selectPreviousPreference(pref.preferences)}
								>
									<p class="text-xs text-muted-foreground">{pref.date}</p>
									<p class="text-sm line-clamp-2">{pref.preferences}</p>
								</div>
							{/each}
						</div>
					</div>
				{/if}
				
				<textarea 
					value={preferences}
					oninput={(e: Event) => preferences = (e.target as HTMLTextAreaElement).value}
					class="w-full h-[300px] bg-black/40 border-border rounded-lg p-4 focus:border-primary focus:ring-primary"
				></textarea>
				
				<p class="text-xs text-muted-foreground mt-2">Your preferences help us find the perfect property for you.</p>
				
				<Button 
					variant="outline"
					size="sm"
					class="mt-2 text-xs"
					onclick={() => preferences = TEMPLATE_TEXT}
				>
					Reset to Template
				</Button>
			</div>
			
			<div class="flex gap-3">
				<Button 
					variant="outline" 
					class="flex-1 h-12"
					onclick={() => prevStep()}
				>
					<ArrowLeft class="h-5 w-5 mr-1" />
					Back
				</Button>
				
				<form 
					action="/loading" 
					method="GET" 
					class="flex-1"
					onsubmit={() => {
						console.log("Form submitting to loading page");
						// Save preference first
						savePreference();
						
						// Store search data in our reactive store
						setSearchQuery(JSON.stringify({
							query: destination,
							date: dateRange,
							budget: {
								min: parseInt(budget) || 200,
								max: parseInt(budget) * 1.5 || 600
							},
							adults: 2,
							children: 0,
							number_of_rooms: selectedRooms,
							preferences: preferences
						}));
					}}
				>
					<!-- Use hidden input fields to pass data via URL if needed -->
					<input type="hidden" name="destination" value={destination} />
					<input type="hidden" name="date" value={dateRange} />
					
					<button 
						type="submit"
						class="w-full h-12 button-gradient bg-primary text-primary-foreground rounded-md font-medium flex items-center justify-center"
					>
						<Search class="h-5 w-5 mr-1" />
						Discover Properties
					</button>
				</form>
			</div>
		</div>
	{/if}
</div> 