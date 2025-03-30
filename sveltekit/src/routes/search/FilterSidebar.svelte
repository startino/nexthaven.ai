<script lang="ts">
  import { Home, Coffee, Check, X, ChevronDown, ChevronUp, SignalLow, SignalMedium, SignalHigh, Filter, Pencil } from 'lucide-svelte';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { slide, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { filterGroups, findFilterOptionById } from './filters';
  import type { PreferenceStrength } from './types';
  import { Dialog, DialogContent, DialogTitle, DialogDescription } from '$lib/components/ui/dialog';
  import { createEventDispatcher } from 'svelte';
	import { Button } from '$lib/components/ui/button';
  
  // State props
  let { selectedFilters, preferenceStrength, activePreferenceModal } = $props<{
    selectedFilters: Record<string, string[] | null>;
    preferenceStrength: Record<string, PreferenceStrength>;
    activePreferenceModal: string | null;
  }>();
  
  // UI state
  let expandedCategories = $state<string[]>([
    'property-type', 
    'amenities'
  ]);
  
  // Active filters dialog state
  let showActiveFiltersDialog = $state(false);
  
  // Event dispatcher
  const dispatch = createEventDispatcher<{
    filterChange: Record<string, string[]>;
  }>();
  
  // Filter categories and options with interface matching FilterGroup
  const filterCategories = [
    {
      id: 'property-type',
      name: 'Property Type',
      icon: 'home',
      description: 'Select property types you are interested in',
      multiSelect: true,
      showStrength: true,
      options: [
        { id: 'house', label: 'House', icon: 'home', description: 'A standalone residential building' },
        { id: 'apartment', label: 'Apartment', icon: 'building', description: 'A residential unit in a building' },
        { id: 'condo', label: 'Condo', icon: 'building-2', description: 'An apartment you own' },
        { id: 'villa', label: 'Villa', icon: 'castle', description: 'A luxury home with amenities' }
      ]
    },
    {
      id: 'amenities',
      name: 'Amenities',
      icon: 'coffee',
      description: 'Select amenities important to you',
      multiSelect: true,
      showStrength: true,
      options: [
        { id: 'pool', label: 'Pool', icon: 'pool', description: 'Private or shared swimming pool' },
        { id: 'wifi', label: 'WiFi', icon: 'wifi', description: 'High-speed internet access' },
        { id: 'kitchen', label: 'Kitchen', icon: 'utensils', description: 'Full kitchen facilities' },
        { id: 'ac', label: 'Air Conditioning', icon: 'snowflake', description: 'Climate control' }
      ]
    }
    // Add more filter categories as needed
  ];
  
  // Toggle filter selection
  function toggleFilter(groupId: string, filterId: string) {
    const group = filterGroups.find(g => g.id === groupId);
    
    if (!group) return;
    
    // Initialize the filter array if it doesn't exist
    if (!selectedFilters[groupId]) {
      selectedFilters[groupId] = [];
    }
    
    const filters = selectedFilters[groupId] as string[];
    
    if (filters.includes(filterId)) {
      // Remove filter if already selected
      selectedFilters[groupId] = filters.filter(id => id !== filterId);
      
      // Clear the preference modal if it was open for this filter
      if (activePreferenceModal === `${groupId}:${filterId}`) {
        activePreferenceModal = null;
      }
    } else {
      // Add filter to selection
      selectedFilters[groupId] = [...filters, filterId];
      
      // Open preference modal for newly selected filter
      if (group.showStrength) {
        activePreferenceModal = `${groupId}:${filterId}`;
        
        // Initialize preference strength if not set
        if (!preferenceStrength[filterId]) {
          preferenceStrength[filterId] = 'mid';
        }
      }
    }

    // Dispatch the updated filters
    dispatch('filterChange', selectedFilters as Record<string, string[]>);
  }

  // Set preference strength for a filter
  function setPreferenceStrength(filterId: string, strength: PreferenceStrength) {
    preferenceStrength[filterId] = strength;
    // Auto-close popup after selection
    activePreferenceModal = null;
  }
  
  // Toggle category expansion
  function toggleCategory(categoryId: string) {
    if (expandedCategories.includes(categoryId)) {
      expandedCategories = expandedCategories.filter(id => id !== categoryId);
    } else {
      expandedCategories = [...expandedCategories, categoryId];
    }
  }
  
  // Helper to get strength label
  function getStrengthLabel(strength: PreferenceStrength): string {
    switch(strength) {
      case 'weak': return 'Low strength';
      case 'mid': return 'Medium strength';
      case 'strong': return 'High strength';
      default: return '';
    }
  }
  
  // Get the strength icon component
  function getStrengthIcon(strength: PreferenceStrength) {
    switch(strength) {
      case 'weak': return SignalLow;
      case 'mid': return SignalMedium;
      case 'strong': return SignalHigh;
      default: return SignalLow;
    }
  }
  
  // Check if a filter is selected
  function isFilterSelected(groupId: string, filterId: string): boolean {
    if (!selectedFilters[groupId]) return false;
    return (selectedFilters[groupId] as string[]).includes(filterId);
  }
  
  // Handle keyboard interaction for category headers
  function handleCategoryKeydown(event: KeyboardEvent, categoryId: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleCategory(categoryId);
    }
  }
  
  // Handle keyboard interaction for modal overlay
  function handleOverlayKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activePreferenceModal = null;
    }
  }
  
  // Count total active filters
  function getTotalActiveFilters(): number {
    let count = 0;
    for (const groupId in selectedFilters) {
      if (selectedFilters[groupId]) {
        count += (selectedFilters[groupId] as string[]).length;
      }
    }
    return count;
  }
  
  // Get all active filters with their details
  function getActiveFiltersWithDetails() {
    const activeFilters = [];
    
    for (const groupId in selectedFilters) {
      if (selectedFilters[groupId] && (selectedFilters[groupId] as string[]).length > 0) {
        const group = filterGroups.find(g => g.id === groupId);
        if (!group) continue;
        
        for (const filterId of selectedFilters[groupId] as string[]) {
          const option = group.options.find(o => o.id === filterId);
          if (option) {
            activeFilters.push({
              groupId,
              groupName: group.name,
              filterId,
              filterLabel: option.label,
              strength: preferenceStrength[filterId] || 'mid'
            });
          }
        }
      }
    }
    
    return activeFilters;
  }

  // Handle filter selection - use our toggleFilter function
  function toggleFilterCategory(categoryId: string, optionId: string) {
    toggleFilter(categoryId, optionId);
  }
