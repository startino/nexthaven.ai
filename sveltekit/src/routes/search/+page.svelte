<script lang="ts">
	import { setSearchQuery, clearStore, setError, getErrorMessage } from '$lib/stores/properties.svelte';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { SubscriptionStatus } from '$lib/utils/subscription';
	
	// Import components
	import PropertyTypeSidebar from './PropertyTypeSidebar.svelte';
	import SearchForm from './SearchForm.svelte';
	import PropertyDisplays from './PropertyDisplays.svelte';
	import ErrorDisplay from './ErrorDisplay.svelte';
		
	// Import utilities
	import { TEMPLATE_TEXT, loadPreviousPreferences, SavedPreference } from './preferences';
	import { timeFrames, durations, parseDateRange, calculateStartDate, formatDateRange } from './dateHelpers';
	import { popularDestinations, roomOptions, propertyTypes, amenities } from './searchData';
	import { fade } from 'svelte/transition';
	
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
	let showPreviousPreferences = $state(false);
	let selectedPropertyType = $state<string | null>(null);
	let selectedAmenities = $state<string[]>([]);
	let activePreferenceModal = $state<string | null>(null);
	let preferenceStrength = $state<Record<string, 'weak' | 'mid' | 'strong'>>({});
	
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
	
	// Function to select a previous preference
	function selectPreviousPreference(preferenceText: string) {
		preferences = preferenceText;
		showPreviousPreferences = false;
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
</script>

<div class="flex flex-col py-6 lg:py-8">
	<div class="flex flex-1 overflow-hidden">
		<!-- Left Sidebar - Property Types and Amenities -->
		<PropertyTypeSidebar
			{selectedPropertyType}
			{activePreferenceModal}
			{preferenceStrength}
			{selectedAmenities}
		/>

		<!-- Main Content Area -->
		<div class="flex-1 h-full">
			<ScrollArea class="h-full">
				<div class="p-5">
					<!-- Error message box -->
					{#if error}
					<div 
					  class="w-full mb-6 p-4 bg-destructive/20 text-destructive rounded-lg border border-destructive/30"
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
						{selectedPropertyType}
						{selectedAmenities}
						{preferenceStrength}
						{previousPreferences}
					/>
					
					<!-- Properties Section -->
					<PropertyDisplays />
				</div>
			</ScrollArea>
		</div>
	</div>
</div>

<!-- Click outside detector to close preference modal -->
{#if activePreferenceModal}
	<div 
		class="fixed inset-0 z-0"
		onclick={closePreferenceModal}
	></div>
{/if} 