<!-- 
  SearchForm.svelte - Handles user input for search criteria
  Includes destination, dates, preferences, and search button
-->
<script lang="ts">
  import { Calendar, MessageSquare, Search, Clock, Check, AlertCircle, Sparkle } from 'lucide-svelte';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Button } from '$lib/components/ui/button';
  import { formatDateRange, parseDateRange, isValidDate, calculateStartDate } from './dateHelpers';
  import { savePreference } from './preferences';
  import type { SavedPreference } from './types';
  import { slide } from 'svelte/transition';
  import { onMount } from 'svelte';
  import type { DateRange } from "bits-ui";
  import { CalendarDate, DateFormatter, type DateValue, getLocalTimeZone, today } from "@internationalized/date";
  import { cn } from "$lib/utils.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { RangeCalendar } from "$lib/components/ui/range-calendar/index.js";
  import { LocationCombobox } from "$lib/components/ui/combobox";
  import { PUBLIC_GOOGLE_MAPS_API_KEY } from '$env/static/public';

  // Form inputs  
  let { destination = $bindable(''), dateRange = $bindable(''), budget = $bindable(''), 
        selectedRooms = $bindable(1), preferences = $bindable(''), 
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
  let dateError = $state<string | null>(null);
  let showDebug = $state(false);
  
  // Set up DateFormatter for displaying dates
  const df = new DateFormatter("en-US", {
    dateStyle: "medium"
  });

  // Create calendar state
  let calendarValue: DateRange | undefined = $state(undefined);
  let startValue: DateValue | undefined = $state(undefined);
  let minDate = today(getLocalTimeZone());

  // Initialize calendar with the minimum date but no default selection
  onMount(() => {
    // We no longer set default dates here
    // Just parse any existing dateRange if it exists
    if (dateRange && isValidDate(dateRange)) {
      try {
        const parsed = parseDateRange(dateRange);
        
        if (parsed.startDate && parsed.endDate) {
          const startDate = new Date(parsed.startDate);
          const endDate = new Date(parsed.endDate);
          
          calendarValue = {
            start: new CalendarDate(
              startDate.getFullYear(), 
              startDate.getMonth() + 1, 
              startDate.getDate()
            ),
            end: new CalendarDate(
              endDate.getFullYear(), 
              endDate.getMonth() + 1, 
              endDate.getDate()
            )
          };
        }
      } catch (e) {
        console.error("Failed to parse existing date range", e);
      }
    }

    // Debug mode
    if (import.meta.env.DEV) {
      console.log('Google Maps API Key:', PUBLIC_GOOGLE_MAPS_API_KEY);
    }
  });

  // Update calendar value when dateRange changes
  $effect(() => {
    if (dateRange && isValidDate(dateRange)) {
      try {
        const parsed = parseDateRange(dateRange);
        
        if (parsed.startDate && parsed.endDate) {
          const startDate = new Date(parsed.startDate);
          const endDate = new Date(parsed.endDate);
          
          calendarValue = {
            start: new CalendarDate(
              startDate.getFullYear(), 
              startDate.getMonth() + 1, 
              startDate.getDate()
            ),
            end: new CalendarDate(
              endDate.getFullYear(), 
              endDate.getMonth() + 1, 
              endDate.getDate()
            )
          };
        } else {
          // Handle timeFrame and duration based dates
          let startDate: Date;
          let endDate: Date;
          
          if (parsed.timeFrame) {
            const startDateStr = calculateStartDate(parsed.timeFrame);
            startDate = new Date(startDateStr);
          } else {
            startDate = new Date();
          }
          
          // Calculate end date based on duration
          endDate = new Date(startDate);
          if (parsed.duration) {
            if (parsed.duration === '1 Week') {
              endDate.setDate(startDate.getDate() + 7);
            } else if (parsed.duration === '1 Month') {
              endDate.setMonth(startDate.getMonth() + 1);
            } else if (parsed.duration === '3 Months') {
              endDate.setMonth(startDate.getMonth() + 3);
            }
          } else {
            // Default to 1 week if no duration specified
            endDate.setDate(startDate.getDate() + 7);
          }
          
          calendarValue = {
            start: new CalendarDate(
              startDate.getFullYear(), 
              startDate.getMonth() + 1, 
              startDate.getDate()
            ),
            end: new CalendarDate(
              endDate.getFullYear(), 
              endDate.getMonth() + 1, 
              endDate.getDate()
            )
          };
        }
      } catch (e) {
        console.error("Failed to parse date range", e);
      }
    }
  });

  // Update dateRange when calendar value changes
  $effect(() => {
    if (calendarValue && calendarValue.start) {
      try {
        const start = calendarValue.start.toDate(getLocalTimeZone());
        let formattedRange = df.format(start);
        
        if (calendarValue.end) {
          const end = calendarValue.end.toDate(getLocalTimeZone());
          formattedRange += ` - ${df.format(end)}`;
        }
        
        dateRange = formattedRange;
        dateError = null;
      } catch (e) {
        console.error("Failed to format date range", e);
      }
    }
  });
  
  function handleDateRangeBlur() {
    // Clear any previous error
    dateError = null;
    
    // Validate date
    if (dateRange && !isValidDate(dateRange)) {
      dateError = "Please enter a valid date format or select from time period options";
      return;
    }
    
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
  
  // Handler for saving the preference and submitting the form
  function handleSubmit() {
    // Validate date before submitting
    if (dateRange && !isValidDate(dateRange)) {
      dateError = "Please enter a valid date format or select from time period options";
      return;
    }
    
    dateError = null;
    
    // Save the preference if it's non-empty and proceed with submission
    if (preferences.trim()) {
      savePreference(preferences, previousPreferences);
    }
    
    // Actually submit the form
    onSubmit();
  }
  
  // Close the previous preferences dropdown when clicking outside of it
  function handleClickOutside(event: MouseEvent) {
    if (textareaElement && !textareaElement.contains(event.target as Node) && 
        !(event.target as Element).closest('[data-preference-item]')) {
      showPreviousPreferences = false;
    }
  }
  
  // Open the previous preferences dropdown when focusing on the textarea
  function handleTextareaFocus() {
    if (previousPreferences.length) {
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
  
  // Handle location selection
  function handleLocationSelect(location: { description: string; place_id: string }) {
    console.log('Location selected:', location);
    destination = location.description;
    console.log('Destination updated to:', destination);
  }

  // Toggle debug mode
  function toggleDebug() {
    showDebug = !showDebug;
  }
</script>

<div class="grid grid-cols-1 gap-5">
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <div class="relative">
      <Popover.Root>
        <Popover.Trigger asChild let:builder>
          <Button
            variant="outline"
            class={cn(
              "w-full h-12 justify-start text-left hover:bg-primary/10 hover:text-muted-foreground",
              !dateRange && "text-muted-foreground",
              dateError && "border-red-500 focus:ring-red-500"
            )}
            builders={[builder]}
          >
            <Calendar class="mr-2 h-5 w-5 text-muted-foreground" />
            {#if dateRange}
              {dateRange}
            {:else}
              Check-in - Check-out
            {/if}
          </Button>
        </Popover.Trigger>
        <Popover.Content class="w-auto p-3" align="start">
          <div class="space-y-3">
            <RangeCalendar
              bind:value={calendarValue}
              bind:startValue
              initialFocus
              numberOfMonths={2}
              minValue={minDate}
            />
          </div>
        </Popover.Content>
      </Popover.Root>
      {#if dateError}
        <div class="text-red-500 text-sm mt-1 flex items-center gap-1.5">
          <AlertCircle size={14} />
          <span>{dateError}</span>
        </div>
      {/if}
    </div>
    
    <div class="relative">
      <LocationCombobox 
        bind:value={destination}
        placeholder="Location..."
        onSelect={handleLocationSelect}
        class="h-12"
      />
      <!-- {#if import.meta.env.DEV}
        <button 
          class="absolute right-0 -bottom-6 text-xs text-muted-foreground hover:text-primary"
          onclick={toggleDebug}
        >
          Debug
        </button>
      {/if} -->
    </div>
  </div>
  
  {#if showDebug && import.meta.env.DEV}
    <div class="bg-muted p-3 rounded-md text-xs">
      <div><strong>Google Maps API Key:</strong> {PUBLIC_GOOGLE_MAPS_API_KEY || 'Not set'}</div>
      <div><strong>Current destination value:</strong> {destination || 'Not set'}</div>
    </div>
  {/if}
  
  <div class="relative" bind:this={textareaElement}>
    <Sparkle class="absolute left-4 top-3 h-5 w-5 text-muted-foreground" />
    <Textarea 
      bind:value={preferences}
      placeholder="Write your personal, potentially strange... preferences here... (if you couldn't find the right filter)"
      onfocus={handleTextareaFocus}
      class="w-full pl-12 py-3 text-base resize-none hover:bg-primary/10"
    />
<!--     
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
    {/if} -->
  </div>

  <Button 
    onclick={handleSubmit}
    class="h-12 button-gradient mt-1 text-base"
    disabled={!destination || !dateRange || dateError !== null}
    data-debug={`dest:${!!destination} date:${!!dateRange} err:${dateError !== null}`}
  >
    <Search class="h-5 w-5 mr-2" />
    Discover Properties
  </Button>
</div> 