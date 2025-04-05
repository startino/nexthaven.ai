import { browser } from '$app/environment';
import { createSupabaseBrowserClient } from '$lib/supabase';
import type { PropertyCollection, CollectionProperty } from '$lib/stores/collections';
import type { UnifiedProperty } from '$lib/types/unified-property';
import type { Json } from '$lib/types/database.types';

export class CollectionService {
	/**
	 * Gets all collections for the current user
	 */
	static async getCollections(userId: string): Promise<PropertyCollection[]> {
		if (!browser) return [];

		try {
			const supabase = createSupabaseBrowserClient();
			const { data, error } = await supabase
				.from('property_collections')
				.select('*')
				.eq('user_id', userId)
				.order('created_at', { ascending: false });

			if (error) {
				console.error('Error fetching collections:', error);
				throw error;
			}

			// Transform null descriptions to undefined to match PropertyCollection type
			return (data || []).map(collection => ({
				...collection,
				description: collection.description || undefined,
				created_at: collection.created_at ? new Date(collection.created_at) : undefined,
				updated_at: collection.updated_at ? new Date(collection.updated_at) : undefined
			}));
		} catch (error) {
			console.error('Failed to get collections:', error);
			throw error;
		}
	}

	/**
	 * Creates a new collection for the current user
	 */
	static async createCollection(
		name: string,
		userId: string,
		description?: string
	): Promise<PropertyCollection> {
		if (!browser) throw new Error('Cannot create collection on server');

		try {
			const supabase = createSupabaseBrowserClient();

			// Check if 'My Trip' collection exists if creating the default collection
			if (name === 'My Trip') {
				const { data: existingCollection } = await supabase
					.from('property_collections')
					.select('*')
					.eq('user_id', userId)
					.eq('name', 'My Trip')
					.single();

				if (existingCollection) {
					return {
						...existingCollection,
						description: existingCollection.description || undefined,
						created_at: existingCollection.created_at ? new Date(existingCollection.created_at) : undefined,
						updated_at: existingCollection.updated_at ? new Date(existingCollection.updated_at) : undefined
					};
				}
			}

			const collectionData = {
				name,
				user_id: userId,
				description,
				created_at: new Date().toISOString()
			};

			const { data, error } = await supabase
				.from('property_collections')
				.insert(collectionData)
				.select()
				.single();

			if (error) {
				console.error('Error creating collection:', error);
				throw error;
			}

			return {
				...data,
				description: data.description || undefined,
				created_at: data.created_at ? new Date(data.created_at) : undefined,
				updated_at: data.updated_at ? new Date(data.updated_at) : undefined
			};
		} catch (error) {
			console.error('Failed to create collection:', error);
			throw error;
		}
	}

	/**
	 * Updates an existing collection
	 */
	static async updateCollection(
		collectionId: string,
		updates: { name?: string; description?: string }
	): Promise<PropertyCollection> {
		if (!browser) throw new Error('Cannot update collection on server');

		try {
			const supabase = createSupabaseBrowserClient();
			const updateData = {
				...updates,
				updated_at: new Date().toISOString()
			};

			const { data, error } = await supabase
				.from('property_collections')
				.update(updateData)
				.eq('id', collectionId)
				.select()
				.single();

			if (error) {
				console.error('Error updating collection:', error);
				throw error;
			}

			return {
				...data,
				description: data.description || undefined,
				created_at: data.created_at ? new Date(data.created_at) : undefined,
				updated_at: data.updated_at ? new Date(data.updated_at) : undefined
			};
		} catch (error) {
			console.error('Failed to update collection:', error);
			throw error;
		}
	}

	/**
	 * Deletes a collection
	 */
	static async deleteCollection(collectionId: string): Promise<void> {
		if (!browser) throw new Error('Cannot delete collection on server');

		try {
			const supabase = createSupabaseBrowserClient();

			// First delete all properties in this collection
			await supabase.from('collection_properties').delete().eq('collection_id', collectionId);

			// Then delete the collection
			const { error } = await supabase.from('property_collections').delete().eq('id', collectionId);

			if (error) {
				console.error('Error deleting collection:', error);
				throw error;
			}
		} catch (error) {
			console.error('Failed to delete collection:', error);
			throw error;
		}
	}

	/**
	 * Adds a property to a collection
	 */
	static async addPropertyToCollection(
		collectionId: string,
		property: UnifiedProperty
	): Promise<void> {
		if (!browser) throw new Error('Cannot add property on server');

		try {
			const supabase = createSupabaseBrowserClient();

			// First check if the property already exists in the collection
			const { data: existingRelation } = await supabase
				.from('collection_properties')
				.select('*')
				.eq('collection_id', collectionId)
				.eq('property->id', property.id)
				.single();

			if (existingRelation) {
				// Property already in collection, no need to add again
				return;
			}

			// Add property to collection
			const { error } = await supabase.from('collection_properties').insert({
				collection_id: collectionId,
				property: property as unknown as Json,
				created_at: new Date().toISOString()
			});

			if (error) {
				console.error('Error adding property to collection:', error);
				throw error;
			}
		} catch (error) {
			console.error('Failed to add property to collection:', error);
			throw error;
		}
	}

	/**
	 * Removes a property from a collection
	 */
	static async removePropertyFromCollection(
		collectionId: string,
		propertyId: string
	): Promise<void> {
		if (!browser) throw new Error('Cannot remove property on server');

		try {
			const supabase = createSupabaseBrowserClient();

			const { error } = await supabase
				.from('collection_properties')
				.delete()
				.eq('collection_id', collectionId)
				.eq('property->id', propertyId);

			if (error) {
				console.error('Error removing property from collection:', error);
				throw error;
			}
		} catch (error) {
			console.error('Failed to remove property from collection:', error);
			throw error;
		}
	}

	/**
	 * Gets all properties in a collection
	 */
	static async getCollectionProperties(collectionId: string): Promise<UnifiedProperty[]> {
		if (!browser) return [];

		try {
			const supabase = createSupabaseBrowserClient();

			const { data, error } = await supabase
				.from('collection_properties')
				.select('property')
				.eq('collection_id', collectionId);

			if (error) {
				console.error('Error fetching collection properties:', error);
				throw error;
			}

			return (data || []).map((item) => item.property as unknown as UnifiedProperty);
		} catch (error) {
			console.error('Failed to get collection properties:', error);
			throw error;
		}
	}

	/**
	 * Creates the default "My Trip" collection for a new user if it doesn't exist
	 */
	static async ensureDefaultCollection(userId: string): Promise<PropertyCollection> {
		try {
			const collections = await this.getCollections(userId);
			const defaultCollection = collections.find((collection) => collection.name === 'My Trip');

			if (defaultCollection) {
				return defaultCollection;
			}

			// Create default collection
			return await this.createCollection(
				'My Trip',
				userId,
				'Default collection for your saved properties'
			);
		} catch (error) {
			console.error('Failed to ensure default collection:', error);
			throw error;
		}
	}
}
