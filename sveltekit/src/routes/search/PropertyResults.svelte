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
            <Clock class="h-4 w-4" />
            <span>Processing properties...</span>
          </span>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Two column layout for properties and map -->
  <div class="flex flex-col lg:flex-row gap-6">
    <!-- Property Grid: Left side (60%) -->
    <div class="w-full lg:w-3/5">
      {#if isSearching}
        <!-- Searching state: Show loading skeletons -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          {#if properties.length > 0}
            {#each properties as property, i}
              <div class="transition-all duration-500 ease-in-out animate-fadeIn animate-scaleIn" style="animation-delay: {i * 150}ms">
                <Card class="overflow-hidden bg-card border-border text-foreground h-[450px] flex flex-col">
                  <div class="relative h-56 overflow-hidden">
                    <img 
                      src={property.media?.main_image || 'https://via.placeholder.com/400x200?text=No+Image'} 
                      alt={property.name}
                      class="w-full h-full object-cover"
                    />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                    <div class="absolute bottom-4 left-4 text-white text-2xl font-bold">
                      ${property.pricing?.total ? Math.round(property.pricing.total) : 'N/A'}
                    </div>
                  </div>
                  
                  <div class="absolute top-3 right-3">
                    <div class="w-16 h-16 rounded-full flex items-center justify-center bg-background/50 backdrop-blur-sm border-2 border-border text-foreground font-bold text-xl shadow-lg shadow-black/20">
                      {property.score || 'N/A'}
                    </div>
                  </div>
                  
                  <CardContent class="p-4 space-y-3 flex-1 flex flex-col">
                    <div class="space-y-1 text-left">
                      <h3 class="font-bold text-lg line-clamp-1">{property.name}</h3>
                      <p class="text-sm text-muted-foreground line-clamp-1">{property.location || 'Location information unavailable'}</p>
                    </div>
                    
                    <div class="text-xs text-muted-foreground space-y-1 text-left">
                      {#if property.capacity?.bedrooms || property.capacity?.beds}
                        <div class="flex items-center gap-2">
                          {#if property.capacity?.bedrooms}
                            <span>{property.capacity.bedrooms} {property.capacity.bedrooms === 1 ? 'bedroom' : 'bedrooms'}</span>
                          {/if}
                          {#if property.capacity?.bedrooms && property.capacity?.beds}
                            <span>•</span>
                          {/if}
                          {#if property.capacity?.beds}
                            <span>{property.capacity.beds} {property.capacity.beds === 1 ? 'bed' : 'beds'}</span>
                          {/if}
                        </div>
                      {/if}
                    </div>
                    
                    <div class="flex flex-wrap gap-2 my-2">
                      {#if property.features?.amenities && Array.isArray(property.features.amenities)}
                        {#each property.features.amenities.slice(0, 3) as amenity}
                          <Badge variant="outline">{amenity}</Badge>
                        {/each}
                        {#if property.features.amenities.length > 3}
                          <Badge variant="outline" class="text-xs">+{property.features.amenities.length - 3}</Badge>
                        {/if}
                      {:else}
                        <Badge variant="outline">Amenities N/A</Badge>
                      {/if}
                    </div>
                  </CardContent>
                </Card>
              </div>
            {/each}
          {/if}
          
          <!-- Placeholder skeletons for remaining properties -->
          {#each Array(Math.min(4, Math.max(2, propertyCount - properties.length))) as _, i}
            <div class="animate-pulse">
              <Card class="overflow-hidden bg-card/50 border-border text-foreground h-[450px]">
                <div class="relative h-56 bg-muted-foreground/10">
                  <!-- Price skeleton -->
                  <div class="absolute bottom-4 left-4 bg-muted/50 h-7 w-20 rounded-md"></div>
                  
                  <!-- Score skeleton -->
                  <div class="absolute top-3 right-3 w-16 h-16 rounded-full bg-muted/50"></div>
                </div>
                <CardContent class="p-4 space-y-3">
                  <Skeleton class="h-6 w-3/4" />
                  <Skeleton class="h-4 w-1/2" />
                  <div class="flex flex-wrap gap-2 my-4">
                    <Skeleton class="h-5 w-16 rounded-full" />
                    <Skeleton class="h-5 w-24 rounded-full" />
                    <Skeleton class="h-5 w-20 rounded-full" />
                  </div>
                  <div class="flex items-start gap-2 mt-auto pt-3">
                    <div class="rounded-full bg-muted/50 h-5 w-5 mt-0.5"></div>
                    <Skeleton class="h-6 w-full" />
                  </div>
                </CardContent>
              </Card>
            </div>
          {/each}
        </div>
      {:else if properties.length > 0}
        <!-- Results state: Use the PropertyCard component from compare page with 2-column layout -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          {#each properties as property}
            <PropertyCard 
              property={property}
              on:select={handlePropertySelect}
            />
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
    
    <!-- Google Map Placeholder: Right side (40%) -->
    <div class="w-full lg:w-2/5">
      <div class="sticky top-6 rounded-xl overflow-hidden border border-border bg-card h-[calc(100vh-220px)] flex flex-col">
        <!-- Map header -->
        <div class="bg-primary/10 p-4 border-b border-border flex items-center gap-2">
          <MapPin class="h-5 w-5 text-primary" />
          <h3 class="font-medium text-foreground">Property Locations</h3>
        </div>
        
        <!-- Map placeholder -->
        <div class="relative flex-1 bg-muted/30 flex items-center justify-center">
          {#if properties.length > 0}
            <div class="text-center p-4">
              <div class="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin class="h-8 w-8 text-primary" />
              </div>
              <p class="text-foreground font-medium">View {properties.length} properties on map</p>
              <p class="text-sm text-muted-foreground mt-2">Map integration coming soon</p>
            </div>
          {:else}
            <div class="text-center p-4">
              <div class="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin class="h-8 w-8 text-muted-foreground" />
              </div>
              <p class="text-foreground font-medium">Map View</p>
              <p class="text-sm text-muted-foreground mt-2">Properties will appear here</p>
            </div>
          {/if}
        </div>
      </div>
    </div>
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