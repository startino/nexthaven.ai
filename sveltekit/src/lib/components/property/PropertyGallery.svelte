<script lang="ts">
  import { formatCurrency } from '$lib/utils';
  import type { UnifiedProperty } from '$lib/types/unified-property';
  import { Button } from '$lib/components/ui/button';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { ArrowLeft, Crown, ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  
  // Props - combining all props into a single $props call
  let { 
    property, 
    showGallery = false,
    primaryActionText = 'View Property',
    primaryActionIcon = ExternalLink
  } = $props<{ 
    property: UnifiedProperty | null,
    showGallery: boolean,
    primaryActionText?: string,
    primaryActionIcon?: any
  }>();
  
  // Event dispatcher
  const dispatch = createEventDispatcher<{
    close: void;
    primaryAction: void;
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
      
      {#if property.url || primaryActionText !== 'View Property'}
        <Button
          onclick={() => dispatch('primaryAction')}
          class="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6"
        >
          <svelte:component this={primaryActionIcon} size={18} class="mr-2" />
          {primaryActionText}
        </Button>
      {/if}
    </div>
    
    <!-- Gallery Content - Scrollable area -->
    <ScrollArea class="flex-1 h-full">
      <div class="px-4 py-8 md:px-8 max-w-6xl mx-auto">
        <div class="mb-8">
          <h2 class="text-3xl font-serif">Gallery</h2>
          <p class="text-muted-foreground mt-2">Browse through the available images of {property.name}</p>
        </div>

        <!-- Property Details -->
        <div class="mb-8 border-b border-border pb-8">
          <div class="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
              <h3 class="text-xl font-medium">{property.name}</h3>
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
              </div>
            </div>
            
            <div class="text-2xl font-bold">
              ${Math.round(property.pricing.total)}
            </div>
          </div>
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