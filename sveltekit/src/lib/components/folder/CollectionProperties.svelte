<script lang="ts">
	import { page } from '$app/stores';
	import { currentCollection } from '$lib/stores/collections';
	import { CollectionService } from '$lib/services/collection.service';
	import { MapPin, Star, DollarSign, Home, Package, Folder } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';
	import type { Property } from '$lib/stores/collections';
	
	// Props
	let { classname = '' } = $props<{
		classname?: string; 
	}>();
	
	// Local state
	let properties: Property[] = $state([]);
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
			const collectionProperties = await CollectionService.getCollectionProperties($currentCollection.id);
			properties = collectionProperties as Property[];
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
			await CollectionService.removePropertyFromCollection(propertyId, $currentCollection.id);
			
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
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each Array(4) as _}
					<div class="animate-pulse">
						<div class="h-40 bg-muted/50 rounded-lg"></div>
						<div class="h-6 bg-muted/50 rounded mt-2"></div>
						<div class="h-4 bg-muted/50 rounded mt-2 w-2/3"></div>
					</div>
				{/each}
			</div>
		{:else if properties.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each properties as property}
					<Card>
						<CardHeader class="relative p-0 h-48 overflow-hidden rounded-t-lg">
							{#if property.image_url}
								<img 
									src={property.image_url} 
									alt={property.title} 
									class="w-full h-full object-cover"
								/>
							{:else}
								<div class="w-full h-full bg-muted flex items-center justify-center">
									<Home class="h-12 w-12 text-muted-foreground" />
								</div>
							{/if}
							<div class="absolute top-2 right-2">
								<Button 
									variant="destructive" 
									size="icon" 
									class="h-8 w-8 opacity-80" 
									onclick={() => removeProperty(property.id)}
								>
									×
								</Button>
							</div>
						</CardHeader>
						<CardContent class="p-4">
							<CardTitle class="text-lg mb-1">{property.title}</CardTitle>
							<div class="flex items-center text-sm text-muted-foreground mb-2">
								<MapPin class="h-3.5 w-3.5 mr-1" />
								<span>{property.location || 'Location not specified'}</span>
							</div>
							<div class="flex flex-wrap gap-2 text-xs">
								{#if property.price}
									<div class="flex items-center rounded-full bg-primary/10 px-2 py-1">
										<DollarSign class="h-3 w-3 mr-1" />
										<span>{property.price}</span>
									</div>
								{/if}
								{#if property.type}
									<div class="flex items-center rounded-full bg-secondary/10 px-2 py-1">
										<Home class="h-3 w-3 mr-1" />
										<span>{property.type}</span>
									</div>
								{/if}
								{#if property.rating}
									<div class="flex items-center rounded-full bg-warning/10 px-2 py-1">
										<Star class="h-3 w-3 mr-1" />
										<span>{property.rating}</span>
									</div>
								{/if}
							</div>
						</CardContent>
						<CardFooter class="p-4 pt-0 flex justify-between">
							<Button variant="link" class="px-0 h-8" onclick={() => {
								// Navigate to property detail
								window.location.href = `/property/${property.id}`;
							}}>
								View Details
							</Button>
						</CardFooter>
					</Card>
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