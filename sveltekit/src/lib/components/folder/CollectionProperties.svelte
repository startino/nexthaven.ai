<script lang="ts">
	import { page } from '$app/stores';
	import { currentCollection } from '$lib/stores/collections';
	import { CollectionService } from '$lib/services/collection.service';
	import { Package, Folder, Trash2, Crown, ArrowLeft } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import type { UnifiedProperty } from '$lib/types/unified-property';
	import { PropertyCard, PropertyGallery } from '$lib/components/property';
	import { BookingComponent } from '$lib/components/booking';
	import { setSelectedProperty } from '$lib/stores/properties.svelte';
	
	// Props
	let { classname = '' } = $props<{
		classname?: string; 
	}>();
	
	// Local state
	let properties: UnifiedProperty[] = $state([]);
	let isLoading = $state(false);
	let selectedProperty: UnifiedProperty | null = $state(null);
	let showGallery = $state(false);
	let view = $state<'list' | 'booking'>('list');
	
	// Load properties when the current collection changes
	$effect(() => {
		if ($currentCollection) {
			loadProperties();
		} else {
			properties = [];
		}
	});
	
	// Load properties for the current collection
	async function loadProperties() {
		if (!$currentCollection) return;
		
		try {
			isLoading = true;
			const propertyIds = await CollectionService.getCollectionProperties($currentCollection.id);
			
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
		if (!$currentCollection) return;
		
		try {
			await CollectionService.removePropertyFromCollection($currentCollection.id, propertyId);
			
			// Update the properties list
			properties = properties.filter(p => p.id !== propertyId);
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
</script>

{#if view === 'list'}
<div class={`py-2 ${classname}`}>
	{#if $currentCollection}
		<div class="mb-4">
			<h2 class="text-xl font-semibold">{$currentCollection.name}</h2>
			{#if $currentCollection.description}
				<p class="text-sm text-muted-foreground">{$currentCollection.description}</p>
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
	primaryActionText="View Booking Details"
	primaryActionIcon={Crown}
	on:close={closeGallery}
	on:primaryAction={() => selectedProperty && selectPropertyForBooking(selectedProperty)}
/>
{:else}
	{#if selectedProperty}
		<BookingComponent 
			property={selectedProperty}
			backText="Back to collection"
			onback={backToList}
		/>
	{/if}
{/if} 