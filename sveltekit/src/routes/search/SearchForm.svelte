<!-- 
  SearchForm.svelte - Handles user input for search criteria
  Includes destination, dates, preferences, and search button
-->
<script lang="ts">
  import { Calendar, MapPin, MessageSquare, Search, Clock, Check } from 'lucide-svelte';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Button } from '$lib/components/ui/button';
  import { formatDateRange, parseDateRange } from './dateHelpers';
  import { savePreference } from './preferences';
  import type { SavedPreference } from './types';
  import { slide } from 'svelte/transition';
  import { onMount } from 'svelte';

  // Form inputs  
  let { destination, dateRange, budget, selectedRooms, preferences, 
        previousPreferences, onSubmit } = $props<{
    destination: string;
    dateRange: string;
    budget: string;
    selectedRooms: number;
    preferences: string;
    previousPreferences: SavedPreference[];
    onSubmit: () => Promise<void>;
  }>();
  
  // UI state
  let showPreviousPreferences = $state(false);
  let textareaElement: HTMLElement;
  
  function handleDateRangeBlur() {
    const result = parseDateRange(dateRange);
    if (result.timeFrame || result.duration) {
      // Update the parent component's state through the binding
      // The actual update happens in the parent component
    }
  }
  
  function selectPreviousPreference(text: string) {
    preferences = text;
    showPreviousPreferences = false;
    // Focus on the textarea container
    setTimeout(() => {
      if (textareaElement) {
        const textarea = textareaElement.querySelector('textarea');
        if (textarea) textarea.focus();
      }
    }, 10);
  }
  
  function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  async function handleSubmit() {
    // Save current preference if not empty
    if (preferences.trim()) {
      previousPreferences = savePreference(preferences, previousPreferences);
    }
    
    // Call the parent's submit function
    await onSubmit();
  }
  
  // Function to handle clicks outside the preferences dropdown
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as Node;
    if (showPreviousPreferences && textareaElement && !textareaElement.contains(target)) {
      // Check if the click is inside a previous preference item
      const wasPreferenceItemClick = (event.target as HTMLElement).closest('[data-preference-item]');
      if (!wasPreferenceItemClick) {
        showPreviousPreferences = false;
      }
    }
  }
  
  // Function to handle focus on the textarea
  function handleTextareaFocus() {
    if (previousPreferences.length > 0) {
      showPreviousPreferences = true;
    }
  }
  
  // Add and remove the event listener when the component mounts/unmounts
  $effect(() => {
    if (showPreviousPreferences) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  });
</script>

<div class="grid grid-cols-1 gap-5">
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <div class="relative">
      <Calendar class="absolute left-4 top-3 h-5 w-5 text-muted-foreground" />
      <Input 
        type="text" 
        placeholder="Check-in - Check-out"
        value={dateRange}
        oninput={(e: Event) => dateRange = (e.target as HTMLInputElement).value}
        onblur={handleDateRangeBlur}
        class="h-12 pl-12 text-base"
      />
    </div>
    
    <div class="relative">
      <MapPin class="absolute left-4 top-3 h-5 w-5 text-muted-foreground" />
      <Input 
        type="text" 
        placeholder="Location..."
        value={destination}
        oninput={(e: Event) => destination = (e.target as HTMLInputElement).value}
        class="h-12 pl-12 text-base"
      />
    </div>
  </div>
  
  <div class="relative" bind:this={textareaElement}>
    <MessageSquare class="absolute left-4 top-3 h-5 w-5 text-muted-foreground" />
    <Textarea 
      value={preferences}
      placeholder="Tell us what you're looking for... (e.g., 'A cozy mountain cabin with a hot tub and amazing views')"
      oninput={(e: Event) => preferences = (e.target as HTMLTextAreaElement).value}
      onfocus={handleTextareaFocus}
      class="w-full h-[70px] pl-12 py-3 text-base resize-none"
    />
    
    {#if showPreviousPreferences && previousPreferences.length > 0}
      <div 
        class="absolute left-0 right-0 top-full mt-1 bg-card z-10 border rounded-md shadow-md max-h-[200px] overflow-y-auto"
        transition:slide={{ duration: 150 }}
      >
        <div class="p-2 border-b text-xs text-muted-foreground flex items-center gap-2">
          <Clock size={14} />
          <span>Previous preferences</span>
        </div>
        
        <div class="divide-y">
          {#each previousPreferences as preference}
            <button 
              data-preference-item
              class="w-full text-left p-3 hover:bg-muted/50 transition-colors"
              onclick={() => selectPreviousPreference(preference.text)}
            >
              <div class="flex justify-between items-start gap-3">
                <p class="text-sm line-clamp-2">{preference.text}</p>
                <span class="text-xs text-muted-foreground shrink-0 mt-0.5">{formatTimestamp(preference.timestamp)}</span>
              </div>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <Button 
    onclick={handleSubmit}
    class="h-12 button-gradient mt-1 text-base"
    disabled={!destination || !dateRange}
  >
    <Search class="h-5 w-5 mr-2" />
    Discover Properties
  </Button>
</div> 