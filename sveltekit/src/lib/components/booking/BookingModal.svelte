<script lang="ts">
  import type { UnifiedProperty } from '$lib/types/unified-property';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent } from '$lib/components/ui/card';
  import { X, ExternalLink } from 'lucide-svelte';
  import { getScoreColor } from '$lib/utils/score-colors';

  // Props
  let { 
    property,
    open = false,
    onclose
  } = $props<{ 
    property: UnifiedProperty | null,
    open: boolean,
    onclose?: () => void
  }>();

  // Function to close the modal
  function closeModal() {
    if (onclose) onclose();
  }
  
  // Function to handle clicking outside the modal
  function handleOutsideClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
  
  // Effect to prevent scrolling when modal is open
  $effect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  });
</script>

<style>
  .modal-content {
    max-height: calc(90vh - 60px);
    overflow-y: auto;
  }
</style>

{#if open && property}
  <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onclick={handleOutsideClick}>
    <div class="w-full max-w-5xl bg-black rounded-xl shadow-2xl flex flex-col">
      <!-- Header - Fixed -->
      <div class="p-4 border-b border-white/10 flex justify-between items-center bg-black sticky top-0 z-10">
        <h2 class="text-xl font-bold text-white">{property.name}</h2>
        <Button variant="ghost" class="text-white h-9 w-9 p-0" onclick={closeModal}>
          <X size={20} />
        </Button>
      </div>
      
      <!-- Content - Scrollable -->
      <div class="modal-content">
        <div class="p-6 space-y-6">
          <div class="relative rounded-xl overflow-hidden shadow-xl h-64">
            <img
              src={property.media.main_image || 'https://via.placeholder.com/1200x400?text=No+Image'}
              alt={property.name}
              class="w-full h-full object-cover"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
              <p class="text-xl text-white/80">{property.location}</p>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Property Details -->
            <Card class="bg-white/5 border-white/10 rounded-xl overflow-hidden shadow-lg">
              <CardContent class="p-6 space-y-4">
                <h3 class="text-lg font-bold text-white">Property Details</h3>
                
                <div class="bg-purple-500/20 p-4 rounded-lg border border-purple-500/30">
                  <p class="text-sm text-purple-300 font-medium">Total price</p>
                  <p class="text-2xl font-bold text-white">${Math.round(property.pricing.total)}</p>
                </div>
                
                <div class="flex gap-4 text-white text-sm">
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
                
                <div>
                  <h4 class="text-white font-semibold text-sm mb-2">Amenities</h4>
                  <div class="grid grid-cols-2 gap-2 text-xs">
                    {#each property.features.amenities.slice(0, 6) as amenity}
                      <div class="flex items-center gap-1 text-gray-300">
                        <span class="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                        {amenity}
                      </div>
                    {/each}
                    {#if property.features.amenities.length > 6}
                      <div class="text-gray-400 text-xs">+{property.features.amenities.length - 6} more</div>
                    {/if}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <!-- AI Recommendation & Booking -->
            <div class="space-y-4">
              <Card class="bg-white/5 border-white/10 rounded-xl overflow-hidden shadow-lg">
                <CardContent class="p-6">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="w-12 h-12 rounded-full {getScoreColor(property.score)} flex items-center justify-center text-white font-bold text-xl">
                      {property.score}
                    </div>
                    <div>
                      <p class="text-white font-semibold text-sm">Match Score</p>
                      <p class="text-xs text-gray-400">Based on your preferences</p>
                    </div>
                  </div>
                  
                  <div class="text-xs text-gray-300">
                    <p class="whitespace-pre-line">{property.reasoning}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card class="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl overflow-hidden shadow-lg">
                <CardContent class="p-6 space-y-4">
                  <h3 class="text-lg font-bold text-white">Ready to book?</h3>
                  <p class="text-white/80 text-sm">Complete your reservation on {property.source}</p>
                  
                  <a 
                    href={property.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="block w-full bg-white text-purple-700 font-bold py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors text-center flex items-center justify-center gap-2 shadow-md"
                  >
                    <ExternalLink size={18} />
                    Complete Booking
                  </a>
                  
                  <p class="text-xs text-white/60 text-center">
                    You'll be redirected to {property.source}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if} 