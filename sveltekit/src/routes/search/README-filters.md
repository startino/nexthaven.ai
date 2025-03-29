# Rentino Filter System

This document explains how to use the enhanced centralized filter system in Rentino. The system is designed to be scalable, allowing for easy addition of new filters as the application grows.

## Structure

The filter system consists of several key files:

- `filters.ts`: Central file containing all filter definitions, groups, and helper functions
- `types.ts`: Type definitions for the search and filter system
- `FilterSidebar.svelte`: Comprehensive component for displaying all filter groups in a sidebar
- `ActiveFilters.svelte`: Component to display selected filters as removable tags

## Key Features

- **Multi-Select Filters**: All filter categories allow selecting multiple options
- **Preference Strength**: Users can set importance levels for any filter (weak/mid/strong)
- **Strength Indicators**: Visual signal icons with varying opacity to indicate preference strength
- **Collapsible Filter Display**: "View all" toggle for when there are many active filters
- **Sticky Sidebar**: The filter sidebar stays fixed while the main content scrolls
- **Collapsible Categories**: Filter groups can be expanded/collapsed for better UX
- **Clear Selection Indicators**: Selected items are clearly marked with visual indicators
- **Type Safety**: Full TypeScript support with proper type definitions
- **Scalable Architecture**: Easily add new filter categories as needed
- **Compact UI**: Space-efficient UI with appropriate proportions

## Available Filter Categories

The filter system now includes the following categories:

1. **Property Type**: House, apartment, villa, boutique hotel, etc.
2. **Property Style**: Modern, rustic, cozy, minimalist, traditional, bohemian, elegant
3. **Amenities**: Pool, gym, parking, wifi, kitchen, etc.
4. **Nearby Attractions**: Beach, gym, co-working, city center, nomad hotspots
5. **View Type**: Ocean, mountain, city, garden, lake, park, landmark
6. **Privacy Level**: Private room, entire place, shared room
7. **Surroundings**: Quiet, lively, residential, tourist area
8. **Safety Rating**: Based on neighborhood statistics
9. **Review Consideration**: Weak, normal, strong
10. **Verified Stay Status**: Confirmed guest reviews only
11. **Recent Review Timeframe**: Last 3/6/12 months
12. **Flooring**: Tiles, wood, marble, carpet, concrete, laminate
13. **Accessibility Features**: Step-free access, wide doorways, etc.
14. **Safety Features**: Smoke alarm, carbon monoxide alarm, etc.
15. **House Rules**: Pets allowed, smoking allowed, etc.
16. **Rating**: Minimum guest rating

## Adding New Filters

To add a new filter group:

1. Define the filter options in `filters.ts`:

```typescript
export const newFilterCategory: FilterOption[] = [
  { id: 'option1', label: 'Option 1', icon: 'icon-name' },
  { id: 'option2', label: 'Option 2', icon: 'icon-name' }
];
```

2. Add the filter group to the `filterGroups` array:

```typescript
export const filterGroups: FilterGroup[] = [
  // Existing groups...
  {
    id: 'new-category',
    name: 'New Category',
    icon: 'category-icon',
    description: 'Description of the category',
    options: newFilterCategory,
    multiSelect: true,
    showStrength: true
  }
];
```

3. Update the `AppliedFilters` interface in `types.ts`:

```typescript
export interface AppliedFilters {
  // Existing filters...
  newCategory?: string[]; // All filters are now array type
  preferenceStrength: Record<string, PreferenceStrength>;
}
```

4. Update the `selectedFilters` state in the main page:

```typescript
let selectedFilters = $state<Record<string, string[]>>({
  // Existing filters...
  'new-category': []
});
```

## Using Filters in Components

### Main Page Setup

```svelte
<script>
  import FilterSidebar from './FilterSidebar.svelte';
  import ActiveFilters from './ActiveFilters.svelte';
  
  // Initialize filter state
  let selectedFilters = $state<Record<string, string[]>>({
    'property-type': [],
    'amenities': [],
    // other filter categories...
  });
  
  let preferenceStrength = $state<Record<string, PreferenceStrength>>({});
  let activePreferenceModal = $state<string | null>(null);
  
  // Function to handle removing a filter
  function removeFilter(groupId: string, filterId: string) {
    if (Array.isArray(selectedFilters[groupId])) {
      selectedFilters[groupId] = selectedFilters[groupId].filter(id => id !== filterId);
    }
  }
  
  function closePreferenceModal() {
    activePreferenceModal = null;
  }
</script>

<div class="flex">
  <FilterSidebar
    selectedFilters={selectedFilters}
    {activePreferenceModal}
    {preferenceStrength}
  />
  
  <div class="flex-1">
    <ActiveFilters
      filters={selectedFilters}
      {preferenceStrength}
      onRemove={removeFilter}
    />
    
    <!-- Other content -->
  </div>
</div>

<!-- Click outside detector to close preference modal -->
{#if activePreferenceModal}
  <button 
    class="fixed inset-0 z-0"
    onclick={closePreferenceModal}
    aria-label="Close filter preference modal"
  ></button>
{/if}
```

### Preparing Search with Filters

```typescript
// Import the helper function
import { prepareSearchQuery } from './filters';

// Build search query with all filters
const searchQueryJson = prepareSearchQuery({
  destination,
  dateRange,
  budget,
  selectedRooms,
  preferences,
  selectedPropertyType: selectedFilters['property-type'].length > 0 ? selectedFilters['property-type'] : null,
  selectedAmenities: selectedFilters['amenities'],
  selectedLocationFeatures: selectedFilters['nearby'],
  selectedAccessibility: selectedFilters['accessibility'],
  selectedSafetyFeatures: selectedFilters['safety-features'],
  selectedHouseRules: selectedFilters['house-rules'],
  selectedRating: selectedFilters['rating'],
  preferenceStrength
});
```

## Component Props

### FilterSidebar

- `selectedFilters`: Record mapping filter group IDs to arrays of selected filter IDs
- `preferenceStrength`: Record mapping filter IDs to strength preferences
- `activePreferenceModal`: ID of the filter currently showing strength options (string | null)

### ActiveFilters

- `filters`: Record mapping filter group IDs to arrays of selected filter IDs
- `preferenceStrength`: Record mapping filter IDs to strength preferences
- `onRemove`: Function to call when a filter is removed (groupId, filterId) => void

## Strength Indicators

Preference strengths are now visualized with signal icons and varying opacity levels:

- **Weak (Low)**: Low opacity signal-low icon - Low priority items
- **Mid (Medium)**: Medium opacity signal-medium icon - Medium priority items (default)
- **Strong (High)**: Full opacity signal-high icon - High priority items

When there are many active filters, the system will automatically display only the first 5 filters with a "+X more" button that can be clicked to expand and show all filters. This saves space and keeps the interface clean.

## Compact UI

The search form has been optimized for space efficiency:
- Reduced height of the textarea input
- Made the preference dropdown more compact
- Added `resize-none` to prevent users from resizing the textarea and potentially breaking the layout
- Adjusted padding and spacing throughout the component for better proportions 