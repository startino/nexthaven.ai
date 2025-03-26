<script lang="ts">
	import { goto } from '$app/navigation';
	import { formatCurrency } from '$lib/utils';
	import type { UnifiedProperty } from '$lib/types/unified-property';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, Crown } from 'lucide-svelte';
	import { PropertyCard, PropertyGallery } from '$lib/components/property';
	import { BookingComponent } from '$lib/components/booking';
	import { setSelectedProperty } from '$lib/stores/properties.svelte';

	// Get data from server
	let { data } = $props();
	let searchHistory = $derived(data.searchHistory);
	
	// We need to handle type compatibility issues for property data
	// The current properties from API have original field instead of reasoning
	// which is required by UnifiedProperty
	let properties = $derived<any[]>(data.properties || []);
	
	// Local state for viewing
	let selectedProperty: UnifiedProperty | null = $state(null);
	let showGallery = $state(false);
	let view = $state<'list' | 'booking'>('list');
	
	// Open gallery for a property
	function openGallery(property: UnifiedProperty) {
		try {
			console.log("Opening gallery for property:", property.id);
			selectedProperty = property;
			showGallery = true;
		} catch (error) {
			console.error("Error opening gallery:", error);
		}
	}
	
	// Event handler for property card selection
	function handlePropertySelect(event: CustomEvent<UnifiedProperty>) {
		openGallery(event.detail);
	}
	
	// Close gallery
	function closeGallery() {
		showGallery = false;
		selectedProperty = null;
	}
	
	// Select property for booking and show booking view
	function selectPropertyForBooking(property: UnifiedProperty) {
		try {
			console.log("Selecting property for booking:", property.id);
			setSelectedProperty(property);
			selectedProperty = property;
			view = 'booking';
		} catch (error) {
			console.error("Error selecting property for booking:", error);
		}
	}
	
	// Return back to list view
	function backToList() {
		view = 'list';
	}
	
	// Format search date
	function formatDate(dateString: string): string {
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch (e) {
			return dateString || 'Unknown date';
		}
	}
</script>

{#if view === 'list'}
<div class="min-h-screen bg-background text-foreground">
	<div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
		<div class="flex justify-between items-center">
			<button 
				on:click={() => goto('/history')}
				class="flex items-center gap-2 text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft size={20} />
				<span>Back to History</span>
			</button>
			<div class="text-right">
				<h1 class="text-xl md:text-3xl font-serif italic text-foreground">Saved Search Results</h1>
				{#if searchHistory}
					<p class="text-sm text-muted-foreground mt-1">
						{searchHistory.destination} • {searchHistory.date_range} • 
						Searched on {formatDate(searchHistory.created_at || '')}
					</p>
				{/if}
			</div>
		</div>
		
		{#if properties.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				{#each properties as property}
					<PropertyCard 
						property={property}
						on:select={handlePropertySelect}
					/>
				{/each}
			</div>
		{:else}
			<div class="flex justify-center items-center h-[60vh]">
				<div class="text-center">
					<div class="text-2xl font-bold mb-2">No properties found</div>
					<div class="text-muted-foreground">This search doesn't have any saved property data.</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Property Gallery Component -->
<PropertyGallery
	property={selectedProperty}
	showGallery={showGallery}
	primaryActionText="View Booking Details"
	primaryActionIcon={Crown}
	on:close={closeGallery}
	on:primaryAction={() => selectedProperty && selectPropertyForBooking(selectedProperty)}
/>
{:else if view === 'booking' && selectedProperty}
	<BookingComponent 
		property={selectedProperty}
		backText="Back to search results"
		on:back={backToList}
	/>
{/if} 