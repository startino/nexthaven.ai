import { writable } from 'svelte/store';
import type { UnifiedProperty } from '$lib/types/unified-property';

// Create a store for properties
export const propertyStore = writable<{
	properties: UnifiedProperty[];
	selectedProperty: UnifiedProperty | null;
	searchQuery: string;
}>({
	properties: [],
	selectedProperty: null,
	searchQuery: ''
});

// Function to set the properties in the store
export function setProperties(properties: UnifiedProperty[]) {
	propertyStore.update((state) => ({ ...state, properties }));
}

// Function to set the selected property in the store
export function setSelectedProperty(property: UnifiedProperty | null) {
	propertyStore.update((state) => ({ ...state, selectedProperty: property }));
}

// Function to set the search query in the store
export function setSearchQuery(searchQuery: string) {
	propertyStore.update((state) => ({ ...state, searchQuery }));
}

// Function to clear the store
export function clearStore() {
	propertyStore.set({
		properties: [],
		selectedProperty: null,
		searchQuery: ''
	});
}
