<script lang="ts">
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import FilterSidebar from './FilterSidebar.svelte';
  import ActiveFilters from './ActiveFilters.svelte';
  import { prepareSearchQuery } from './filters';
  
  // State for selected filters
  let selectedFilters = $state({
    propertyType: null as string | null,
    amenities: [] as string[],
    locationFeatures: [] as string[],
    accessibility: [] as string[],
    safetyFeatures: [] as string[],
    houseRules: [] as string[],
    rating: undefined as string | undefined
  });
  
  // State for other search params
  let destination = $state('');
  let dateRange = $state('');
  let budget = $state('600');
  let selectedRooms = $state(1);
  let preferences = $state('');
  let preferenceStrength = $state<Record<string, 'weak' | 'mid' | 'strong'>>({});
  
  // State for showing the actual query
  let searchQueryJson = $state('');
  
  // Function to remove a filter
  function removeFilter(groupId: string, filterId: string) {
    // Handle multi-select filters
    if (Array.isArray(selectedFilters[groupId as keyof typeof selectedFilters])) {
      const filterArray = selectedFilters[groupId as keyof typeof selectedFilters] as string[];
      selectedFilters[groupId as keyof typeof selectedFilters] = filterArray.filter(id => id !== filterId) as any;
    } 
    // Handle single-select filters
    else {
      selectedFilters[groupId as keyof typeof selectedFilters] = null as any;
    }
  }
  
  // Function to handle search
  function handleSearch() {
    searchQueryJson = prepareSearchQuery({
      destination,
      dateRange,
      budget,
      selectedRooms,
      preferences,
      selectedPropertyType: selectedFilters.propertyType,
      selectedAmenities: selectedFilters.amenities,
      selectedLocationFeatures: selectedFilters.locationFeatures,
      selectedAccessibility: selectedFilters.accessibility,
      selectedSafetyFeatures: selectedFilters.safetyFeatures,
      selectedHouseRules: selectedFilters.houseRules,
      selectedRating: selectedFilters.rating,
      preferenceStrength
    });
  }
</script>

<div class="flex flex-col py-6 lg:py-8">
  <div class="flex flex-1 overflow-hidden">
    <!-- Filter Sidebar -->
    <FilterSidebar
      {selectedFilters}
      {preferenceStrength}
    />
    
    <!-- Main Content Area -->
    <div class="flex-1 h-full">
      <ScrollArea class="h-full">
        <div class="p-5">
          <h1 class="text-2xl font-bold mb-6">Filter Example</h1>
          
          <!-- Display active filters -->
          <ActiveFilters 
            filters={selectedFilters}
            {preferenceStrength}
            onRemove={removeFilter}
          />
          
          <!-- Search Form -->
          <Card>
            <CardHeader>
              <CardTitle>Search Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="flex flex-col gap-4">
                <div>
                  <label class="text-sm font-medium mb-1 block">Destination</label>
                  <input
                    type="text"
                    bind:value={destination}
                    class="w-full p-2 border rounded-md"
                    placeholder="Where do you want to go?"
                  />
                </div>
                
                <div>
                  <label class="text-sm font-medium mb-1 block">Date Range</label>
                  <input
                    type="text"
                    bind:value={dateRange}
                    class="w-full p-2 border rounded-md"
                    placeholder="Next Month for 1 Week"
                  />
                </div>
                
                <div>
                  <label class="text-sm font-medium mb-1 block">Budget</label>
                  <input
                    type="range"
                    bind:value={budget}
                    min="100"
                    max="2000"
                    step="50"
                    class="w-full"
                  />
                  <div class="text-sm text-muted-foreground text-center">
                    ${budget} per night
                  </div>
                </div>
                
                <div>
                  <label class="text-sm font-medium mb-1 block">Preferences</label>
                  <textarea
                    bind:value={preferences}
                    class="w-full p-2 border rounded-md h-24"
                    placeholder="Describe what you're looking for..."
                  ></textarea>
                </div>
                
                <Button onclick={handleSearch}>Search</Button>
              </div>
            </CardContent>
          </Card>
          
          <!-- Show resulting query -->
          {#if searchQueryJson}
            <Card class="mt-6">
              <CardHeader>
                <CardTitle>Search Query</CardTitle>
              </CardHeader>
              <CardContent>
                <pre class="bg-muted p-4 rounded-md overflow-auto text-xs">
                  {JSON.stringify(JSON.parse(searchQueryJson), null, 2)}
                </pre>
              </CardContent>
            </Card>
          {/if}
        </div>
      </ScrollArea>
    </div>
  </div>
</div> 