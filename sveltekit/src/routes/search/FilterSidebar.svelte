<!-- 
  FilterSidebar.svelte - A comprehensive sidebar component for displaying and managing filters 
  This component replaces PropertyTypeSidebar.svelte and supports all filter categories
-->
<script lang="ts">
  import { Home, Coffee, Check, X, ChevronDown, ChevronUp, SignalLow, SignalMedium, SignalHigh } from 'lucide-svelte';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { slide, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { filterGroups, findFilterOptionById } from './filters';
  import type { PreferenceStrength } from './types';
  
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
      case 'weak': return 'Low priority';
      case 'mid': return 'Medium priority';
      case 'strong': return 'High priority';
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
</script>

<div class="w-[280px] min-w-[280px] max-w-xs h-full border-r border-border sticky top-0 z-10 bg-background">
  <ScrollArea class="h-[calc(100vh-2rem)]">
    <div class="p-6">
      <h2 class="text-xl font-medium text-foreground mb-8">Filters</h2>
      
      <!-- Loop through filter groups -->
      {#each filterGroups as group}
        <div class="mb-8">
          <!-- Category header -->
          <button 
            class="w-full flex items-center justify-between mb-4 py-1 group"
            onclick={() => toggleCategory(group.id)}
            onkeydown={(e) => handleCategoryKeydown(e, group.id)}
            aria-expanded={expandedCategories.includes(group.id)}
            aria-controls={`filter-group-${group.id}`}
          >
            <div class="flex items-center gap-2">
              {#if group.icon}
                <span class="text-muted-foreground">{@html `<svg width="18" height="18" class="lucide lucide-${group.icon}"><use href="#${group.icon}"></use></svg>`}</span>
              {/if}
              <h3 class="text-md font-medium text-foreground">{group.name}</h3>
            </div>
            
            <span class="text-muted-foreground">
              {#if expandedCategories.includes(group.id)}
                <ChevronUp size={18} />
              {:else}
                <ChevronDown size={18} />
              {/if}
            </span>
          </button>
          
          <!-- Filter options -->
          {#if expandedCategories.includes(group.id)}
            <div id={`filter-group-${group.id}`} class="space-y-3" transition:slide={{ duration: 200, easing: cubicOut }}>
              {#each group.options as option}
                <div class="relative">
                  <!-- Selected filter strength indicator -->
                  {#if isFilterSelected(group.id, option.id) && preferenceStrength[option.id]}
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
                        onclick={() => toggleFilter(group.id, option.id)}
                        aria-label="Clear selection"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  {/if}
                  
                  <!-- Filter option button -->
                  <button
                    class={`w-full p-3.5 text-left rounded-md text-sm hover:bg-background/30 transition cursor-pointer
                      ${isFilterSelected(group.id, option.id)
                        ? 'bg-primary/10 border border-primary/30 font-medium' 
                        : 'bg-card'}`}
                    onclick={() => toggleFilter(group.id, option.id)}
                    aria-pressed={isFilterSelected(group.id, option.id)}
                    aria-label={`Select ${option.label} filter`}
                  >
                    <div class="flex justify-between items-center">
                      <div class="flex items-center gap-3 overflow-hidden">
                        {#if option.icon}
                          <span class="shrink-0">{@html `<svg width="16" height="16" class="lucide lucide-${option.icon}"><use href="#${option.icon}"></use></svg>`}</span>
                        {/if}
                        <span class="truncate">{option.label}</span>
                      </div>
                      {#if isFilterSelected(group.id, option.id)}
                        <Check size={16} class="text-primary shrink-0" />
                      {/if}
                    </div>
                    {#if option.description}
                      <p class="text-xs text-muted-foreground mt-2">{option.description}</p>
                    {/if}
                  </button>
                  
                  <!-- Preference strength modal -->
                  {#if activePreferenceModal === `${group.id}:${option.id}`}
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
                      <div class="p-3 text-xs text-muted-foreground border-b border-border">
                        Set importance
                      </div>
                      <button 
                        class={`w-full p-3 text-left text-sm ${preferenceStrength[option.id] === 'weak' ? 'bg-primary/10 text-primary' : 'hover:bg-background/30'}`}
                        onclick={() => setPreferenceStrength(option.id, 'weak')}
                        aria-pressed={preferenceStrength[option.id] === 'weak'}
                      >
                        <div class="flex justify-between items-center">
                          <div class="flex items-center gap-2">
                            <SignalLow size={14} class="text-primary/80" />
                            <span>Low priority</span>
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
                            <span>Medium priority</span>
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
                            <span>High priority</span>
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