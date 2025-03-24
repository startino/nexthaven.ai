<script lang="ts">
	import { goto } from '$app/navigation';
	import { propertyStore } from '$lib/stores/properties';
	import { setSelectedProperty } from '$lib/stores/properties';
	import { formatCurrency } from '$lib/utils';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import type { UnifiedProperty } from '$lib/types/unified-property';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';

	// Local state
	let properties = $state<UnifiedProperty[]>([]);
	
	// Check if we have properties on mount
	onMount(() => {
		const storeData = get(propertyStore);
		if (storeData.properties.length === 0) {
			// If no properties, redirect to search
			goto('/search');
		} else {
			properties = storeData.properties;
		}
	});
	
	// Handle property selection
	function selectProperty(property: UnifiedProperty) {
		setSelectedProperty(property);
		goto('/booking');
	}
</script>

<div class="space-y-6">
	<div class="flex justify-between items-center">
		<h1 class="text-3xl font-bold">Compare Properties</h1>
		<Button variant="outline" onclick={() => goto('/search')}>
			Back to Search
		</Button>
	</div>
	
	{#if properties.length > 0}
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			{#each properties as property}
				<Card class="overflow-hidden transition-all hover:shadow-lg">
					<div class="h-48 overflow-hidden">
						<img 
							src={property.media.main_image || 'https://via.placeholder.com/400x200?text=No+Image'} 
							alt={property.name}
							class="w-full h-full object-cover"
						/>
					</div>
					
					<CardHeader class="space-y-1 pb-2">
						<div class="flex justify-between items-start">
							<CardTitle class="text-xl">
								{property.name}
							</CardTitle>
							<Badge>{property.score}</Badge>
						</div>
						<CardDescription>{property.location}</CardDescription>
					</CardHeader>
					
					<CardContent class="space-y-3 pb-0">
						<div class="flex items-center gap-2 text-sm text-muted-foreground">
							<span>{property.capacity.bedrooms} bedrooms</span>
							<span>•</span>
							<span>{property.capacity.beds} beds</span>
							{#if property.features.size}
								<span>•</span>
								<span>{property.features.size} m²</span>
							{/if}
						</div>
						
						<div class="flex flex-wrap gap-1">
							{#each property.features.amenities.slice(0, 3) as amenity}
								<Badge variant="outline" class="text-xs">{amenity}</Badge>
							{/each}
							{#if property.features.amenities.length > 3}
								<Badge variant="outline" class="text-xs">+{property.features.amenities.length - 3} more</Badge>
							{/if}
						</div>
						
						<Separator />
						
						<div class="flex justify-between items-center pt-2">
							<div>
								<div class="text-xl font-bold">{formatCurrency(property.pricing.total)}</div>
								<div class="text-xs text-muted-foreground">total price</div>
							</div>
							<Badge variant="secondary">{property.source}</Badge>
						</div>
					</CardContent>
					
					<CardFooter class="pt-2 pb-4">
						<Button 
							onclick={() => selectProperty(property)}
							class="w-full"
						>
							Select Property
						</Button>
					</CardFooter>
				</Card>
			{/each}
		</div>
	{:else}
		<Card>
			<CardContent class="text-center py-6">
				<p class="text-muted-foreground">Loading properties...</p>
			</CardContent>
		</Card>
	{/if}
</div> 