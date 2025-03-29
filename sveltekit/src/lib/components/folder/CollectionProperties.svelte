<script lang="ts">
	import { page } from '$app/stores';
	import { collectionState } from '$lib/stores/collections.svelte';
	import { CollectionService } from '$lib/services/collection.service';
	import { Package, Folder, Trash2, ArrowLeft } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import type { UnifiedProperty } from '$lib/types/unified-property';
	import { PropertyCard, PropertyGallery } from '$lib/components/property';
	
	// Props
	let { classname = '' } = $props<{
		classname?: string; 
	}>();
	
	// Local state
	let properties: UnifiedProperty[] = $state([]);
	let isLoading = $state(false);
	let selectedProperty: UnifiedProperty | null = $state(null);
	let showGallery = $state(false);
	
	// Load properties when the current collection changes
	$effect(() => {
		if (collectionState.currentCollection) {
			loadProperties();
		} else {
			properties = [];
		}
	});
	
	// Load properties for the current collection
	async function loadProperties() {
		if (!collectionState.currentCollection) return;
		
		try {
			isLoading = true;
			const propertyIds = await CollectionService.getCollectionProperties(collectionState.currentCollection.id);
			
			// propertyIds is now actually UnifiedProperty[] from CollectionService
			properties = propertyIds;
		} catch (error) {
			console.error('Failed to load collection properties:', error);
			properties = [];
		} finally {
			isLoading = false;
		}
	}
	
	// Remove a property from the collection
	async function removeProperty(propertyId: string) {
		if (!collectionState.currentCollection) return;
		
		try {
			properties = properties.filter(p => p.id !== propertyId);
			
			await CollectionService.removePropertyFromCollection(collectionState.currentCollection.id, propertyId);
			// Update the properties list
		} catch (error) {
			console.error('Failed to remove property from collection:', error);
		}
	}
	
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
	function handlePropertySelect(property: UnifiedProperty) {
		openGallery(property);
	}
	
	// Close gallery
	function closeGallery() {
		showGallery = false;
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

<div class={`py-2 ${classname}`}>
	{#if collectionState.currentCollection}
		<div class="mb-4">
			<h2 class="text-xl font-semibold">{collectionState.currentCollection.name}</h2>
			{#if collectionState.currentCollection.description}
				<p class="text-sm text-muted-foreground">{collectionState.currentCollection.description}</p>
			{/if}
		</div>
		
		{#if isLoading}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				{#each Array(4) as _}
					<div class="animate-pulse">
						<div class="h-[450px] bg-muted/50 rounded-lg"></div>
					</div>
				{/each}
			</div>
		{:else if properties.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				{#each properties as property}
					<div class="relative">
						<button 
							type="button"
							class="relative block w-full h-full cursor-pointer text-left" 
							onclick={() => handlePropertySelect(property)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									handlePropertySelect(property);
								}
							}}
							aria-label={`View details for ${property.name}`}
						>
							<PropertyCard 
								{property} 
								showCollectionButton={false}
							/>
						</button>
						
						<!-- Remove button overlay -->
						<div class="absolute top-3 left-3 z-20">
							<Button 
								variant="destructive" 
								size="icon" 
								class="h-8 w-8 opacity-80" 
								onclick={() => removeProperty(property.id)}
								aria-label={`Remove ${property.name} from collection`}
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-center p-6 border rounded-lg border-dashed">
				<Package class="h-12 w-12 mx-auto text-muted-foreground mb-3" />
				<h3 class="font-medium mb-1">No Properties Yet</h3>
				<p class="text-sm text-muted-foreground mb-4">
					This collection doesn't have any saved properties yet.
				</p>
				<Button variant="outline" onclick={() => {
					// Navigate to search page
					window.location.href = '/search';
				}}>
					Browse Properties
				</Button>
			</div>
		{/if}
	{:else}
		<div class="text-center p-6 border rounded-lg border-dashed">
			<Folder class="h-12 w-12 mx-auto text-muted-foreground mb-3" />
			<h3 class="font-medium mb-1">No Collection Selected</h3>
			<p class="text-sm text-muted-foreground">
				Select a collection from the sidebar to view its properties.
			</p>
		</div>
	{/if}
</div>

<!-- Property Gallery Component -->
<PropertyGallery
	property={selectedProperty}
	showGallery={showGallery}
	on:close={closeGallery}
	on:book={() => selectedProperty && selectPropertyForBooking(selectedProperty)}
	on:save={() => selectedProperty && saveProperty(selectedProperty)}
/> 