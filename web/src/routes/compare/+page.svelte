<script lang="ts">
	import { goto } from '$app/navigation';
	import { getProperties, setSelectedProperty } from '$lib/stores/properties.svelte';
	import { formatCurrency } from '$lib/utils';
	import { onMount } from 'svelte';
	import type { UnifiedProperty } from '$lib/types/unified-property';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { ArrowLeft, Check } from 'lucide-svelte';

	// Create a derived property from the store properties
	let properties = $derived(getProperties());
	
	// Check if we have properties on mount and redirect if not
	$effect(() => {
		if (properties.length === 0) {
			// If no properties, redirect to search
			goto('/search');
		}
	});
	
	// Handle property selection
	function selectProperty(property: UnifiedProperty) {
		try {
			console.log("Selecting property:", property.id);
			setSelectedProperty(property);
			goto('/booking');
		} catch (error) {
			console.error("Error selecting property:", error);
		}
	}
	
	// Function to get score color based on score value
	function getScoreColor(score: number): string {
		if (score >= 80) return 'from-green-500 to-green-400';
		if (score >= 70) return 'from-yellow-500 to-yellow-400';
		return 'from-orange-500 to-orange-400';
	}
	
	// Function to render price explanation
	function getPriceExplanation(property: UnifiedProperty): string {
		if (property.pricing.total <= 1000) {
			return `Price: The nightly rate of ${formatCurrency(property.pricing.total)} falls within your specified range`;
		} else if (property.pricing.total <= 3500) {
			return `Price: The property is priced at ${formatCurrency(property.pricing.total)}`;
		} else {
			return `Price (${property.score}): The total price of ~${formatCurrency(property.pricing.total)} is below the desired range of $4200–$6000`;
		}
	}
</script>

<div class="min-h-screen bg-black text-white">
	<div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
		<div class="flex justify-between items-center">
			<button 
				onclick={() => goto('/search')}
				class="flex items-center gap-2 text-white/80 hover:text-white"
			>
				<ArrowLeft size={20} />
				<span>Back</span>
			</button>
			<h1 class="text-3xl font-serif italic text-white">Your Perfect Matches</h1>
		</div>
		
		{#if properties.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				{#each properties as property}
					<div 
						class="relative cursor-pointer transform transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]"
						onclick={() => selectProperty(property)}
					>
						<Card class="overflow-hidden bg-zinc-900 border-zinc-800 text-white hover:shadow-xl hover:shadow-purple-500/20 transition-all">
							<div class="relative h-56 overflow-hidden">
								<img 
									src={property.media.main_image || 'https://via.placeholder.com/400x200?text=No+Image'} 
									alt={property.name}
									class="w-full h-full object-cover"
								/>
								<div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
								<div class="absolute bottom-4 left-4 text-white text-2xl font-bold">
									${Math.round(property.pricing.total)}
								</div>
							</div>
							
							<div class="absolute top-2 right-2 w-16 h-16">
								<div class="w-16 h-16 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-sm border-2 border-white/10 text-white font-bold text-xl relative">
									<svg viewBox="0 0 36 36" class="absolute inset-0 w-full h-full">
										<path 
											d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
											fill="none"
											stroke="#444"
											stroke-width="3"
										/>
										<path 
											d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
											fill="none"
											stroke-dasharray="100, 100"
											stroke-dashoffset={100 - property.score}
											stroke-linecap="round"
											class="stroke-[3] transition-all duration-1000 ease-out-expo bg-gradient-to-r {getScoreColor(property.score)}"
											style="stroke: url(#gradient-{property.id})"
										/>
										<defs>
											<linearGradient id="gradient-{property.id}" x1="0%" y1="0%" x2="100%" y2="100%">
												<stop offset="0%" class="{property.score >= 80 ? 'stop-color-green-500' : property.score >= 70 ? 'stop-color-yellow-500' : 'stop-color-orange-500'}" />
												<stop offset="100%" class="{property.score >= 80 ? 'stop-color-green-400' : property.score >= 70 ? 'stop-color-yellow-400' : 'stop-color-orange-400'}" />
											</linearGradient>
										</defs>
									</svg>
									<span>{property.score}</span>
								</div>
							</div>
							
							<CardContent class="p-4 space-y-3">
								<div class="space-y-1">
									<h3 class="font-bold text-lg line-clamp-1">{property.name}</h3>
									<p class="text-sm text-white/60">{property.location}</p>
								</div>
								
								<div class="text-xs text-white/70 space-y-1">
									{#if property.capacity.bedrooms || property.capacity.beds}
										<div class="flex items-center gap-2">
											{#if property.capacity.bedrooms}
												<span>{property.capacity.bedrooms} {property.capacity.bedrooms === 1 ? 'bedroom' : 'bedrooms'}</span>
											{/if}
											{#if property.capacity.bedrooms && property.capacity.beds}
												<span>•</span>
											{/if}
											{#if property.capacity.beds}
												<span>{property.capacity.beds} {property.capacity.beds === 1 ? 'bed' : 'beds'}</span>
											{/if}
										</div>
									{/if}
								</div>
								
								<div class="flex flex-wrap gap-2 my-2">
									{#each property.features.amenities.slice(0, 3) as amenity}
										<Badge variant="secondary" class="bg-zinc-800 text-white/80">{amenity}</Badge>
									{/each}
									{#if property.features.amenities.length > 3}
										<Badge variant="outline" class="text-xs">+{property.features.amenities.length - 3}</Badge>
									{/if}
								</div>
								
								<div class="out-of-100 text-xs text-white/60 text-right">
									out of 100
								</div>
								
								<div class="pt-2 text-sm text-green-400">
									<Check size={16} class="inline-block mr-1" />
									<span class="text-white/90">{getPriceExplanation(property)}</span>
								</div>
							</CardContent>
						</Card>
					</div>
				{/each}
			</div>
		{:else}
			<div class="flex justify-center items-center h-[60vh]">
				<div class="text-center">
					<div class="text-2xl font-bold mb-2">Loading properties...</div>
					<div class="text-white/60">Please wait while we find your perfect match</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.stop-color-green-500 {
		stop-color: #10b981;
	}
	.stop-color-green-400 {
		stop-color: #34d399;
	}
	.stop-color-yellow-500 {
		stop-color: #eab308;
	}
	.stop-color-yellow-400 {
		stop-color: #facc15;
	}
	.stop-color-orange-500 {
		stop-color: #f97316;
	}
	.stop-color-orange-400 {
		stop-color: #fb923c;
	}
</style> 