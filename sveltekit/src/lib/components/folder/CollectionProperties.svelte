<script lang="ts">
	import { page } from '$app/stores';
	import { currentCollection } from '$lib/stores/collections';
	import { CollectionService } from '$lib/services/collection.service';
	import { Package, Folder, Trash2 } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import type { UnifiedProperty } from '$lib/types/unified-property';
	import { PropertyCard } from '$lib/components/property';
	
	// Props
	let { classname = '' } = $props<{
		classname?: string; 
	}>();
	
	// Local state
	let properties: UnifiedProperty[] = $state([]);
	let isLoading = $state(false);
	
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
</script>

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
						<PropertyCard 
							{property} 
							showCollectionButton={false}
						/>
						<!-- Remove button overlay -->
						<div class="absolute top-3 left-3 z-20">
							<Button 
								variant="destructive" 
								size="icon" 
								class="h-8 w-8 opacity-80" 
								onclick={(event: MouseEvent) => {
									event.stopPropagation();
									removeProperty(property.id);
								}}
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