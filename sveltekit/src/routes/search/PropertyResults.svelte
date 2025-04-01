<!-- 
  PropertyResults.svelte - Displays properties as they load in with loading states
-->
<script lang="ts">
  import { Card, CardContent } from '$lib/components/ui/card';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { Badge } from '$lib/components/ui/badge';
  import { Building2, Database, Clock, Crown, MapPin } from 'lucide-svelte';
  import type { UnifiedProperty } from '$lib/types/unified-property';
  import type { PropertyEvaluationStep } from '$lib/event';
  import { PropertyCard, PropertyGallery } from '$lib/components/property';
  import { setSelectedProperty } from '$lib/stores/properties.svelte';
  import { goto } from '$app/navigation';
  import { CollectionService } from '$lib/services/collection.service';
  import { page } from '$app/stores';

  // Props
  let { 
    properties, 
    propertyCount, 
    isSearching, 
    currentStepName 
  } = $props<{
    properties: UnifiedProperty[];
    propertyCount: number;
    isSearching: boolean;
    currentStepName?: PropertyEvaluationStep;
  }>();

  // State for property gallery
  let selectedProperty: UnifiedProperty | null = $state(null);
  let showGallery = $state(false);

  // Check if a property has all the required fields for display
  function isValidProperty(property: any): boolean {
    try {
      // Basic validation of property structure
      if (!property || typeof property !== 'object') return false;
      if (!property.id || !property.name) return false;
      if (!property.media || !property.media.main_image) return false;
      if (!property.pricing || typeof property.pricing.total === 'undefined') return false;
      if (!property.features || !Array.isArray(property.features.amenities)) return false;
      
      return true;
    } catch (e) {
      console.error('Error validating property:', e);
      return false;
    }
  }

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
  
  // Event handler for property card selection
  function handlePropertySelect(event: CustomEvent<UnifiedProperty>) {
    openGallery(event.detail);
  }
  
  // Close gallery
  function closeGallery() {
    showGallery = false;
    selectedProperty = null;
  }
  
  // Select property and navigate to booking
  function selectProperty(property: UnifiedProperty) {
    try {
      console.log("Opening booking link for property:", property.id);
      // Open the property URL in a new tab if available
      if (property.url) {
        window.open(property.url, '_blank', 'noopener,noreferrer');
      } else {
        console.error("No booking URL available for property:", property.id);
      }
    } catch (error) {
      console.error("Error opening booking link:", error);
    }
  }

  // Save property to default collection
  async function saveProperty(property: UnifiedProperty) {
    try {
      console.log("Saving property:", property.id);
      if (!$page.data.session?.user?.id) {
        console.error("You must be logged in to save properties");
        return;
      }
      
      // Ensure default collection exists
      const defaultCollection = await CollectionService.ensureDefaultCollection($page.data.session.user.id);
      
      // Add property to default collection
      await CollectionService.addPropertyToCollection(defaultCollection.id, property);
      
      console.log("Property saved successfully");
    } catch (error) {
      console.error("Error saving property:", error);
    }
  }

  // Generate placeholder property objects for loading state
  function createPlaceholderProperty(index: number): UnifiedProperty {
    return {
      id: `placeholder-${index}`,
      name: undefined,
      description: undefined,
      url: undefined,
      source: 'placeholder',
      location: undefined,
      media: { main_image: undefined, images: [] },
      pricing: { total: undefined, currency: 'USD' },
      capacity: {},
      features: { amenities: [] },
      score: undefined,
      reasoning: undefined
    } as unknown as UnifiedProperty;
  }
</script>

<div class="mt-8 border-t border-border pt-8">
  <div class="flex justify-between items-center mb-6">
    <h2 class="text-xl font-medium flex items-center gap-2">
      <Building2 class="h-5 w-5 text-primary" />
      <span>
        {#if properties.length > 0}
          Properties Found: {properties.length} 
          {#if propertyCount > 0 && propertyCount > properties.length}
            <span class="text-muted-foreground text-sm">of {propertyCount}</span>
          {/if}
        {:else if isSearching}
          {#if propertyCount > 0}
            Finding {propertyCount} Properties
          {:else}
            Searching for Properties
          {/if}
        {:else}
          Properties
        {/if}
      </span>
    </h2>
    
    {#if isSearching}
      {#if currentStepName === 'retrieving' || currentStepName === 'retrieved'}
        <div class="text-sm text-primary flex items-center gap-1">
          <span class="flex items-center gap-1">
            <Database class="h-4 w-4 animate-pulse" />
            <span>Loading property data...</span>
          </span>
        </div>
      {:else}
        <div class="text-sm text-muted-foreground flex items-center gap-1">
          <span class="flex items-center gap-1">
            <span>Our team is working on making the search faster!</span>
          </span>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Property Grid: Full width responsive layout -->
  <div class="w-full">
    {#if isSearching}
      <!-- Searching state: Show properties with loading states -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {#if properties.length > 0}
          {#each properties as property, i}
            <div class="w-full transition-all duration-500 ease-in-out animate-fadeIn animate-scaleIn" style="animation-delay: {i * 150}ms">
              <PropertyCard 
                property={property}
                on:select={handlePropertySelect}
                isLoading={!isValidProperty(property)}
              />
            </div>
          {/each}
        {/if}
        
        <!-- Generate placeholder PropertyCards for the remaining count -->
        {#each Array(Math.min(8, Math.max(4, propertyCount - properties.length))) as _, i}
          <div class="w-full transition-all duration-500 ease-in-out animate-fadeIn animate-scaleIn" style="animation-delay: {(properties.length + i) * 150}ms">
            <PropertyCard 
              property={createPlaceholderProperty(i)}
              isLoading={true}
            />
          </div>
        {/each}
      </div>
    {:else if properties.length > 0}
      <!-- Results state: Use the PropertyCard component with a responsive grid layout -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {#each properties as property}
          <div class="w-full">
            <PropertyCard 
              property={property}
              on:select={handlePropertySelect}
            />
          </div>
        {/each}
      </div>
    {/if}
    
    {#if isSearching && properties.length === 0}
      <p class="text-center text-muted-foreground mt-6">
        {#if currentStepName === 'retrieving' || currentStepName === 'retrieved'}
          Looking for available properties at your destination...
        {:else if currentStepName === 'processing' || currentStepName === 'formatting'}
          Evaluating and ranking properties based on your preferences...
        {:else}
          Preparing to show you the best matches for your search...
        {/if}
      </p>
    {/if}
  </div>
</div>

<!-- Property Gallery Component -->
<PropertyGallery
  property={selectedProperty}
  showGallery={showGallery}
  on:close={closeGallery}
  on:book={() => selectedProperty && selectProperty(selectedProperty)}
  on:save={() => selectedProperty && saveProperty(selectedProperty)}
/>

<style>
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes scaleIn {
    from { transform: scale(0.95); }
    to { transform: scale(1); }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.8s ease-out forwards;
  }
  
  .animate-scaleIn {
    animation: scaleIn 0.8s ease-out forwards;
  }
</style> 