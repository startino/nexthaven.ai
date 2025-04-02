<script lang="ts">
  import { formatCurrency } from '$lib/utils';
  import type { UnifiedProperty } from '$lib/types/unified-property';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { ArrowLeft, ExternalLink } from 'lucide-svelte';

  // Props
  let { 
    property,
    backText = "Back",
    showBackButton = true,
    onback,
    back
  } = $props<{ 
    property: UnifiedProperty, 
    backText?: string,
    showBackButton?: boolean,
    onback?: () => void,
    back?: () => void
  }>();

  // Handle back button click
  function handleBack() {
    if (onback) {
      // Use primary callback prop
      onback();
    } else if (back) {
      // Use alternative callback prop name
      back();
    }
  }

</script>

<div class="fixed inset-0 bg-background z-50 flex flex-col">
  <!-- Header - Fixed at the top -->
  <div class="bg-background/90 backdrop-blur-sm z-10 p-4 flex justify-between items-center border-b border-border">
    {#if showBackButton}
      <button 
        onclick={handleBack}
        class="flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={20} />
        <span>{backText}</span>
      </button>
    {/if}
    
    <h1 class="text-xl font-serif italic text-foreground ml-auto mr-auto">Complete Your Booking</h1>
    <div class="w-20"></div> <!-- Spacer for balance -->
  </div>
  
  <!-- Content - Scrollable area -->
  <ScrollArea class="flex-1 h-full">
    {#if property}
      <div class="px-4 py-8 md:px-8 max-w-6xl mx-auto">
        <div class="relative rounded-xl overflow-hidden shadow-xl mb-8">
          <img
            src={property.media.main_image || 'https://via.placeholder.com/1200x400?text=No+Image'}
            alt={property.name}
            class="w-full h-64 md:h-96 object-cover"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent flex flex-col justify-end p-6">
            <h2 class="text-2xl md:text-4xl font-bold text-foreground">{property.name}</h2>
            <p class="text-xl text-foreground/80">{property.location}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12">
          <!-- Property Details -->
          <div class="space-y-6">
            <Card class="bg-card border-border rounded-xl overflow-hidden shadow-lg">
              <CardContent class="p-6 space-y-6">
                <h3 class="text-xl font-bold text-foreground">Property Details</h3>
                
                <div class="grid grid-cols-1 gap-4">
                  <div class="bg-primary/20 p-4 rounded-lg border border-primary/30">
                    <p class="text-sm text-primary-foreground/80 font-medium">Total price</p>
                    <p class="text-3xl font-bold text-foreground">${Math.round(property.pricing.total)}</p>
                  </div>
                </div>
                
                <div class="flex gap-6 text-foreground">
                  {#if property.capacity.bedrooms}
                    <div>
                      <span class="font-bold">{property.capacity.bedrooms}</span> {property.capacity.bedrooms === 1 ? 'bedroom' : 'bedrooms'}
                    </div>
                  {/if}
                  {#if property.capacity.beds}
                    <div>
                      <span class="font-bold">{property.capacity.beds}</span> {property.capacity.beds === 1 ? 'bed' : 'beds'}
                    </div>
                  {/if}
                </div>
                
                {#if property.description}
                  <div>
                    <h4 class="text-foreground font-semibold mb-2">Description</h4>
                    <p class="text-muted-foreground">{property.description}</p>
                  </div>
                {/if}
              </CardContent>
            </Card>
            
            <Card class="bg-card border-border rounded-xl overflow-hidden shadow-lg">
              <CardContent class="p-6">
                <h3 class="text-xl font-bold text-foreground mb-4">Amenities</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {#each property.features.amenities as amenity}
                    <div class="flex items-center gap-2 text-muted-foreground">
                      <span class="w-2 h-2 bg-primary rounded-full"></span>
                      {amenity}
                    </div>
                  {/each}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <!-- AI Recommendation & Booking -->
          <div class="space-y-6">
            <Card class="bg-card border-border rounded-xl overflow-hidden shadow-lg">
              <CardContent class="p-6">
                <h3 class="text-xl font-bold text-foreground mb-4">AI Recommendation</h3>
                <div class="flex items-center gap-4 mb-4">
                  <div class="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-2xl">
                    {property.score}
                  </div>
                  <div>
                    <p class="text-foreground font-semibold">Match Score</p>
                    <p class="text-sm text-muted-foreground">Based on your preferences</p>
                  </div>
                </div>
                
                <div class="space-y-3 text-muted-foreground">
                  <p class="whitespace-pre-line">{property.reasoning}</p>
                </div>
              </CardContent>
            </Card>
            
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
      </div>
    {:else}
      <div class="flex justify-center items-center h-[60vh]">
        <div class="text-center">
          <div class="text-2xl font-bold mb-2">Loading property details...</div>
          <div class="text-muted-foreground">Please wait while we prepare your booking</div>
        </div>
      </div>
    {/if}
  </ScrollArea>
</div> 