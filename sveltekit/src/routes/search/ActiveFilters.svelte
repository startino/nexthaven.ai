<!-- 
  ActiveFilters.svelte - Component to display active filters as removable tags
  Shows all selected filters along with their preference strength indicators
-->
<script lang="ts">
  import { X, SignalLow, SignalMedium, SignalHigh, ChevronRight, ChevronDown } from 'lucide-svelte';
  import { slide, fade } from 'svelte/transition';
  import { filterGroups, findFilterOptionById } from './filters';
  import type { PreferenceStrength } from './types';
  
  // Component props
  let { filters, preferenceStrength, onRemove } = $props<{
    filters: Record<string, string[] | null>;
    preferenceStrength: Record<string, PreferenceStrength>;
    onRemove: (groupId: string, filterId: string) => void;
  }>();
  
  // UI state
  let showAllFilters = $state(false);
  const MAX_VISIBLE_FILTERS = 5; // Maximum filters to show when collapsed
  
  // Count total active filters
  function getTotalFilterCount(): number {
    return Object.values(filters).reduce((total: number, filterArray) => 
      total + (Array.isArray(filterArray) ? filterArray.length : 0), 0);
  }
  
  // Get the label for a filter by ID
  function getFilterLabel(filterId: string): string {
    const option = findFilterOptionById(filterId);
    return option?.label || filterId;
  }
  
  // Get the group name by ID
  function getGroupName(groupId: string): string {
    const group = filterGroups.find(g => g.id === groupId);
    return group?.name || groupId;
  }
  
  // Get class for strength indicator
  function getStrengthClass(strength: PreferenceStrength): string {
    switch(strength) {
      case 'weak': return 'bg-primary/20 text-primary';
      case 'mid': return 'bg-primary/40 text-primary';
      case 'strong': return 'bg-primary/70 text-primary';
      default: return 'bg-primary/30 text-primary';
    }
  }
  
  // Get a shortened form of the strength label
  function getShortStrengthLabel(strength: PreferenceStrength): string {
    switch(strength) {
      case 'weak': return 'Low';
      case 'mid': return 'Med';
      case 'strong': return 'High';
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
  
  // Check if there are any active filters
  function hasActiveFilters(): boolean {
    return Object.entries(filters).some(
      ([_, value]) => value && (Array.isArray(value) ? value.length > 0 : !!value)
    );
  }
  
  // Get all filter entries as a flat array
  function getAllFilterEntries() {
    const entries: Array<{groupId: string, filterId: string}> = [];
    
    Object.entries(filters).forEach(([groupId, filterIds]) => {
      if (filterIds && Array.isArray(filterIds) && filterIds.length > 0) {
        filterIds.forEach(filterId => {
          entries.push({ groupId, filterId });
        });
      }
    });
    
    return entries;
  }
</script>

{#if hasActiveFilters()}
  <div class="flex flex-col my-4 mb-6">
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-medium text-muted-foreground">Active filters:</span>
      
      <!-- Clear all button -->
      <button 
        class="px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-full border border-dashed border-muted-foreground/40 transition-colors"
        onclick={() => {
          // Loop through all filters and remove them
          for (const [groupId, filterIds] of Object.entries(filters)) {
            if (filterIds && Array.isArray(filterIds)) {
              for (const filterId of [...filterIds]) {
                onRemove(groupId, filterId);
              }
            }
          }
        }}
      >
        Clear all
      </button>
    </div>
    
    <div class="flex flex-wrap gap-2">
      {#if getTotalFilterCount() > MAX_VISIBLE_FILTERS && !showAllFilters}
        {#each getAllFilterEntries().slice(0, MAX_VISIBLE_FILTERS) as { groupId, filterId }}
          <div 
            class="flex items-center gap-2 px-2.5 py-1 rounded-full bg-card border border-border/50 text-sm shadow-sm"
            transition:slide={{ duration: 150 }}
          >
            <span class="font-medium">{getFilterLabel(filterId)}</span>
            
            <!-- Strength indicator if available -->
            {#if preferenceStrength[filterId]}
              <span class={`text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1 ${getStrengthClass(preferenceStrength[filterId])}`}>
                <svelte:component this={getStrengthIcon(preferenceStrength[filterId])} size={12} />
              </span>
            {/if}
            
            <!-- Remove button -->
            <button 
              class="p-0.5 rounded-full hover:bg-muted/70"
              onclick={() => onRemove(groupId, filterId)}
              aria-label={`Remove ${getFilterLabel(filterId)} filter`}
            >
              <X size={14} />
            </button>
          </div>
        {/each}
        
        <!-- View more button -->
        <button 
          class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/50 text-sm hover:bg-muted transition-colors"
          onclick={() => showAllFilters = true}
        >
          +{getTotalFilterCount() - MAX_VISIBLE_FILTERS} more <ChevronDown size={14} />
        </button>
      {:else}
        {#each getAllFilterEntries() as { groupId, filterId }}
          <div 
            class="flex items-center gap-2 px-2.5 py-1 rounded-full bg-card border border-border/50 text-sm shadow-sm"
            transition:slide={{ duration: 150 }}
          >
            <span class="font-medium">{getFilterLabel(filterId)}</span>
            
            <!-- Strength indicator if available -->
            {#if preferenceStrength[filterId]}
              <span class={`text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1 ${getStrengthClass(preferenceStrength[filterId])}`}>
                <svelte:component this={getStrengthIcon(preferenceStrength[filterId])} size={12} />
              </span>
            {/if}
            
            <!-- Remove button -->
            <button 
              class="p-0.5 rounded-full hover:bg-muted/70"
              onclick={() => onRemove(groupId, filterId)}
              aria-label={`Remove ${getFilterLabel(filterId)} filter`}
            >
              <X size={14} />
            </button>
          </div>
        {/each}
        
        {#if getTotalFilterCount() > MAX_VISIBLE_FILTERS}
          <!-- Show less button -->
          <button 
            class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/50 text-sm hover:bg-muted transition-colors"
            onclick={() => showAllFilters = false}
          >
            Show less <ChevronRight size={14} />
          </button>
        {/if}
      {/if}
    </div>
  </div>
{/if} 