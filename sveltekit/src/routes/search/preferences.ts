// Import the SavedPreference type from types.ts
import type { SavedPreference } from './types';

// Function to load previous preferences from localStorage
export function loadPreviousPreferences(): SavedPreference[] {
  try {
    const storedPreferences = localStorage.getItem('previousPreferences');
    if (storedPreferences) {
      return JSON.parse(storedPreferences);
    } else {
      // Default preferences if none found
      return [
        {
          id: 'default-1',
          text: 'Modern apartment with a home office setup, high-speed internet, and a quiet neighborhood. Must have in-unit laundry and a balcony.',
          timestamp: Date.now() - 86400000 // Yesterday
        }
      ];
    }
  } catch (error) {
    console.error('Error retrieving preferences from localStorage:', error);
    return [];
  }
}

// Save a new preference to localStorage
export function savePreference(preferences: string, previousPreferences: SavedPreference[]): SavedPreference[] {
  try {
    if (!preferences) return previousPreferences; // Don't save empty preferences
    
    const newPreference: SavedPreference = {
      id: `pref-${Date.now()}`,
      text: preferences,
      timestamp: Date.now()
    };
    
    // Prepend new preference and keep only the 6 most recent
    const updatedPreferences = [newPreference, ...previousPreferences.slice(0, 5)];
    localStorage.setItem('previousPreferences', JSON.stringify(updatedPreferences));
    return updatedPreferences;
  } catch (error) {
    console.error('Error saving preferences to localStorage:', error);
    return previousPreferences;
  }
}

// Template text for preferences
export const TEMPLATE_TEXT = `Type of property: [apartment / hostel / co-living / etc.]

Ambience: [modern / rustic / cozy / minimalist / traditional / bohemian / elegant]

Amenities: [pool / gym / parking / etc.]

Location: [15min walk to the beach / 10min drive to the city center / etc.]

Literally any other preferences:
[Any other specific requirements or preferences you have]`; 