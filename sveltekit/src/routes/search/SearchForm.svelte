<!-- 
  SearchForm.svelte - Handles user input for search criteria
  Includes destination, dates, preferences as tags, and search button
-->
<script lang="ts">
  import { Calendar, MessageSquare, Search, Clock, Check, AlertCircle, Sparkle, X, Plus, Tag, Heart, TrendingUp, Edit2, Pen, DollarSign } from 'lucide-svelte';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { formatDateRange, parseDateRange, isValidDate, calculateStartDate } from './dateHelpers';
  import { savePreference } from './preferences';
  import type { SavedPreference, SearchFormParams } from './types';
  import { slide, fade } from 'svelte/transition';
  import { onMount } from 'svelte';
  import type { DateRange } from "bits-ui";
  import { CalendarDate, DateFormatter, type DateValue, getLocalTimeZone, today } from "@internationalized/date";
  import { cn } from "$lib/utils.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { RangeCalendar } from "$lib/components/ui/range-calendar/index.js";
  import { LocationCombobox } from "$lib/components/ui/combobox";
  import { PUBLIC_GOOGLE_MAPS_API_KEY } from '$env/static/public';
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { getTopFavoriteTags, trackTagsUsage } from './favourite-filters';
  import { Slider } from '$lib/components/ui/slider';
  import { searchQuotaState } from '$lib/stores/search-quota.svelte';
  import * as Select from '$lib/components/ui/select';

  // Get props using Svelte 5 syntax
  let {
    destination = '',
    dateRange = '',
    budget = '600',
    selectedRooms = 1,
    preferences = $bindable(''),
    isLoading = false,
    previousPreferences = [],
    onSubmit = () => {},
  } = $props();
  
  // UI state
  let showPreviousPreferences = $state(false);
  let dateError = $state<string | null>(null);
  let showDebug = $state(false);
  let showTagInput = $state(false);
  let tagInputValue = $state('');
  let selectedTags = $state<string[]>([]);
  let editingTagIndex = $state<number | null>(null);
  let favoriteUserTags = $state<string[]>([]);
  
  // Create a filtered list of preferences with no duplicates
  let uniquePreferences = $derived(() => {
    // Use a Map to track unique preference texts
    const uniquePrefs = new Map();
    // Keep only the latest occurrence of each preference text
    [...previousPreferences].reverse().forEach(pref => {
      if (!uniquePrefs.has(pref.text)) {
        uniquePrefs.set(pref.text, pref);
      }
    });
    // Convert back to array and reverse to maintain original order (newest first)
    return Array.from(uniquePrefs.values()).reverse();
  });
  
  // Price range slider state
  let priceRange = $state<[number, number]>([100, 300]);
  const MIN_PRICE_NIGHTLY = 0;
  const MAX_PRICE_NIGHTLY = 250;
  const MIN_PRICE_TOTAL = 0;
  const MAX_PRICE_TOTAL = 5000;
  const PRICE_STEP_NIGHTLY = 10;
  const PRICE_STEP_TOTAL = 100;
  
  // Budget calculation mode (nightly or total)
  let isTotalBudget = $state(false);
  
  // Define preset tags
  const presetTagCategories = $state([
    {
      name: 'Your Favorites',
      icon: Heart,
      tags: [] // Will be populated from favoriteUserTags
    },
    {
      name: 'Most Popular',
      icon: TrendingUp,
      tags: ['Condo', 'Studio apartment', 'Hostel', 'Co-living', 'Modern & clean', 'Rustic & cozy', 'Modern bathroom', 'High-speed WiFi', 'Pool', 'Quiet neighborhood', 'Hardwood floors', 'Private balcony']
    },
    {
      name: 'Others',
      icon: Tag,
      tags: ['Open floor plan', 'Furnished', 'Pet friendly', 'Washer/dryer', 'Walk-in closet']
    }
  ]);
  
  // Additional tags that can be shown with "Show more"
  const additionalOtherTags = $state([
    'Waterfront', 'Mountain view', 'Elevator access', 'Doorman', 'Parking included', 
    'EV charging', 'Energy efficient', 'Wheelchair accessible', 'Fitness center', 
    'Rooftop deck', 'Storage space', 'Bike storage', 'Clubhouse', 'Tennis court',
    'Business center', 'Guest parking', 'Concierge service', 'Smart home',
    'Pool access', 'Garden view', 'Garage included', 'Stainless steel appliances',
    'Air conditioning', 'Heating', 'Fireplace', 'Game room', 'Movie room',
    'Hot tub', 'Sauna', 'Near subway', 'Near bus stop', 'Near hospital'
  ]);
  
  // Number of additional tags to show at a time
  const TAGS_PER_PAGE = 11;
  
  // State to track how many additional tags are currently shown
  let visibleAdditionalTags = $state(0);
  
  // State to track if we're showing additional tags
  let showAdditionalTags = $state(false);
  
  // Function to toggle additional tags
  function toggleAdditionalTags() {
    if (!showAdditionalTags) {
      // First time showing tags - start with initial batch
      showAdditionalTags = true;
      if (visibleAdditionalTags === 0) {
        visibleAdditionalTags = TAGS_PER_PAGE;
      }
    } else {
      // Already showing some tags
      if (hasMoreTagsToShow()) {
        // Show more tags
        visibleAdditionalTags += TAGS_PER_PAGE;
      } else {
        // All tags are shown, hide them
        showAdditionalTags = false;
        visibleAdditionalTags = 0;
      }
    }
  }
  
  // Compute the list of additional tags that should be visible
  function getVisibleAdditionalTags() {
    return additionalOtherTags.slice(0, visibleAdditionalTags);
  }
  
  // Check if there are more tags to show
  function hasMoreTagsToShow() {
    return visibleAdditionalTags < additionalOtherTags.length;
  }
  
  // Update favorite tags category when the favorites list changes
  $effect(() => {
    presetTagCategories[0].tags = favoriteUserTags;
  });
  
  // Set up DateFormatter for displaying dates
  const df = new DateFormatter("en-US", {
    dateStyle: "medium"
  });

  // Create calendar state
  let calendarValue: DateRange | undefined = $state(undefined);
  let startValue: DateValue | undefined = $state(undefined);
  let minDate = today(getLocalTimeZone());

  // Format price value for display with dollar sign
  function formatPrice(value: number): string {
    return `$${value.toLocaleString()}`;
  }
  
  // Format raw values for the slider (without dollar sign)
  function formatRawPrice(value: number): string {
    return value.toLocaleString();
  }
  
  // Get current min, max, and step values based on budget type
  function getCurrentPriceConstraints() {
    return {
      min: isTotalBudget ? MIN_PRICE_TOTAL : MIN_PRICE_NIGHTLY,
      max: isTotalBudget ? MAX_PRICE_TOTAL : MAX_PRICE_NIGHTLY,
      step: isTotalBudget ? PRICE_STEP_TOTAL : PRICE_STEP_NIGHTLY
    };
  }
  
  // Update price range when switching between nightly and total
  function updateBudgetType(isTotal: boolean) {
    if (isTotal !== isTotalBudget) {
      isTotalBudget = isTotal;
      
      // Adjust the price range based on the new budget type
      if (isTotal) {
        // Convert from nightly to total (rough estimation)
        const avgNights = 7; // assume average 7 night stay
        priceRange = [
          Math.min(priceRange[0] * avgNights, MAX_PRICE_TOTAL), 
          Math.min(priceRange[1] * avgNights, MAX_PRICE_TOTAL)
        ];
      } else {
        // Convert from total to nightly (rough estimation)
        const avgNights = 7; // assume average 7 night stay
        priceRange = [
          Math.min(Math.max(Math.round(priceRange[0] / avgNights), MIN_PRICE_NIGHTLY), MAX_PRICE_NIGHTLY),
          Math.min(Math.max(Math.round(priceRange[1] / avgNights), MIN_PRICE_NIGHTLY), MAX_PRICE_NIGHTLY)
        ];
      }
    }
  }
  
  // Parse budget string into price range and budget type
  function parseBudget(budgetStr: string): { range: [number, number], isTotal: boolean } {
    if (!budgetStr) {
      return { 
        range: [100, 300], 
        isTotal: false 
      }; // Default values for nightly
    }
    
    // Check if budget has type indicator
    const isTotal = budgetStr.includes('total:');
    const cleanBudgetStr = budgetStr.replace('total:', '').replace('nightly:', '');
    
    // Check if it's a range format like "500-3000"
    if (cleanBudgetStr.includes('-')) {
      const [minStr, maxStr] = cleanBudgetStr.split('-');
      const min = parseInt(minStr);
      const max = parseInt(maxStr);
      
      if (!isNaN(min) && !isNaN(max)) {
        const currentConstraints = isTotal ? 
          { min: MIN_PRICE_TOTAL, max: MAX_PRICE_TOTAL } : 
          { min: MIN_PRICE_NIGHTLY, max: MAX_PRICE_NIGHTLY };
          
        return {
          range: [
            Math.max(currentConstraints.min, min),
            Math.min(currentConstraints.max, max)
          ],
          isTotal
        };
      }
    }
    
    // If it's a single value, treat it as max budget
    const singleValue = parseInt(cleanBudgetStr);
    if (!isNaN(singleValue)) {
      const currentConstraints = isTotal ? 
        { min: MIN_PRICE_TOTAL, max: MAX_PRICE_TOTAL } : 
        { min: MIN_PRICE_NIGHTLY, max: MAX_PRICE_NIGHTLY };
        
      return {
        range: [currentConstraints.min, Math.min(currentConstraints.max, singleValue)],
        isTotal
      };
    }
    
    return { 
      range: isTotal ? [1000, 5000] : [100, 300], 
      isTotal 
    }; // Different defaults based on type
  }
  
  // Format budget string for the backend
  function formatBudgetForBackend(range: [number, number], isTotal: boolean): string {
    // Note: We support both nightly and total budgets in the UI
    // But the API will convert nightly to total based on number of nights
    const prefix = isTotal ? 'total:' : 'nightly:';
    
    // Get current constraints
    const currentMin = isTotal ? MIN_PRICE_TOTAL : MIN_PRICE_NIGHTLY;
    const currentMax = isTotal ? MAX_PRICE_TOTAL : MAX_PRICE_NIGHTLY;
    
    // Ensure we have valid numbers for min and max - force as integers
    const min = Number.isFinite(range[0]) ? Math.max(currentMin, Math.floor(range[0])) : currentMin;
    const max = Number.isFinite(range[1]) ? Math.min(currentMax, Math.floor(range[1])) : currentMax;
    
    // Ensure min is not greater than max
    const validMin = Math.min(min, max);
    const validMax = Math.max(min, max);
    
    // Return properly formatted budget string
    return `${prefix}${validMin}-${validMax}`;
  }
  
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

    // Initialize price range from budget if available
    if (budget) {
      const parsedBudget = parseBudget(budget);
      priceRange = parsedBudget.range;
      isTotalBudget = parsedBudget.isTotal;
    }
    
    // Debug mode
    if (import.meta.env.DEV) {
      console.log('Google Maps API Key:', PUBLIC_GOOGLE_MAPS_API_KEY);
    }
    
    // Parse any existing preferences into tags
    if (preferences.trim()) {
      const prefTags = preferences.split(',').map((tag: string) => tag.trim()).filter(Boolean);
      selectedTags = prefTags;
    }

    // Load favorite tags from localStorage
    loadFavoriteTags();
  });

  // Function to load favorite tags
  function loadFavoriteTags() {
    favoriteUserTags = getTopFavoriteTags(7);
  }

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
  
  // Update preferences string when tags change
  $effect(() => {
    preferences = selectedTags.join(', ');
  });
  
  // Effect to prevent search when limit is reached
  $effect(() => {
    if (searchQuotaState.hasReachedLimit) {
      // If limit is reached, we'll disable search functionality
      console.log('Anonymous user has reached search limit, disabling search form');
      
      // Disable all interactive form elements when limit is reached
      setTimeout(() => {
        // This runs after the component is updated
        const form = document.querySelector('form') as HTMLFormElement;
        if (form) {
          // Find all interactive elements
          const interactiveElements = form.querySelectorAll('button, input, select, textarea');
          // Disable them
          interactiveElements.forEach(el => {
            if (el instanceof HTMLElement) {
              el.setAttribute('disabled', 'true');
              el.style.pointerEvents = 'none';
            }
          });
        }
      }, 0);
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
  
  function addTag(tag: string, isPresetTag = false) {
    // Don't add empty tags
    if (!tag.trim()) {
      return;
    }
    
    // Process multiple comma-separated tags
    if (tag.includes(',')) {
      const tags = tag.split(',');
      // Add all non-empty tags
      for (let i = 0; i < tags.length; i++) {
        const tagToAdd = tags[i].trim();
        if (tagToAdd && !selectedTags.includes(tagToAdd)) {
          if (editingTagIndex !== null && i === 0) {
            // Replace the first tag with the edited one
            const newTags = [...selectedTags];
            newTags[editingTagIndex] = tagToAdd;
            selectedTags = newTags;
          } else {
            // Add additional tags
            selectedTags = [...selectedTags, tagToAdd];
          }
        }
      }
      // Reset editing state
      editingTagIndex = null;
    } else {
      // Single tag processing
      const trimmedTag = tag.trim();
      // Skip if it's a duplicate
      if (selectedTags.includes(trimmedTag)) {
        editingTagIndex = null;
        return;
      }
      
      if (editingTagIndex !== null) {
        // Replace the tag being edited
        const newTags = [...selectedTags];
        newTags[editingTagIndex] = trimmedTag;
        selectedTags = newTags;
        editingTagIndex = null;
      } else {
        // Add a new tag
        selectedTags = [...selectedTags, trimmedTag];
      }
    }
    
    // Clear input for custom tags
    tagInputValue = '';
    
    // Only keep input visible if we're not editing a tag
    if (editingTagIndex === null) {
      showTagInput = true; // Keep input visible for additional tags
    }
    
    // If this was a preset tag, track its usage immediately
    if (isPresetTag) {
      trackTagsUsage([tag.trim()]);
      loadFavoriteTags();
    }
  }

  function handleTagInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    
    // Check for comma to create a new tag
    if (value.includes(',')) {
      const tags = value.split(',');
      // Add all non-empty tags
      for (let i = 0; i < tags.length - 1; i++) {
        if (tags[i].trim()) {
          addTag(tags[i]);
        }
      }
      // Keep the text after the last comma in the input
      tagInputValue = tags[tags.length - 1];
    }
  }
  
  function removeTag(tag: string) {
    selectedTags = selectedTags.filter(t => t !== tag);
  }
  
  function editTag(index: number) {
    editingTagIndex = index;
    tagInputValue = selectedTags[index];
    showTagInput = true;
    
    // Focus on the input after it's rendered
    setTimeout(() => {
      const input = document.querySelector('[data-tag-input]') as HTMLInputElement;
      if (input) {
        input.focus();
        // Place cursor at end
        input.selectionStart = input.selectionEnd = input.value.length;
      }
    }, 0);
  }
  
  function cancelEditing() {
    editingTagIndex = null;
    tagInputValue = '';
    showTagInput = false;
  }
  
  function handleCustomTagKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (tagInputValue.trim()) {
        addTag(tagInputValue);
      }
    } else if (event.key === 'Escape') {
      cancelEditing();
    }
  }
  
  function handleTagContainerClick() {
    if (!showTagInput) {
      showTagInput = true;
      setTimeout(() => {
        const input = document.querySelector('[data-tag-input]') as HTMLInputElement;
        if (input) input.focus();
      }, 0);
    }
  }

  function handleTagDoubleClick(index: number) {
    // Set the editing index and update the input value
    editingTagIndex = index;
    tagInputValue = selectedTags[index];
  }
  
  function handleTagEdit(event: KeyboardEvent, index: number) {
    // Save the edited tag on Enter or when losing focus
    if (event.key === 'Enter') {
      event.preventDefault();
      const target = event.target as HTMLInputElement;
      if (target.value.trim()) {
        // Use our improved addTag function which handles comma-separated values
        addTag(target.value);
      } else {
        // If the tag is empty, just remove it
        removeTag(selectedTags[index]);
        editingTagIndex = null;
      }
    } else if (event.key === 'Escape') {
      // Cancel editing
      editingTagIndex = null;
    }
  }

  function handleTagEditBlur(event: FocusEvent, index: number) {
    const target = event.target as HTMLInputElement;
    if (target.value.trim()) {
      // Use our improved addTag function
      addTag(target.value);
    } else {
      // If the tag is empty, just remove it
      removeTag(selectedTags[index]);
      editingTagIndex = null;
    }
  }
  
  function selectPreviousPreference(text: string) {
    // Convert previous preferences to tags
    const tags = text.split(',').map((tag: string) => tag.trim()).filter(Boolean);
    selectedTags = [...new Set([...selectedTags, ...tags])];
    showPreviousPreferences = false;
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
  
  // Update budget string when price range changes
  $effect(() => {
    budget = formatBudgetForBackend(priceRange, isTotalBudget);
  });
  
  // Handler for saving the preference and submitting the form
  function handleSubmit(e?: Event) {
    // Prevent default form submission if called from a form event
    if (e) e.preventDefault();
    
    // Validate date before submitting
    if (dateRange && !isValidDate(dateRange)) {
      dateError = "Please enter a valid date format or select from time period options";
      return;
    }
    
    dateError = null;
    
    // Clean up destination text if needed
    if (destination) {
      destination = destination.trim();
    }
    
    // Track the used tags to update favorite tags
    if (selectedTags.length > 0) {
      trackTagsUsage(selectedTags);
      // Reload the favorite tags to show the updated list next time
      loadFavoriteTags();
    }
    
    // Get current constraints
    const currentMin = isTotalBudget ? MIN_PRICE_TOTAL : MIN_PRICE_NIGHTLY;
    const currentMax = isTotalBudget ? MAX_PRICE_TOTAL : MAX_PRICE_NIGHTLY;
    
    // Validate price range before formatting
    const validPriceRange: [number, number] = [
      Number.isFinite(priceRange[0]) ? Math.max(currentMin, Math.floor(priceRange[0])) : currentMin,
      Number.isFinite(priceRange[1]) ? Math.min(currentMax, Math.floor(priceRange[1])) : currentMax
    ];
    
    // Ensure min is not greater than max
    if (validPriceRange[0] > validPriceRange[1]) {
      validPriceRange[0] = validPriceRange[1];
    }
    
    // Log the raw price range for debugging
    console.log('Price range before formatting:', validPriceRange, typeof validPriceRange[0], typeof validPriceRange[1]);
    
    // Update budget with current price range values and budget type
    budget = formatBudgetForBackend(validPriceRange, isTotalBudget);
    
    // Double-check for valid format of budget string - add failsafe
    if (!budget.match(/^(nightly|total):\d+-\d+$/)) {
      console.error('Invalid budget format detected, using fallback values:', budget);
      budget = isTotalBudget ? 'total:1000-5000' : 'nightly:100-250';
    }
    
    // Log the budget string for debugging
    console.log('Submitting with budget:', budget);
    
    // Save the preference if it's non-empty and proceed with submission
    if (preferences.trim()) {
      savePreference(preferences, previousPreferences);
    }
    
    // Actually pass all form parameters to parent component's submit handler
    onSubmit({
      destination,
      dateRange,
      budget,
      selectedRooms,
      preferences,
      selectedPropertyType: null,
      selectedAmenities: []
    });
  }
  
  // Open the previous preferences dropdown
  function togglePreviousPreferences() {
    if (previousPreferences.length) {
      showPreviousPreferences = !showPreviousPreferences;
    }
  }
  
  // Add and remove the event listener when the component mounts/unmounts
  $effect(() => {
    if (showPreviousPreferences) {
      const handleClickOutside = (event: MouseEvent) => {
        if (!(event.target as Element).closest('[data-preference-item]') && 
            !(event.target as Element).closest('[data-previous-preferences-btn]')) {
          showPreviousPreferences = false;
        }
      };
      
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

  // Add a function to clear all tags
  function clearAllTags() {
    selectedTags = [];
    showTagInput = true;
    setTimeout(() => {
      const input = document.querySelector('[data-tag-input]') as HTMLInputElement;
      if (input) input.focus();
    }, 0);
  }
  
  // Function to handle previous preference selection via Select component
  function handlePreviousPreferenceChange(selected: { value: string, label?: string } | undefined) {
    if (selected?.value) {
      selectPreviousPreference(selected.value);
    }
  }
</script>

<form class="grid grid-cols-1 gap-5">

  <!-- When & Where Section - Now as individual boxes -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <!-- Date Selection Box -->
    <div class="border rounded-md p-4 bg-card">
      <div class="flex items-center gap-2 mb-3">
        <Calendar class="h-5 w-5 text-primary" />
        <h3 class="font-medium">When</h3>
        <span class="ml-auto text-sm text-muted-foreground">Choose your stay dates</span>
      </div>
      
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
    </div>
    
    <!-- Location Selection Box -->
    <div class="border rounded-md p-4 bg-card">
      <div class="flex items-center gap-2 mb-3">
        <Search class="h-5 w-5 text-primary" />
        <h3 class="font-medium">Where</h3>
        <span class="ml-auto text-sm text-muted-foreground">Enter your destination</span>
      </div>
      
      <div class="relative">
        <LocationCombobox 
          bind:value={destination}
          placeholder="Location..."
          onSelect={handleLocationSelect}
          class="h-12"
        />

      </div>
    </div>
  </div>

    <!-- Budget Range Slider - Moved to the top -->
    <div class="border rounded-md p-4 bg-card">
      <div class="flex items-center gap-2 mb-3">
        <DollarSign class="h-5 w-5 text-primary" />
        <h3 class="font-medium">Budget Range</h3>
        <span class="ml-auto text-sm text-muted-foreground">Drag the the slider to set your budget</span>
      </div>
      
      <!-- Tab-like system for nightly vs total -->
      <div class="mb-5 max-w-xl">
        <div class="grid grid-cols-2 w-full gap-4">
          <button
            type="button"
            onclick={() => updateBudgetType(false)}
            class={cn(
              "py-2.5 text-sm font-medium transition-colors rounded-full",
              !isTotalBudget 
                ? "bg-primary text-primary-foreground" 
                : "bg-primary/10 text-muted-foreground hover:bg-muted/80"
            )}
          >
            Nightly
          </button>
          <button 
            type="button"
            onclick={() => updateBudgetType(true)}
            class={cn(
              "py-2.5 text-sm font-medium transition-colors rounded-full",
              isTotalBudget 
                ? "bg-primary text-primary-foreground" 
                : "bg-primary/10 text-muted-foreground hover:bg-primary/20"
            )}
          >
            Total
          </button>
        </div>
        
        <div class="pt-5">
          <Slider 
            class=" px-4 pt-1"
            bind:value={priceRange}
            min={isTotalBudget ? MIN_PRICE_TOTAL : MIN_PRICE_NIGHTLY}
            max={isTotalBudget ? MAX_PRICE_TOTAL : MAX_PRICE_NIGHTLY}
            step={isTotalBudget ? PRICE_STEP_TOTAL : PRICE_STEP_NIGHTLY}
            formatValue={formatRawPrice}
          />
        
        </div>
      </div>
    </div>
  
  {#if showDebug && import.meta.env.DEV}
    <div class="bg-muted p-3 rounded-md text-xs">
      <div><strong>Google Maps API Key:</strong> {PUBLIC_GOOGLE_MAPS_API_KEY || 'Not set'}</div>
      <div><strong>Current destination value:</strong> {destination || 'Not set'}</div>
      <div><strong>Current price range:</strong> {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}</div>
      <div><strong>Budget string:</strong> {budget}</div>
      <div class="mt-2">
        <strong>Favorite Tags Debug:</strong>
        <div class="flex gap-2 mt-1">
          <Button 
            variant="outline" 
            size="sm" 
            class="h-6 text-xs"
            onclick={() => { 
              const demoTags = ['Modern kitchen', 'Spacious rooms', 'Hardwood floors'];
              trackTagsUsage(demoTags);
              loadFavoriteTags();
            }}
          >
            Add Demo Tags
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            class="h-6 text-xs"
            onclick={() => { 
              import('./favourite-filters').then(module => {
                module.clearFavoriteTags();
                loadFavoriteTags();
              });
            }}
          >
            Clear Favorites
          </Button>
        </div>
        <div class="mt-1"><strong>Current favorite tags:</strong> {favoriteUserTags.join(', ') || 'None'}</div>
      </div>
    </div>
  {/if}
  
  <div class="border rounded-md p-4 bg-card">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Sparkle class="h-5 w-5 text-primary" />
        <h3 class="font-medium">Your Unique Preferences</h3>
      </div>
      
      <div class="flex items-center gap-2">
        {#if selectedTags.length > 0}
        <Button 
          variant="ghost" 
          size="sm"
          onclick={clearAllTags}
          class="h-6 text-xs text-muted-foreground hover:text-primary"
        >
          Clear all
        </Button>
        {/if}
        {#if previousPreferences.length > 0}
          <Select.Root onSelectedChange={handlePreviousPreferenceChange}>
            <Select.Trigger class="text-xs h-8 gap-1 px-2 w-[220px]">
              <Clock class="h-4 w-4" />
              <span>Previous</span>
            </Select.Trigger>
            <Select.Content class="w-[500px]">
              <Select.Label>Previous preferences</Select.Label>
              <Select.Separator />
              <ScrollArea class="h-[200px]">
                {#each uniquePreferences as preference}
                  <Select.Item 
                    value={preference.text} 
                    label={preference.text}
                    class="flex justify-between items-start gap-3 w-full"
                  >
                    <p class="text-sm line-clamp-2">{preference.text}</p>
                  </Select.Item>
                {/each}
              </ScrollArea>
            </Select.Content>
          </Select.Root>
        {/if}
      </div>
    </div>
    
    <!-- Tag input area -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
      class="relative border rounded-md px-3 py-2 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-colors cursor-text"
      onclick={handleTagContainerClick}
    >
      <div class="flex flex-wrap gap-2 items-center min-h-[38px]">
        {#each selectedTags as tag, index}
          {#if editingTagIndex === index}
            <!-- Inline edit mode for the tag - improved for better responsive behavior -->
            <div class="inline-flex rounded-full bg-primary text-secondary-foreground border border-primary shadow-sm transition-all">
              <Input 
                value={tag}
                class="border-0 shadow-none focus-visible:ring-0 h-8 text-md text-primary-foreground min-w-[80px] w-full p-0 px-2.5 rounded-full"
                style="width: calc({tag.length}ch + 4ch);" 
                autofocus
                onkeydown={(e) => handleTagEdit(e, index)}
                onblur={(e) => handleTagEditBlur(e, index)}
                data-tag-editing
              />
            </div>
          {:else}
            <Badge  
              class={cn(
                "flex items-center gap-1.5 py-1.5 pl-3 pr-2 text-sm group cursor-pointer transition-colors",
                editingTagIndex !== null && editingTagIndex !== index ? "opacity-50" : ""
              )}
              ondblclick={() => handleTagDoubleClick(index)}
            >
              <span>{tag}</span>
              <div class="flex items-center gap-0.5">
                <Button 
                  variant="ghost"
                  size="icon"
                  onclick={(e: MouseEvent) => {
                    e.stopPropagation();
                    handleTagDoubleClick(index);
                  }}
                  class="h-6 w-6 p-1 mx-0.5"
                  aria-label={`Edit ${tag} tag`}
                >
                  <Pen class="" />
                </Button>
                <Button 
                  variant="ghost"
                  size="icon"
                  onclick={(e: MouseEvent) => {
                    e.stopPropagation();
                    removeTag(tag);
                  }}
                  class="h-6 w-6 p-1 mx-0.5"
                  aria-label={`Remove ${tag} tag`}
                >
                  <X class="" />
                </Button>
              </div>
            </Badge>
          {/if}
        {/each}
        
        {#if showTagInput && editingTagIndex === null}
          <Input 
            bind:value={tagInputValue}
            placeholder={selectedTags.length > 0 ? "Add or edit tag... (use Enter or comma)" : "Add your own unique tags like 'no tile floor' or 'king-size bed'..."}
            onkeydown={handleCustomTagKeydown}
            oninput={handleTagInput}
            class="border-0 shadow-none focus-visible:ring-0 flex-1 h-8 min-w-[180px] text-sm"
            data-tag-input
          />
        {:else if selectedTags.length === 0}
          <span class="text-muted-foreground text-sm">Add tags like 'modern kitchen', 'pet friendly'...</span>
        {/if}
      </div>
    </div>
    <p class="text-xs text-muted-foreground mt-1">Double-click to edit tags directly or use Enter/comma to add multiple</p>
    
    <!-- Suggested tags section - now below the tag input -->
    <div class="mt-3 border rounded-md p-3 pt-2 bg-background/50">
      <!-- Preset tag categories -->
      <ScrollArea class="max-h-[220px] sm:max-h-[280px] md:max-h-[320px]">
        <div class="space-y-4 pr-2">
          {#each presetTagCategories as category, categoryIndex}
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <svelte:component this={category.icon} class="h-3.5 w-3.5" />
                  <span>{category.name}</span>
                </div>
                
                <!-- Show more button for the "Others" category -->
                {#if categoryIndex === 2}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onclick={toggleAdditionalTags}
                    class="h-5 text-[10px] py-0 px-2 text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {#if !showAdditionalTags}
                      <Plus class="h-3 w-3" />
                      Show tags
                    {:else if hasMoreTagsToShow()}
                      <Plus class="h-3 w-3" />
                      Show more ({additionalOtherTags.length - visibleAdditionalTags})
                    {:else}
                      <X class="h-3 w-3" />
                      Hide extra
                    {/if}
                  </Button>
                {/if}
              </div>
              
              {#if categoryIndex === 0 && category.tags.length === 0}
                <div class="text-xs text-muted-foreground px-2 py-1">
                  Your most used tags will appear here as you search.
                </div>
              {:else}
                <div class="flex flex-wrap gap-1.5">
                  {#each category.tags as tag}
                    <button 
                      onclick={() => addTag(tag, true)}
                      class={cn(
                        "px-2 py-1 rounded-full text-xs border transition-colors",
                        selectedTags.includes(tag) 
                          ? "bg-primary/10 border-primary/20 text-primary" 
                          : "bg-background border-border hover:bg-primary/5 hover:border-primary/10"
                      )}
                      disabled={selectedTags.includes(tag)}
                    >
                      {#if selectedTags.includes(tag)}
                        <Check class="inline-block h-3 w-3 mr-1" />
                      {/if}
                      {tag}
                    </button>
                  {/each}
                  
                  <!-- Additional tags for "Others" category -->
                  {#if categoryIndex === 2 && showAdditionalTags}
                    <div transition:slide={{ duration: 200 }} class="w-full flex flex-wrap gap-1.5 pt-1.5 mt-1.5 border-t border-border/30">
                      {#each getVisibleAdditionalTags() as tag, i}
                        <button 
                          transition:fade|local={{ duration: 150, delay: i * 20 }}
                          onclick={() => addTag(tag, true)}
                          class={cn(
                            "px-2 py-1 rounded-full text-xs border transition-colors",
                            selectedTags.includes(tag) 
                              ? "bg-primary/10 border-primary/20 text-primary" 
                              : "bg-background border-border hover:bg-primary/5 hover:border-primary/10"
                          )}
                          disabled={selectedTags.includes(tag)}
                        >
                          {#if selectedTags.includes(tag)}
                            <Check class="inline-block h-3 w-3 mr-1" />
                          {/if}
                          {tag}
                        </button>
                      {/each}
                      
                      {#if !hasMoreTagsToShow() && additionalOtherTags.length > 0}
                        <div transition:fade|local class="w-full text-[10px] text-muted-foreground/70 text-center mt-2 italic">
                          All {additionalOtherTags.length} tags shown
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </ScrollArea>
    </div>
  </div>

  <Button 
    type="submit"
    onclick={handleSubmit}
    class={cn(
      "h-12 mt-1 text-base"
    )}
    disabled={!destination || !dateRange || dateError !== null || isLoading}
  >
    <Search class={searchQuotaState.hasReachedLimit ? "h-0 w-0" : "h-5 w-5 mr-2"} />
    {#if searchQuotaState.isAnonymous}
      Use Your Free Search
    {:else}
      Discover Properties
    {/if}
  </Button>

  {#if searchQuotaState.isAnonymous}
    <div class="mt-3 text-xs flex items-center gap-1.5" class:text-yellow-500={searchQuotaState.remainingSearches > 1} class:text-amber-600={searchQuotaState.remainingSearches === 1} class:text-red-500={searchQuotaState.hasReachedLimit}>
      <AlertCircle class="h-3.5 w-3.5" />
      {#if searchQuotaState.hasReachedLimit}
        <span>You've used your free search as an anonymous user. <a href="/signup" class="font-medium underline">Create an account</a> to get a full 14-day trial with unlimited searches.</span>
      {:else if searchQuotaState.remainingSearches === 1}
        <span>This is your last free search as an anonymous user. <a href="/signup" class="font-medium underline">Create an account</a> for unlimited searches.</span>
      {:else}
        <span>You have {searchQuotaState.remainingSearches} search{searchQuotaState.remainingSearches !== 1 ? 'es' : ''} remaining as an anonymous user.</span>
      {/if}
    </div>
  {/if}
</form> 