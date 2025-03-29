<script lang="ts">
  import { Calendar, MapPin, MessageSquare, Search } from 'lucide-svelte';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Button } from '$lib/components/ui/button';
  import { handleSearch } from './searchData';
  import { formatDateRange, parseDateRange } from './dateHelpers';
  import { savePreference } from './preferences';

  // Form inputs  
  let { destination, dateRange, budget, selectedRooms, preferences, 
        selectedPropertyType, selectedAmenities, preferenceStrength,
        previousPreferences } = $props<{
    destination: string;
    dateRange: string;
    budget: string;
    selectedRooms: number;
    preferences: string;
    selectedPropertyType: string | null;
    selectedAmenities: string[];
    preferenceStrength: Record<string, 'weak' | 'mid' | 'strong'>;
    previousPreferences: Array<{ id: number; date: string; preferences: string }>;
  }>();
  
  function handleDateRangeBlur() {
    const result = parseDateRange(dateRange);
    if (result.timeFrame || result.duration) {
      // Update the parent component's state through the binding
      // The actual update happens in the parent component
    }
  }
  
  function submitSearch() {
    handleSearch({
      destination,
      dateRange,
      budget,
      selectedRooms,
      preferences,
      selectedPropertyType,
      selectedAmenities,
      preferenceStrength,
      savePreference: () => {
        previousPreferences = savePreference(preferences, previousPreferences);
      }
    });
  }
</script>

<div class="grid grid-cols-1 gap-4">
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <div class="relative">
      <Calendar class="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
      <Input 
        type="text" 
        placeholder="Check-in - Check-out"
        value={dateRange}
        oninput={(e: Event) => dateRange = (e.target as HTMLInputElement).value}
        onblur={handleDateRangeBlur}
        class="h-12 pl-10"
      />
    </div>
    
    <div class="relative">
      <MapPin class="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
      <Input 
        type="text" 
        placeholder="Location..."
        value={destination}
        oninput={(e: Event) => destination = (e.target as HTMLInputElement).value}
        class="h-12 pl-10"
      />
    </div>
  </div>
  
  <div class="relative">
    <MessageSquare class="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
    <Textarea 
      value={preferences}
      placeholder="Tell us what you're looking for... (e.g., 'A cozy mountain cabin with a hot tub and amazing views, perfect for a romantic getaway')"
      oninput={(e: Event) => preferences = (e.target as HTMLTextAreaElement).value}
      class="w-full h-[120px] pl-10 py-3"
    />
  </div>

  <Button 
    onclick={submitSearch}
    class="h-12 button-gradient mt-2"
    disabled={!destination || !dateRange}
  >
    <Search class="h-5 w-5 mr-2" />
    Discover Properties
  </Button>
</div> 