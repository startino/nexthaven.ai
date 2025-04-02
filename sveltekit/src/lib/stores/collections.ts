import { writable } from 'svelte/store';
import type { UnifiedProperty } from '$lib/types/unified-property';

// Define the collection structure
export interface PropertyCollection {
	id: string;
	name: string;
	description?: string;
	user_id: string;
	created_at?: Date;
	updated_at?: Date;
}

// Define the collection-property relationship
export interface CollectionProperty {
	id: string;
	collection_id: string;
	property_id: string;
	created_at?: Date;
}

// Define the property structure
export interface Property {
	id: string;
	title: string;
	location?: string;
	price?: string;
	type?: string;
	rating?: string;
	image_url?: string;
	description?: string;
}

// Create a store for collections
export const collectionStore = writable<{
	collections: PropertyCollection[];
	currentCollection: PropertyCollection | null;
	collectionProperties: { [collectionId: string]: UnifiedProperty[] };
	isLoading: boolean;
	error: string | null;
}>({
	collections: [],
	currentCollection: null,
	collectionProperties: {},
	isLoading: false,
	error: null
});

// Collection actions
export function setCollections(collections: PropertyCollection[]) {
	collectionStore.update((state) => ({
		...state,
		collections
	}));
}

export function setCurrentCollection(collection: PropertyCollection | null) {
	collectionStore.update((state) => ({
		...state,
		currentCollection: collection
	}));
}

export function setCollectionProperties(collectionId: string, properties: UnifiedProperty[]) {
	collectionStore.update((state) => ({
		...state,
		collectionProperties: {
			...state.collectionProperties,
			[collectionId]: properties
		}
	}));
}

export function setLoading(isLoading: boolean) {
	collectionStore.update((state) => ({
		...state,
		isLoading
	}));
}

export function setError(error: string | null) {
	collectionStore.update((state) => ({
		...state,
		error
	}));
}

export function getCollections(): PropertyCollection[] {
	let result: PropertyCollection[] = [];
	collectionStore.subscribe((state) => {
		result = state.collections;
	})();
	return result;
}

export function getCurrentCollection(): PropertyCollection | null {
	let result: PropertyCollection | null = null;
	collectionStore.subscribe((state) => {
		result = state.currentCollection;
	})();
	return result;
}

export function getCollectionProperties(collectionId: string): UnifiedProperty[] {
	let result: UnifiedProperty[] = [];
	collectionStore.subscribe((state) => {
		result = state.collectionProperties[collectionId] || [];
	})();
	return result;
}

// Svelte Store version (for $: reactive declarations)
export const collections = {
	subscribe: (callback: (value: PropertyCollection[]) => void) => {
		return collectionStore.subscribe((state) => callback(state.collections));
	}
};

export const currentCollection = {
	subscribe: (callback: (value: PropertyCollection | null) => void) => {
		return collectionStore.subscribe((state) => callback(state.currentCollection));
	}
};

export const collectionProperties = {
	subscribe: (callback: (value: { [collectionId: string]: UnifiedProperty[] }) => void) => {
		return collectionStore.subscribe((state) => callback(state.collectionProperties));
	}
};

export const isLoading = {
	subscribe: (callback: (value: boolean) => void) => {
		return collectionStore.subscribe((state) => callback(state.isLoading));
	}
};

export const error = {
	subscribe: (callback: (value: string | null) => void) => {
		return collectionStore.subscribe((state) => callback(state.error));
	}
};
