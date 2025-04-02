<script lang="ts">
	import { goto } from '$app/navigation';
	import { formatCurrency } from '$lib/utils';
	import type { UnifiedProperty } from '$lib/types/unified-property';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft } from 'lucide-svelte';
	import { PropertyCard, PropertyGallery } from '$lib/components/property';
	import { CollectionService } from '$lib/services/collection.service';
	import { page } from '$app/stores';

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
	
	// Select property for booking and open booking link
	function selectPropertyForBooking(property: UnifiedProperty) {
		try {
			console.log("Opening booking link for property:", property.id);
			// Open the property URL in a new tab if available
			if (property.url) {
				window.open(property.url, '_blank', 'noopener,noreferrer');
			} else {
				console.error("No booking URL available for property:", property.id);
			}
		} catch (error) {
			console.error("Error opening booking link:", error);
		}
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

	// Save property to default collection
	async function saveProperty(property: UnifiedProperty) {
		try {
			console.log("Saving property:", property.id);
			if (!$page.data.session?.user?.id) {
				console.error("You must be logged in to save properties");
				return;
			}
			
			// Ensure default collection exists
			const defaultCollection = await CollectionService.ensureDefaultCollection($page.data.session.user.id);
			
			// Add property to default collection
			await CollectionService.addPropertyToCollection(defaultCollection.id, property);
			
			console.log("Property saved successfully");
		} catch (error) {
			console.error("Error saving property:", error);
		}
	}
</script>

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
	on:close={closeGallery}
	on:book={() => selectedProperty && selectPropertyForBooking(selectedProperty)}
	on:save={() => selectedProperty && saveProperty(selectedProperty)}
/> 