</script>

<div class="w-[280px] min-w-[280px] max-w-xs h-full border-r border-border sticky top-0 z-10 bg-background">
  <ScrollArea class="h-[calc(100vh-2rem)]">
    <div class="p-6">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-xl font-medium text-foreground">Filters</h2>
        
        <!-- Active Filters Button -->
        <button 
          class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
          onclick={() => showActiveFiltersDialog = true}
          aria-label="Show active filters"
          title="Manage active filters"
        >
          <Filter size={14} class="text-primary" />
          <span class="text-primary font-medium">{getTotalActiveFilters()}</span>
        </button>
      </div>
      
      <!-- Add explanatory text about filter strengths -->
      <p class="text-xs text-muted-foreground mb-8">
        You can set the strength of each filter to indicate how important it is to your search.
      </p>
      
      <!-- Loop through filter groups -->
      {#each filterCategories as category}
        <div class="mb-8">
          <!-- Category header -->
          <button 
            class="w-full flex items-center justify-between mb-4 py-1 group"
            onclick={() => toggleCategory(category.id)}
            onkeydown={(e) => handleCategoryKeydown(e, category.id)}
            aria-expanded={expandedCategories.includes(category.id)}
            aria-controls={`filter-group-${category.id}`}
          >
            <div class="flex items-center gap-2">
              {#if category.icon}
                <span class="text-muted-foreground">{@html `<svg width="18" height="18" class="lucide lucide-${category.icon}"><use href="#${category.icon}"></use></svg>`}</span>
              {/if}
              <h3 class="text-md font-medium text-foreground">{category.name}</h3>
            </div>
            
            <span class="text-muted-foreground">
              {#if expandedCategories.includes(category.id)}
                <ChevronUp size={18} />
              {:else}
                <ChevronDown size={18} />
              {/if}
            </span>
          </button>
          
          <!-- Filter options -->
          {#if expandedCategories.includes(category.id)}
            <div id={`filter-group-${category.id}`} class="space-y-3" transition:slide={{ duration: 200, easing: cubicOut }}>
              {#each category.options as option}
                <div class="relative">
                  <!-- Selected filter strength indicator -->
                  {#if isFilterSelected(category.id, option.id) && preferenceStrength[option.id]}
                    <div 
                      class="mb-2 px-1 text-xs text-primary flex justify-between items-center" 
                      transition:fade={{ duration: 150 }}
                    >
                      <div class="flex items-center gap-1">
                        <svelte:component this={getStrengthIcon(preferenceStrength[option.id])} size={12} class={preferenceStrength[option.id] === 'weak' ? 'text-primary/70' : preferenceStrength[option.id] === 'mid' ? 'text-primary/85' : 'text-primary'} />
                        <span>{getStrengthLabel(preferenceStrength[option.id])}</span>
                      </div>
                      <button 
                        class="hover:bg-muted p-0.5 rounded-full"
                        onclick={() => toggleFilter(category.id, option.id)}
                        aria-label="Clear selection"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  {/if}
                  
                  <!-- Filter option button -->
                  <button
                    class={`w-full p-3.5 text-left rounded-md text-sm hover:bg-background/30 transition cursor-pointer
                      ${isFilterSelected(category.id, option.id)
                        ? 'bg-primary/10 border border-primary/30 font-medium' 
                        : 'bg-card'}`}
                    onclick={() => toggleFilterCategory(category.id, option.id)}
                    aria-pressed={isFilterSelected(category.id, option.id)}
                    aria-label={`Select ${option.label} filter`}
                  >
                    <div class="flex justify-between items-center">
                      <div class="flex items-center gap-3 overflow-hidden">
                        {#if option.icon}
                          <span class="shrink-0">{@html `<svg width="16" height="16" class="lucide lucide-${option.icon}"><use href="#${option.icon}"></use></svg>`}</span>
                        {/if}
                        <span class="truncate">{option.label}</span>
                      </div>
                      {#if isFilterSelected(category.id, option.id)}
                        <Check size={16} class="text-primary shrink-0" />
                      {/if}
                    </div>
                  </button>
                  
                  <!-- Preference strength modal -->
                  {#if activePreferenceModal === `${category.id}:${option.id}`}
                    <div 
                      class="fixed inset-0 bg-black/20 z-30"
                      transition:fade={{ duration: 100 }}
                      onclick={() => activePreferenceModal = null}
                      onkeydown={handleOverlayKeydown}
                      role="dialog"
                      aria-label="Set preference strength"
                      tabindex="0"
                    ></div>
                    
                    <div 
                      class="absolute z-40 top-full left-0 mt-2 w-full bg-card rounded-md shadow-lg border border-border overflow-hidden"
                      transition:slide={{ duration: 150, easing: cubicOut }}
                    >
                      <button 
                        class={`w-full p-3 text-left text-sm ${preferenceStrength[option.id] === 'weak' ? 'bg-primary/10 text-primary' : 'hover:bg-background/30'}`}
                        onclick={() => setPreferenceStrength(option.id, 'weak')}
                        aria-pressed={preferenceStrength[option.id] === 'weak'}
                      >
                        <div class="flex justify-between items-center">
                          <div class="flex items-center gap-2">
                            <SignalLow size={14} class="text-primary/80" />
                            <span>Low strength</span>
                          </div>
                          {#if preferenceStrength[option.id] === 'weak'}
                            <Check size={14} />
                          {/if}
                        </div>
                      </button>
                      <button 
                        class={`w-full p-3 text-left text-sm ${preferenceStrength[option.id] === 'mid' ? 'bg-primary/20 text-primary' : 'hover:bg-background/30'}`}
                        onclick={() => setPreferenceStrength(option.id, 'mid')}
                        aria-pressed={preferenceStrength[option.id] === 'mid'}
                      >
                        <div class="flex justify-between items-center">
                          <div class="flex items-center gap-2">
                            <SignalMedium size={14} class="text-primary/90" />
                            <span>Medium strength</span>
                          </div>
                          {#if preferenceStrength[option.id] === 'mid'}
                            <Check size={14} />
                          {/if}
                        </div>
                      </button>
                      <button 
                        class={`w-full p-3 text-left text-sm ${preferenceStrength[option.id] === 'strong' ? 'bg-primary/30 text-primary' : 'hover:bg-background/30'}`}
                        onclick={() => setPreferenceStrength(option.id, 'strong')}
                        aria-pressed={preferenceStrength[option.id] === 'strong'}
                      >
                        <div class="flex justify-between items-center">
                          <div class="flex items-center gap-2">
                            <SignalHigh size={14} class="text-primary" />
                            <span>High strength</span>
                          </div>
                          {#if preferenceStrength[option.id] === 'strong'}
                            <Check size={14} />
                          {/if}
                        </div>
                      </button>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </ScrollArea>
</div>

<!-- Active Filters Dialog -->
<Dialog bind:open={showActiveFiltersDialog}>
  <DialogContent class="sm:max-w-[500px]">
    <DialogTitle>Active Filters ({getTotalActiveFilters()})</DialogTitle>
    <DialogDescription>
      Manage your currently selected filters
    </DialogDescription>
    
    <div class="mt-4 max-h-[60vh] overflow-y-auto pr-2">
      {#if getTotalActiveFilters() === 0}
        <div class="py-8 text-center text-muted-foreground">
          <p>No filters selected</p>
          <p class="text-sm mt-2">Add filters to refine your search results</p>
        </div>
      {:else}
        <div class="space-y-4">
          {#each filterCategories as category}
            {#if selectedFilters[category.id] && (selectedFilters[category.id] as string[]).length > 0}
              <div class="border-b border-border pb-4 last:border-0">
                <h4 class="font-medium mb-3 flex items-center gap-2">
                  {#if category.icon}
                    <span class="text-muted-foreground">{@html `<svg width="16" height="16" class="lucide lucide-${category.icon}"><use href="#${category.icon}"></use></svg>`}</span>
                  {/if}
                  {category.name}
                </h4>
                
                <div class="space-y-2">
                  {#each selectedFilters[category.id] as filterId}
                    {#if category.options.find(o => o.id === filterId)}
                      {@const option = category.options.find(o => o.id === filterId)}
                      <div class="flex items-center justify-between bg-card p-3 rounded-md">
                        <div class="flex items-center gap-2">
                          {#if option?.icon}
                            <span class="shrink-0">{@html `<svg width="16" height="16" class="lucide lucide-${option.icon}"><use href="#${option.icon}"></use></svg>`}</span>
                          {/if}
                          <span>{option?.label}</span>
                          
                          {#if preferenceStrength[filterId]}
                            <div class="flex items-center gap-1 ml-2 text-xs text-primary">
                              <svelte:component this={getStrengthIcon(preferenceStrength[filterId])} size={12} class={preferenceStrength[filterId] === 'weak' ? 'text-primary/70' : preferenceStrength[filterId] === 'mid' ? 'text-primary/85' : 'text-primary'} />
                              <span>{getStrengthLabel(preferenceStrength[filterId])}</span>
                            </div>
                          {/if}
                        </div>
                        
                        <div class="flex items-center gap-2">
                          {#if category.showStrength}
                            <button 
                              class="p-1.5 hover:bg-muted rounded-md"
                              onclick={() => {
                                activePreferenceModal = `${category.id}:${filterId}`;
                                showActiveFiltersDialog = false;
                              }}
                              aria-label="Change strength"
                              title="Edit filter strength"
                            >
                              <Pencil size={14} class="text-muted-foreground" />
                            </button>
                          {/if}
                          
                          <button 
                            class="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-md"
                            onclick={() => toggleFilter(category.id, filterId)}
                            aria-label="Remove filter"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    {/if}
                  {/each}
                </div>
              </div>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
    
    {#if getTotalActiveFilters() > 0}
      <div class="flex justify-end gap-2 mt-4">
        <Button 
          variant="destructive"
          class=""
          onclick={() => {
            for (const groupId in selectedFilters) {
              selectedFilters[groupId] = [];
            }
            showActiveFiltersDialog = false;
          }}
        >
          Clear All
        </Button>
        <Button 
          variant="default"
          class=""
          onclick={() => showActiveFiltersDialog = false}
        >
          Done
        </Button>
      </div>
    {/if}
  </DialogContent>
</Dialog> 