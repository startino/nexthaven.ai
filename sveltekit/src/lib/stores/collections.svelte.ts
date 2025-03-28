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
export const collectionState = $state<{
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
	collectionState.collections = collections;
}

export function setCurrentCollection(collection: PropertyCollection | null) {
	collectionState.currentCollection = collection;
}

export function setCollectionProperties(collectionId: string, properties: UnifiedProperty[]) {
	collectionState.collectionProperties[collectionId] = properties;
}

export function setLoading(isLoading: boolean) {
	collectionState.isLoading = isLoading;
}

export function setError(error: string | null) {
	collectionState.error = error;
}

export function getCollections(): PropertyCollection[] {
	return collectionState.collections;
}

export function getCurrentCollection(): PropertyCollection | null {
	return collectionState.currentCollection;
}

export function getCollectionProperties(collectionId: string): UnifiedProperty[] {
	return collectionState.collectionProperties[collectionId] || [];
}
