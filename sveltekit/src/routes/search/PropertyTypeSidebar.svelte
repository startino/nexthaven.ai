<script lang="ts">
  import { Home, Coffee } from 'lucide-svelte';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { propertyTypes, amenities } from './searchData';
  
  // Property type selection state
  let { selectedPropertyType, activePreferenceModal, preferenceStrength, selectedAmenities } = $props<{
    selectedPropertyType: string | null;
    activePreferenceModal: string | null;
    preferenceStrength: Record<string, 'weak' | 'mid' | 'strong'>;
    selectedAmenities: string[];
  }>();
  
  // Functions for handling selection
  function togglePropertyType(type: string) {
    if (selectedPropertyType === type) {
      selectedPropertyType = null;
      activePreferenceModal = null;
    } else {
      selectedPropertyType = type;
      activePreferenceModal = type;
      
      // Initialize preference if not already set
      if (!preferenceStrength[type]) {
        preferenceStrength[type] = 'mid';
      }
    }
  }

  function setPreferenceStrength(type: string, strength: 'weak' | 'mid' | 'strong') {
    preferenceStrength[type] = strength;
  }

  function toggleAmenity(amenity: string) {
    if (selectedAmenities.includes(amenity)) {
      selectedAmenities = selectedAmenities.filter((a: string) => a !== amenity);
    } else {
      selectedAmenities = [...selectedAmenities, amenity];
    }
  }
</script>

<div class="w-[250px] min-w-[250px] h-full border-r border-border">
  <ScrollArea class="h-full">
    <!-- Property Type Section -->
    <div class="p-4">
      <div class="flex items-center gap-2 mb-5">
        <Home class="h-5 w-5 text-foreground" />
        <h2 class="text-lg font-medium text-foreground">Property Type</h2>
      </div>
      
      <div class="space-y-3">
        {#each propertyTypes as type}
          <div class="relative">
            <button
              class={`w-full p-3 text-left bg-card rounded-md text-sm hover:bg-background/30 transition cursor-pointer ${selectedPropertyType === type ? 'bg-primary/10 border-primary/30' : ''}`}
              onclick={() => togglePropertyType(type)}
            >
              {type}
            </button>
            
            {#if activePreferenceModal === type}
              <div 
                class="absolute z-10 top-full left-0 mt-1 w-full bg-card rounded-md shadow-lg border border-border overflow-hidden"
                transition:slide={{ duration: 150, easing: cubicOut }}
              >
                <div class="grid grid-cols-3 border-b border-border">
                  <button 
                    class={`p-1 text-center text-xs ${preferenceStrength[type] === 'weak' ? 'bg-primary/20 text-primary' : 'hover:bg-background/30'}`}
                    onclick={() => setPreferenceStrength(type, 'weak')}
                  >
                    weak
                  </button>
                  <button 
                    class={`p-1 text-center text-xs ${preferenceStrength[type] === 'mid' ? 'bg-primary/20 text-primary' : 'hover:bg-background/30'}`}
                    onclick={() => setPreferenceStrength(type, 'mid')}
                  >
                    mid
                  </button>
                  <button 
                    class={`p-1 text-center text-xs ${preferenceStrength[type] === 'strong' ? 'bg-primary/20 text-primary' : 'hover:bg-background/30'}`}
                    onclick={() => setPreferenceStrength(type, 'strong')}
                  >
                    strong
                  </button>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
    
    <!-- Amenities Section -->
    <div class="p-4 mt-4">
      <div class="flex items-center gap-2 mb-5">
        <Coffee class="h-5 w-5 text-foreground" />
        <h2 class="text-lg font-medium text-foreground">Amenities</h2>
      </div>
      
      <div class="space-y-1">
        {#each amenities as amenity}
          <button 
            class={`w-full p-3 text-left rounded-sm hover:bg-background/30 transition cursor-pointer ${selectedAmenities.includes(amenity) ? 'bg-primary/10 border-primary/30' : ''}`}
            onclick={() => toggleAmenity(amenity)}
          >
            {amenity}
          </button>
        {/each}
      </div>
    </div>
  </ScrollArea>
</div> 