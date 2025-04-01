<script lang="ts">
  import { formatCurrency } from '$lib/utils';
  import type { UnifiedProperty } from '$lib/types/unified-property';
  import { Card, CardContent } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Check } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { AddToCollection } from '$lib/components/folder';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { HtmlContent } from '$lib/components/ui/html-content';

  // Props
  let { property, showCollectionButton = true, isLoading = false } = $props<{ 
    property: UnifiedProperty;
    showCollectionButton?: boolean;
    isLoading?: boolean;
  }>();
  
  // Event dispatcher
  const dispatch = createEventDispatcher<{
    select: UnifiedProperty;
  }>();
  
  // Function to get score color based on score value
  function getScoreColor(score: number): string {
    if (score >= 80) return 'from-green-500 to-green-400';
    if (score >= 70) return 'from-yellow-500 to-yellow-400';
    return 'from-orange-500 to-orange-400';
  }
  
  // Helper to check if a property field is undefined or null
  function isPending(value: any): boolean {
    return value === undefined || value === null;
  }
</script>

<button 
  class="relative cursor-pointer w-full transform transition-all duration-300 hover:-translate-y-1"
  onclick={() => dispatch('select', property)}
>
  <Card class="overflow-hidden bg-card border-border text-foreground hover:shadow-xl hover:shadow-primary/20 transition-all h-[450px] w-full flex flex-col">
    <div class="relative h-56 overflow-hidden">
      {#if isPending(property.media?.main_image) || isLoading}
        <div class="w-full h-full bg-muted animate-pulse"></div>
      {:else}
        <img 
          src={property.media.main_image || 'https://via.placeholder.com/400x200?text=No+Image'} 
          alt={property.name}
          class="w-full h-full object-cover"
        />
      {/if}
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
      <div class="absolute bottom-4 left-4 text-foreground text-2xl font-bold">
        {#if isPending(property.pricing?.total) || isLoading}
          <div class="w-20 h-8 bg-muted/40 backdrop-blur-sm animate-pulse rounded-md"></div>
        {:else}
          ${Math.round(property.pricing.total)}
        {/if}
      </div>
      
      {#if showCollectionButton}
        <button 
          type="button" 
          class="absolute top-3 left-3 z-10" 
          onclick={(e) => e.stopPropagation()}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          <AddToCollection {property} />
        </button>
      {/if}
    </div>
    
    <div class="absolute top-3 right-3">
      <div class="w-16 h-16 rounded-full flex items-center justify-center bg-background/50 backdrop-blur-sm border-2 border-border text-foreground font-bold text-xl shadow-lg shadow-black/20 relative">
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
            stroke-dashoffset={isPending(property.score) || isLoading ? 100 : (100 - property.score)}
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
        {#if isPending(property.score) || isLoading}
          <div class="relative w-8 h-5 bg-muted/60 animate-pulse rounded-md"></div>
        {:else}
          <span class="relative">{property.score}</span>
        {/if}
      </div>
    </div>
    
    <CardContent class="p-4 space-y-3 flex-1 flex flex-col">
      <div class="space-y-1 text-left">
        {#if isPending(property.name) || isLoading}
          <Skeleton class="h-6 w-3/4" />
        {:else}
          <h3 class="font-bold text-lg line-clamp-1">{property.name}</h3>
        {/if}
        
        {#if isPending(property.location) || isLoading}
          <Skeleton class="h-4 w-1/2" />
        {:else}
          <p class="text-sm text-muted-foreground line-clamp-1">{property.location}</p>
        {/if}
      </div>
      
      <div class="text-xs text-muted-foreground space-y-1 text-left">
        {#if isPending(property.capacity) || isLoading}
          <Skeleton class="h-4 w-32" />
        {:else if property.capacity.bedrooms || property.capacity.beds}
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
      
      <!-- Amenities - if we decide to show them in the future -->
      <!-- <div class="flex flex-wrap gap-2 my-2">
        {#if isPending(property.features?.amenities) || isLoading}
          <div class="flex gap-2">
            <Skeleton class="h-5 w-16 rounded-full" />
            <Skeleton class="h-5 w-24 rounded-full" />
            <Skeleton class="h-5 w-20 rounded-full" />
          </div>
        {:else}
          {#each property.features.amenities.slice(0, 3) as amenity}
            <Badge variant="outline">{amenity}</Badge>
          {/each}
          {#if property.features.amenities.length > 3}
            <Badge variant="outline" class="text-xs">+{property.features.amenities.length - 3}</Badge>
          {/if}
        {/if}
      </div> -->
      
      <div class="pt-2 text-sm text-green-400 mt-auto text-left flex gap-2">
        {#if isPending(property.reasoning) || isLoading}
          <div class="w-full space-y-2">
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-3/4" />
          </div>
        {:else}
          <div class="text-foreground/90 line-clamp-2 w-full">
            <HtmlContent content={property.reasoning} />
          </div>
        {/if}
      </div>
    </CardContent>
  </Card>
</button>

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
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  
  .animate-pulse {
    animation: pulse 1.5s ease-in-out infinite;
  }
</style> 