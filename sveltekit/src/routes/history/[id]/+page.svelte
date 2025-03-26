<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { ArrowLeft, Calendar, DollarSign, Map, MapPin, Bed, Bath, Star, ExternalLink } from 'lucide-svelte';
	import type { Json } from '$lib/types/database.types';
	
	// Get data from the server
	let { data } = $props();
	let searchHistory = $derived(data.searchHistory || {});
	let searchResults = $derived(data.searchResults || []);
	
	// Helper function to check if budget has min and max properties
	function isBudgetObject(budget: Json | null): budget is { min: number; max: number } {
		return (
			typeof budget === 'object' && 
			budget !== null && 
			'min' in budget && 
			'max' in budget &&
			typeof budget.min === 'number' &&
			typeof budget.max === 'number'
		);
	}
	
	function formatPrice(price: number | null): string {
		if (price === null) return 'Price not available';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			maximumFractionDigits: 0
		}).format(price);
	}
	
	function formatScore(score: number | null): string {
		if (score === null) return 'N/A';
		return (score * 100).toFixed(0) + '%';
	}
</script>

<div class="space-y-6 container mx-auto py-8 px-4">
	<div class="flex justify-between items-center">
		<h1 class="text-3xl font-bold">Search Results</h1>
		<Button 
			variant="outline" 
			class="flex items-center gap-2"
			on:click={() => goto('/history')}>
			<ArrowLeft class="h-4 w-4" />
			<span>Back to History</span>
		</Button>
	</div>
	
	<!-- Search details -->
	<Card>
		<CardHeader>
			<CardTitle>Search Details</CardTitle>
			<CardDescription>
				Details of your search criteria
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<h3 class="text-lg font-medium">{searchHistory.destination || 'Unnamed Search'}</h3>
					<div class="flex items-center gap-1 mt-2 text-muted-foreground">
						<Calendar class="h-4 w-4" />
						<span>{searchHistory.date_range || 'No dates specified'}</span>
					</div>
					
					<div class="flex items-center gap-1 mt-2 text-muted-foreground">
						<DollarSign class="h-4 w-4" />
						<span>
							{#if isBudgetObject(searchHistory.budget)}
								Budget: ${searchHistory.budget.min} - ${searchHistory.budget.max}
							{:else}
								Budget: Not specified
							{/if}
						</span>
					</div>
					
					<div class="flex items-center gap-1 mt-2 text-muted-foreground">
						<Bed class="h-4 w-4" />
						<span>Rooms: {searchHistory.rooms || 'Not specified'}</span>
					</div>
				</div>
				
				<div>
					{#if searchHistory.preferences}
						<div class="mt-2">
							<h4 class="font-medium mb-1">Preferences</h4>
							<p class="text-sm text-muted-foreground whitespace-pre-line">{searchHistory.preferences}</p>
						</div>
					{/if}
				</div>
			</div>
			
			<div class="mt-4">
				<Badge variant="outline">
					{searchHistory.results_count || 0} properties found
				</Badge>
				<Badge variant="outline" class="ml-2">
					{searchHistory.created_at ? new Date(searchHistory.created_at).toLocaleString() : ''}
				</Badge>
			</div>
		</CardContent>
	</Card>
	
	<!-- Property results -->
	<h2 class="text-2xl font-bold mt-8">Property Listings</h2>
	
	{#if searchResults.length === 0}
		<Card>
			<CardContent class="p-8 text-center">
				<p class="text-muted-foreground">No property listings available for this search.</p>
			</CardContent>
		</Card>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each searchResults as property}
				<Card class="overflow-hidden flex flex-col h-full">
					{#if property.image_url}
						<div class="relative aspect-video overflow-hidden">
							<img 
								src={property.image_url} 
								alt={property.property_name} 
								class="w-full h-full object-cover transition-transform hover:scale-105"
							/>
							<div class="absolute top-2 right-2">
								<Badge class="bg-primary text-primary-foreground">
									<Star class="h-3 w-3 mr-1" />
									{formatScore(property.score)}
								</Badge>
							</div>
						</div>
					{/if}
					
					<CardContent class="flex-grow p-4">
						<div class="flex justify-between items-start">
							<h3 class="text-lg font-medium truncate">{property.property_name}</h3>
							<span class="text-lg font-semibold">{formatPrice(property.price)}</span>
						</div>
						
						{#if property.location}
							<div class="flex items-center gap-1 mt-2 text-muted-foreground text-sm">
								<MapPin class="h-3.5 w-3.5 flex-shrink-0" />
								<span class="truncate">{property.location}</span>
							</div>
						{/if}
						
						<div class="flex items-center gap-4 mt-3">
							{#if property.rooms !== null}
								<div class="flex items-center gap-1 text-sm">
									<Bed class="h-3.5 w-3.5" />
									<span>{property.rooms} {property.rooms === 1 ? 'room' : 'rooms'}</span>
								</div>
							{/if}
							
							{#if property.baths !== null}
								<div class="flex items-center gap-1 text-sm">
									<Bath class="h-3.5 w-3.5" />
									<span>{property.baths} {property.baths === 1 ? 'bath' : 'baths'}</span>
								</div>
							{/if}
						</div>
						
						{#if property.amenities && Array.isArray(property.amenities) && property.amenities.length > 0}
							<div class="mt-3">
								<p class="text-xs text-muted-foreground mb-1">Amenities:</p>
								<div class="flex flex-wrap gap-1">
									{#each property.amenities.slice(0, 3) as amenity}
										<Badge variant="outline" class="text-xs">{amenity}</Badge>
									{/each}
									{#if property.amenities.length > 3}
										<Badge variant="outline" class="text-xs">+{property.amenities.length - 3} more</Badge>
									{/if}
								</div>
							</div>
						{/if}
					</CardContent>
					
					{#if property.property_url}
						<CardFooter class="p-4 pt-0">
							<Button variant="outline" class="w-full" href={property.property_url} target="_blank">
								<ExternalLink class="h-3.5 w-3.5 mr-1" />
								View Property
							</Button>
						</CardFooter>
					{/if}
				</Card>
			{/each}
		</div>
	{/if}
</div> 