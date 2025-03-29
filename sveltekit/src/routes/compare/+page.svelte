<script lang="ts">
	import { goto } from '$app/navigation';
	import { getProperties, setSelectedProperty } from '$lib/stores/properties.svelte';
	import type { UnifiedProperty } from '$lib/types/unified-property';
	import { ArrowLeft, Crown } from 'lucide-svelte';
	import { page } from '$app/stores';
	import { PropertyCard, PropertyGallery } from '$lib/components/property';
	import { CollectionService } from '$lib/services/collection.service';

	// Get data passed from the server
	let { data } = $props();
	let searchId = $derived(data.searchId);
	
	// Create a derived property from the store properties
	let properties = $derived(getProperties());
	let selectedProperty: UnifiedProperty | null = $state(null);
	let showGallery = $state(false);
	
	// Check if we have properties on mount and redirect if not
	// This ensures we always have properties to display
	$effect(() => {
		if (properties.length === 0) {
			// If no properties, redirect to search
			goto('/search');
		}
	});
	
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
	
	// Select property and open booking link
	function selectProperty(property: UnifiedProperty) {
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
				on:click={() => goto('/search')}
				class="flex items-center gap-2 text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft size={20} />
				<span>Back</span>
			</button>
			<h1 class="text-xl md:text-3xl font-serif italic text-foreground">Your Perfect Matches</h1>
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
					<div class="text-2xl font-bold mb-2">Loading properties...</div>
					<div class="text-muted-foreground">Please wait while we find your perfect match</div>
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
	on:book={() => selectedProperty && selectProperty(selectedProperty)}
	on:save={() => selectedProperty && saveProperty(selectedProperty)}
/> 