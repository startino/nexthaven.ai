import type { UnifiedProperty } from '$lib/types/unified-property';

// Create the property store using Svelte 5 universal reactivity
// Using 'let' syntax with $state for top-level variables
let properties = $state<UnifiedProperty[]>([]);
let selectedProperty = $state<UnifiedProperty | null>(null);
let searchQuery = $state<string>('');
let errorMessage = $state<string | null>(null);

// Exports for accessing state - using getter functions instead of exporting state directly
export function getProperties() {
	return properties;
}
export function getSelectedProperty() {
	return selectedProperty;
}
export function getSearchQuery() {
	return searchQuery;
}
export function getErrorMessage() {
	return errorMessage;
}

// Function to set the properties in the store
export function setProperties(props: UnifiedProperty[]) {
	properties = props;
}

// Function to set the selected property in the store
export function setSelectedProperty(property: UnifiedProperty | null) {
	selectedProperty = property;
}

// Function to set the search query in the store
export function setSearchQuery(query: string | object) {
	// If the query is an object, stringify it
	if (typeof query === 'object') {
		searchQuery = JSON.stringify(query);
	} else {
		searchQuery = query;
	}
}

// Function to set an error message in the store
export function setError(message: string | null) {
	errorMessage = message;
}

// Function to clear the store
export function clearStore() {
	properties = [];
	selectedProperty = null;
	searchQuery = '';
	errorMessage = null;
}

// Function to get the current store state (useful for compatibility with code expecting the old store)
export function getStoreSnapshot() {
	return {
		properties: $state.snapshot(properties),
		selectedProperty: $state.snapshot(selectedProperty),
		searchQuery: $state.snapshot(searchQuery),
		errorMessage: $state.snapshot(errorMessage)
	};
}

// Create a derived store for compatibility with existing code
export const propertyStore = {
	subscribe: (
		callback: (value: {
			properties: UnifiedProperty[];
			selectedProperty: UnifiedProperty | null;
			searchQuery: string;
			errorMessage: string | null;
		}) => void
	) => {
		// Initial call
		callback({
			properties,
			selectedProperty,
			searchQuery,
			errorMessage
		});

		// Setup subscription with $effect
		let cleanup: (() => void) | undefined;

		// Create an effect that calls the callback when state changes
		$effect(() => {
			callback({
				properties,
				selectedProperty,
				searchQuery,
				errorMessage
			});
		});

		// Return unsubscribe function
		return () => {
			// Cleanup will happen automatically when component is destroyed
			// Because $effect is tied to component lifecycle
		};
	},

	// For compatibility with writable store interface
	update: (
		updater: (value: {
			properties: UnifiedProperty[];
			selectedProperty: UnifiedProperty | null;
			searchQuery: string;
			errorMessage: string | null;
		}) => {
			properties: UnifiedProperty[];
			selectedProperty: UnifiedProperty | null;
			searchQuery: string;
			errorMessage: string | null;
		}
	) => {
		const newState = updater({
			properties,
			selectedProperty,
			searchQuery,
			errorMessage
		});

		properties = newState.properties;
		selectedProperty = newState.selectedProperty;
		searchQuery = newState.searchQuery;
		errorMessage = newState.errorMessage;
	},

	// For compatibility with writable store interface
	set: (value: {
		properties: UnifiedProperty[];
		selectedProperty: UnifiedProperty | null;
		searchQuery: string;
		errorMessage: string | null;
	}) => {
		properties = value.properties;
		selectedProperty = value.selectedProperty;
		searchQuery = value.searchQuery;
		errorMessage = value.errorMessage;
	}
};
