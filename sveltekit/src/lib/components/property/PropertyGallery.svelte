<script lang="ts">
  import { formatCurrency } from '$lib/utils';
  import type { UnifiedProperty } from '$lib/types/unified-property';
  import { Button } from '$lib/components/ui/button';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { ArrowLeft, ChevronLeft, ChevronRight, X, ExternalLink, Check, Star, BookmarkPlus } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { Card, CardContent } from '$lib/components/ui/card';
  import { AddToCollection } from '$lib/components/folder';
  import { page } from '$app/stores';
  import { CollectionService } from '$lib/services/collection.service';
  
  // Props - simplified
  let { 
    property, 
    showGallery = false,
  } = $props<{ 
    property: UnifiedProperty | null,
    showGallery: boolean,
  }>();
  
  // Event dispatcher
  const dispatch = createEventDispatcher<{
    close: void;
    book: void;
    save: void;
  }>();
  
  // Local state
  let expandedImageIndex: number | null = $state(null);
  
  // Close expanded image
  function closeExpandedImage() {
    expandedImageIndex = null;
  }
  
  // Expand image to full screen
  function expandImage(index: number) {
    expandedImageIndex = index;
  }
  
  // Navigate to next image in expanded view
  function nextImage() {
    if (expandedImageIndex === null || !property) return;
    
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
    if (!property) return [];
    
    const mainImage = property.media.main_image;
    const galleryImages = property.media.gallery || [];
    return [mainImage, ...galleryImages].filter(Boolean);
  }
  
  // Get score color based on score value
  function getScoreColor(score: number): string {
    if (score >= 80) return 'bg-gradient-to-r from-purple-500 to-purple-400 text-white';
    if (score >= 70) return 'bg-gradient-to-r from-yellow-500 to-yellow-400 text-white';
    return 'bg-gradient-to-r from-orange-500 to-orange-400 text-white';
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
  
  // Reset expanded image index when gallery is closed
  $effect(() => {
    if (!showGallery) {
      expandedImageIndex = null;
    }
  });
  
  // Handle save functionality
  async function handleSave() {
    if (!property) return;
    try {
      if (!$page.data.session?.user?.id) {
        console.error("You must be logged in to save properties");
        return;
      }
      
      // Ensure default collection exists
      const defaultCollection = await CollectionService.ensureDefaultCollection($page.data.session.user.id);
      
      // Add property to default collection
      await CollectionService.addPropertyToCollection(defaultCollection.id, property);
      
      console.log("Property saved successfully");
      dispatch('save');
    } catch (error) {
      console.error("Error saving property:", error);
    }
  }
  
  // Handle booking functionality
  function handleBook() {
    dispatch('book');
  }
</script>

{#if showGallery && property}
  <div class="fixed inset-0 bg-background z-50 flex flex-col">
    <!-- Header - Fixed at the top -->
    <div class="bg-background/90 backdrop-blur-sm z-10 p-4 flex justify-between items-center border-b border-border">
      <button 
        onclick={() => dispatch('close')}
        class="flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={20} />
        <span>Back</span>
      </button>
      
      <div class="flex gap-2">
        {#if property}
          <div onclick={(e) => e.stopPropagation()} class="z-10">
            <AddToCollection property={property} />
          </div>
        {:else}
          <Button
            onclick={handleSave}
            variant="outline"
            class="rounded-full px-4"
          >
            <BookmarkPlus size={18} class="mr-2" />
            Save
          </Button>
        {/if}
        
        <Button
          onclick={handleBook}
          class="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6"
        >
          <ExternalLink size={18} class="mr-2" />
          Book
        </Button>
      </div>
    </div>
    
    <!-- Gallery Content - Scrollable area -->
    <ScrollArea class="flex-1 h-full">
      <div class="px-4 py-8 md:px-8 max-w-7xl mx-auto">
        <!-- Property Header Section -->
        <div class="mb-8">
          <h1 class="text-2xl font-bold">{property.name}</h1>
          <p class="text-muted-foreground mt-1">{property.location}</p>
          
          <div class="flex gap-4 mt-4">
            {#if property.capacity.bedrooms}
              <div class="px-4 py-2 rounded-full bg-secondary/20">
                <span class="text-foreground/90">{property.capacity.bedrooms} {property.capacity.bedrooms === 1 ? 'bedroom' : 'bedrooms'}</span>
              </div>
            {/if}
            {#if property.capacity.beds}
              <div class="px-4 py-2 rounded-full bg-secondary/20">
                <span class="text-foreground/90">{property.capacity.beds} {property.capacity.beds === 1 ? 'bed' : 'beds'}</span>
              </div>
            {/if}
            <div class="px-4 py-2 rounded-full bg-secondary/20 font-semibold text-green-600 dark:text-green-400">
              <span>${Math.round(property.pricing.total)} per night</span>
            </div>
          </div>
        </div>
        
        <!-- Two column layout for property details and booking card -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <!-- Left side - AI Recommendation -->
          <div class="lg:col-span-2">
            <div class="flex gap-6 mb-8">
              <!-- Score circle - Properly aligned -->
              <div class="flex-shrink-0">
                <div class="w-32 h-32 rounded-full flex items-center justify-center text-foreground font-bold text-3xl shadow-lg shadow-primary/10 relative">
                  <svg viewBox="0 0 36 36" class="absolute inset-0 w-full h-full">
                    <path 
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#444"
                      stroke-width="2"
                    />
                    <path 
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke-dasharray="100, 100"
                      stroke-dashoffset={100 - property.score}
                      stroke-linecap="round"
                      class="stroke-2 transition-all duration-1000 ease-out-expo"
                      style="stroke: url(#gradient-gallery-{property.id})"
                    />
                    <defs>
                      <linearGradient id="gradient-gallery-{property.id}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" class="{property.score >= 80 ? 'stop-color-purple-500' : property.score >= 70 ? 'stop-color-yellow-500' : 'stop-color-orange-500'}" />
                        <stop offset="100%" class="{property.score >= 80 ? 'stop-color-purple-400' : property.score >= 70 ? 'stop-color-yellow-400' : 'stop-color-orange-400'}" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span class="relative">{property.score}</span>
                </div>
                <div class="text-center mt-2">
                  <div class={`text-sm px-3 py-1 rounded-full inline-block font-medium ${property.score >= 80 ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : property.score >= 70 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                    {property.score >= 80 ? 'Excellent Match' : property.score >= 70 ? 'Good Match' : 'Average Match'}
                  </div>
                </div>
                
                <!-- Source information -->
                <div class="mt-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <span>Source:</span>
                  <span class={`px-2 py-0.5 rounded text-xs font-medium ${property.source === 'Airbnb' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                    {property.source}
                  </span>
                </div>
              </div>
              
              <!-- Reasoning -->
              <div class="flex-1">
                <h3 class="text-lg font-medium mb-3">Why this property matches your preferences:</h3>
                <div class="bg-primary/5 rounded-lg p-4 border border-primary/10">
                  <div class="flex gap-3">
                    <Check size={20} class="text-green-500 flex-shrink-0 mt-1" />
                    <p class="text-foreground/90">{property.reasoning}</p>
                  </div>
                </div>
                
                <div class="mt-4 space-y-2">
                  <div class="flex items-center">
                    <span class="mr-2 text-muted-foreground">Price:</span>
                    <span class="text-2xl font-bold text-foreground">${Math.round(property.pricing.total)}</span>
                    <span class="ml-2 text-muted-foreground">per night</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Right side - Booking Card -->
          <div class="lg:col-span-1">
            <Card class="bg-gradient-to-r from-primary to-accent rounded-xl overflow-hidden shadow-lg">
              <CardContent class="p-6 space-y-4">
                <h3 class="text-xl font-bold text-primary-foreground">Ready to book?</h3>
                <p class="text-primary-foreground/80">Complete your reservation on {property.source}</p>
                
                <a 
                  href={property.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="block w-full bg-background text-foreground font-bold py-3 px-4 rounded-lg hover:bg-muted transition-colors text-center flex items-center justify-center gap-2 shadow-md"
                >
                  <ExternalLink size={18} />
                  Complete Booking
                </a>
                
                <p class="text-xs text-primary-foreground/60 text-center">
                  You'll be redirected to {property.source} to complete your reservation
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <div class="mb-8">
          <h2 class="text-3xl font-serif">Gallery</h2>
          <p class="text-muted-foreground mt-2">Browse through the available images of {property.name}</p>
        </div>

        <!-- Gallery Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {#each getAllImages() as image, index}
            <button 
              class="relative aspect-video rounded-xl overflow-hidden bg-card cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-accent/20"
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
    <div class="fixed inset-0 bg-background/95 z-[60] flex flex-col">
      <div class="bg-background p-4 flex justify-between items-center border-b border-border">
        <button
          onclick={closeExpandedImage}
          class="text-foreground p-2 rounded-full hover:bg-secondary/20"
        >
          <X size={24} />
        </button>
        <p class="text-foreground">
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
            class="absolute left-4 p-2 rounded-full bg-background/50 text-foreground hover:bg-background/70"
          >
            <ChevronLeft size={24} />
          </button>
        {/if}
        
        {#if expandedImageIndex < getAllImages().length - 1}
          <button
            onclick={nextImage}
            class="absolute right-4 p-2 rounded-full bg-background/50 text-foreground hover:bg-background/70"
          >
            <ChevronRight size={24} />
          </button>
        {/if}
      </div>
      
      <!-- Thumbnail navigation -->
      <ScrollArea orientation="horizontal" class="border-t border-border py-4 bg-background h-24">
        <div class="flex gap-3 px-4 min-w-min mx-auto max-w-full justify-center">
          {#each getAllImages() as image, index}
            <button 
              onclick={() => expandedImageIndex = index}
              class="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 rounded-md overflow-hidden transition-all duration-200 hover:scale-105 hover:shadow-md hover:shadow-accent/30 {index === expandedImageIndex ? 'ring-2 ring-primary scale-105 shadow-lg shadow-primary/40' : 'border border-border'}"
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