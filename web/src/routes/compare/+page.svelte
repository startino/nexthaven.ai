<script lang="ts">
	import { goto } from '$app/navigation';
	import { getProperties, setSelectedProperty } from '$lib/stores/properties.svelte';
	import { formatCurrency } from '$lib/utils';
	import { onMount } from 'svelte';
	import type { UnifiedProperty } from '$lib/types/unified-property';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { ArrowLeft, Check, Crown, ChevronLeft, ChevronRight, X } from 'lucide-svelte';

	// Create a derived property from the store properties
	let properties = $derived(getProperties());
	let selectedProperty: UnifiedProperty | null = $state(null);
	let showGallery = $state(false);
	let expandedImageIndex: number | null = $state(null);
	
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
	
	// Close gallery
	function closeGallery() {
		showGallery = false;
		selectedProperty = null;
		expandedImageIndex = null;
	}
	
	// Expand image to full screen
	function expandImage(index: number) {
		expandedImageIndex = index;
	}
	
	// Close expanded image
	function closeExpandedImage() {
		expandedImageIndex = null;
	}
	
	// Navigate to next image in expanded view
	function nextImage() {
		if (expandedImageIndex === null || !selectedProperty) return;
		
		const totalImages = getAllImages().length;
		if (expandedImageIndex < totalImages - 1) {
			expandedImageIndex++;
		}
	}
	
	// Navigate to previous image in expanded view
	function prevImage() {
		if (expandedImageIndex === null) return;
		
		if (expandedImageIndex > 0) {
			expandedImageIndex--;
		}
	}
	
	// Get all images including main image
	function getAllImages(): string[] {
		if (!selectedProperty) return [];
		
		const mainImage = selectedProperty.media.main_image;
		const galleryImages = selectedProperty.media.gallery || [];
		return [mainImage, ...galleryImages].filter(Boolean);
	}
	
	// Select property and navigate to booking
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
	
	// Monitor gallery state changes to control body scroll
	$effect(() => {
		if (showGallery) {
			// Prevent scrolling on the main page when gallery is open
			document.body.style.overflow = 'hidden';
		} else {
			// Re-enable scrolling when gallery is closed
			document.body.style.overflow = '';
		}
	});
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
			<h1 class="text-xl md:text-3xl font-serif italic text-white">Your Perfect Matches</h1>
		</div>
		
		{#if properties.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				{#each properties as property}
					<button 
						class="relative cursor-pointer transform transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]"
						onclick={() => openGallery(property)}
					>
						<Card class="overflow-hidden bg-zinc-900 border-zinc-800 text-white hover:shadow-xl hover:shadow-purple-500/20 transition-all h-[450px] flex flex-col">
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
							
							<div class="absolute top-3 right-3">
								<div class="w-16 h-16 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-sm border-2 border-white/10 text-white font-bold text-xl shadow-lg shadow-black/20 relative">
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
											class="stroke-[3] transition-all duration-1000 ease-out-expo"
											style="stroke: url(#gradient-{property.id})"
										/>
										<defs>
											<linearGradient id="gradient-{property.id}" x1="0%" y1="0%" x2="100%" y2="100%">
												<stop offset="0%" class="{property.score >= 80 ? 'stop-color-purple-500' : property.score >= 70 ? 'stop-color-yellow-500' : 'stop-color-orange-500'}" />
												<stop offset="100%" class="{property.score >= 80 ? 'stop-color-purple-400' : property.score >= 70 ? 'stop-color-yellow-400' : 'stop-color-orange-400'}" />
											</linearGradient>
										</defs>
									</svg>
									<span class="absolute transform -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 {property.score >= 80 ? 'text-purple-300' : property.score >= 70 ? 'text-yellow-300' : 'text-orange-300'}">{property.score}</span>
								</div>
							</div>
							
							<CardContent class="p-4 space-y-3 flex-1 flex flex-col">
								<div class="space-y-1 text-left">
									<h3 class="font-bold text-lg line-clamp-1">{property.name}</h3>
									<p class="text-sm text-white/60 line-clamp-1">{property.location}</p>
								</div>
								
								<div class="text-xs text-white/70 space-y-1 text-left">
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
								
								<div class="pt-2 text-sm text-green-400 mt-auto text-left flex gap-2">
									<Check size={20} class="inline-block" />
									<span class="text-white/90 line-clamp-2">{getPriceExplanation(property)}</span>
								</div>
							</CardContent>
						</Card>
					</button>
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

<!-- Gallery Modal -->
{#if showGallery && selectedProperty}
	<div class="fixed inset-0 bg-black z-50 flex flex-col">
		<!-- Header - Fixed at the top -->
		<div class="bg-black/90 backdrop-blur-sm z-10 p-4 flex justify-between items-center border-b border-white/10">
			<button 
				onclick={closeGallery}
				class="flex items-center gap-2 text-white/80 hover:text-white"
			>
				<ArrowLeft size={20} />
				<span>Back</span>
			</button>
			
			<Button
				onclick={() => {
					if (selectedProperty) {
						selectProperty(selectedProperty)
					}
				}}
				class="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-6"
			>
				<Crown size={18} class="mr-2" />
				Select as Winner
			</Button>
		</div>
		
		<!-- Gallery Content - Scrollable area -->
		<ScrollArea class="flex-1 h-full">
			<div class="px-4 py-8 md:px-8 max-w-6xl mx-auto">
				<div class="mb-8">
					<h2 class="text-3xl font-serif">Gallery</h2>
					<p class="text-white/60 mt-2">Browse through the available images of {selectedProperty.name}</p>
				</div>

					<!-- Property Details -->
				<div class="mb-8 border-b border-white/10 pb-8">
					<div class="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
						<div>
							<h3 class="text-xl font-medium">{selectedProperty.name}</h3>
							<p class="text-white/60 mt-1">{selectedProperty.location}</p>
							
							<div class="flex gap-4 mt-4">
								{#if selectedProperty.capacity.bedrooms}
									<div class="px-4 py-2 rounded-full bg-white/10">
										<span class="text-white/90">{selectedProperty.capacity.bedrooms} {selectedProperty.capacity.bedrooms === 1 ? 'bedroom' : 'bedrooms'}</span>
									</div>
								{/if}
								{#if selectedProperty.capacity.beds}
									<div class="px-4 py-2 rounded-full bg-white/10">
										<span class="text-white/90">{selectedProperty.capacity.beds} {selectedProperty.capacity.beds === 1 ? 'bed' : 'beds'}</span>
									</div>
								{/if}
							</div>
						</div>
						
						<div class="text-2xl font-bold">
							${Math.round(selectedProperty.pricing.total)}
						</div>
					</div>
				</div>
				
				<!-- Gallery Grid -->
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
					{#each getAllImages() as image, index}
						<button 
							class="relative aspect-video rounded-xl overflow-hidden bg-zinc-900 cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20"
							onclick={() => expandImage(index)}
						>
							<img 
								src={image} 
								alt={`Image ${index + 1}`}
								class="w-full h-full object-cover"
							/>
						</button>
					{/each}
				</div>
			</div>
		</ScrollArea>
	</div>
	
	<!-- Expanded Image View -->
	{#if expandedImageIndex !== null}
		<div class="fixed inset-0 bg-black/95 z-[60] flex flex-col">
			<div class="bg-black p-4 flex justify-between items-center border-b border-white/10">
				<button
					onclick={closeExpandedImage}
					class="text-white p-2 rounded-full hover:bg-white/10"
				>
					<X size={24} />
				</button>
				<p class="text-white">
					{expandedImageIndex + 1} / {getAllImages().length}
				</p>
			</div>
			
			<div class="flex-1 flex items-center justify-center relative overflow-hidden">
				<img
					src={getAllImages()[expandedImageIndex]}
					alt={`Gallery image ${expandedImageIndex + 1}`}
					class="max-h-[80vh] max-w-[90vw] object-contain"
				/>
				
				<!-- Navigation buttons -->
				{#if expandedImageIndex > 0}
					<button
						onclick={prevImage}
						class="absolute left-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
					>
						<ChevronLeft size={24} />
					</button>
				{/if}
				
				{#if expandedImageIndex < getAllImages().length - 1}
					<button
						onclick={nextImage}
						class="absolute right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
					>
						<ChevronRight size={24} />
					</button>
				{/if}
			</div>
			
			<!-- Thumbnail navigation -->
			<ScrollArea orientation="horizontal" class="border-t border-white/10 py-4 bg-black h-24">
				<div class="flex gap-3 px-4 min-w-min mx-auto max-w-full">
					{#each getAllImages() as image, index}
						<button 
							onclick={() => expandedImageIndex = index}
							class="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 rounded-md overflow-hidden transition-all duration-200 hover:scale-105 hover:shadow-md hover:shadow-purple-500/30 {index === expandedImageIndex ? 'ring-2 ring-purple-500 scale-105 shadow-lg shadow-purple-500/40' : 'border border-white/10'}"
						>
							<img src={image} alt={`Thumbnail ${index + 1}`} class="w-full h-full object-cover" />
						</button>
					{/each}
				</div>
			</ScrollArea>
		</div>
	{/if}
{/if}

<style>
	.stop-color-purple-500 {
		stop-color: #8b5cf6;
	}
	.stop-color-purple-400 {
		stop-color: #a78bfa;
	}
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