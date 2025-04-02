/**
 * favourite-filters.ts - Tracks and manages user's favorite tags 
 * using localStorage for persistence
 */

/**
 * Interface for a favorite tag with usage count
 */
export interface FavoriteTag {
  text: string;
  count: number;
  lastUsed: number;
}

// Local storage key
const STORAGE_KEY = 'rentino_favorite_tags';

/**
 * Get all favorite tags from localStorage
 */
export function getFavoriteTags(): FavoriteTag[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) return [];
    
    return JSON.parse(storedData);
  } catch (error) {
    console.error('Error loading favorite tags from localStorage:', error);
    return [];
  }
}

/**
 * Get top N favorite tags by usage count
 */
export function getTopFavoriteTags(limit = 7): string[] {
  const allTags = getFavoriteTags();
  
  // Sort by count (descending) and then by lastUsed (most recent first)
  return allTags
    .sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed)
    .slice(0, limit)
    .map(tag => tag.text);
}

/**
 * Track usage of tags
 * @param tags Array of tags to track
 */
export function trackTagsUsage(tags: string[]): void {
  if (typeof localStorage === 'undefined' || !tags.length) return;
  
  try {
    // Normalize tags (trim, lowercase)
    const normalizedTags = tags.map(tag => tag.trim());
    
    // Get existing tags
    const existingTags = getFavoriteTags();
    const timestamp = Date.now();
    
    // Update counts for each tag
    const updatedTags = [...existingTags];
    
    for (const tag of normalizedTags) {
      if (!tag) continue;
      
      const existingIndex = updatedTags.findIndex(t => t.text === tag);
      
      if (existingIndex >= 0) {
        // Update existing tag
        updatedTags[existingIndex] = {
          ...updatedTags[existingIndex],
          count: updatedTags[existingIndex].count + 1,
          lastUsed: timestamp
        };
      } else {
        // Add new tag
        updatedTags.push({
          text: tag,
          count: 1,
          lastUsed: timestamp
        });
      }
    }
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTags));
  } catch (error) {
    console.error('Error saving favorite tags to localStorage:', error);
  }
}

/**
 * Clear all favorite tags
 */
export function clearFavoriteTags(): void {
  if (typeof localStorage === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing favorite tags from localStorage:', error);
  }
}

/**
 * Remove a specific tag from favorites
 */
export function removeTag(tagText: string): void {
  if (typeof localStorage === 'undefined') return;
  
  try {
    const existingTags = getFavoriteTags();
    const filteredTags = existingTags.filter(tag => tag.text !== tagText);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredTags));
  } catch (error) {
    console.error('Error removing tag from favorites:', error);
  }
} 