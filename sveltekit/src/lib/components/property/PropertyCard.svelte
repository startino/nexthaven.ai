<script lang="ts">
  import { formatCurrency } from '$lib/utils';
  import type { UnifiedProperty } from '$lib/types/unified-property';
  import { Card, CardContent } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Check } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { AddToCollection } from '$lib/components/folder';

  // Props
  let { property, showCollectionButton = true } = $props<{ 
    property: UnifiedProperty;
    showCollectionButton?: boolean;
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
  
</script>

<button 
  class="relative cursor-pointer transform transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01]"
  onclick={() => dispatch('select', property)}
>
  <Card class="overflow-hidden bg-card border-border text-foreground hover:shadow-xl hover:shadow-primary/20 transition-all h-[450px] flex flex-col">
    <div class="relative h-56 overflow-hidden">
      <img 
        src={property.media.main_image || 'https://via.placeholder.com/400x200?text=No+Image'} 
        alt={property.name}
        class="w-full h-full object-cover"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
      <div class="absolute bottom-4 left-4 text-foreground text-2xl font-bold">
        ${Math.round(property.pricing.total)}
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
    
    <div class="absolute top-3 right-16">
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
        <span class="absolute transform -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 {getScoreColor(property.score)}">{property.score}</span>
      </div>
    </div>
    
    <CardContent class="p-4 space-y-3 flex-1 flex flex-col">
      <div class="space-y-1 text-left">
        <h3 class="font-bold text-lg line-clamp-1">{property.name}</h3>
        <p class="text-sm text-muted-foreground line-clamp-1">{property.location}</p>
      </div>
      
      <div class="text-xs text-muted-foreground space-y-1 text-left">
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
          <Badge variant="outline">{amenity}</Badge>
        {/each}
        {#if property.features.amenities.length > 3}
          <Badge variant="outline" class="text-xs">+{property.features.amenities.length - 3}</Badge>
        {/if}
      </div>
      
      <div class="pt-2 text-sm text-green-400 mt-auto text-left flex gap-2">
        <span class="text-foreground/90 line-clamp-2">{property.reasoning}</span>
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
</style> 