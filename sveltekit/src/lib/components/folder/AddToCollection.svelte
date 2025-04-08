<script lang="ts">
	import { collectionState } from '$lib/stores/collections.svelte';
	import { CollectionService } from '$lib/services/collection.service';
	import { page } from '$app/stores';
	import { Folder, Plus, X, Check, Loader2 } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { 
		Dialog, 
		DialogContent, 
		DialogDescription, 
		DialogHeader, 
		DialogTitle, 
		DialogFooter,
	} from '$lib/components/ui/dialog';
	import {
		Popover,
		PopoverContent,
		PopoverTrigger
	} from '$lib/components/ui/popover';
	import type { PropertyCollection } from '$lib/stores/collections';
	import type { UnifiedProperty } from '$lib/types/unified-property';
	import { cn } from '$lib/utils';
	
	// Props
	let { property } = $props<{
		property: UnifiedProperty,
	}>();
	
	// Local state
	let isOpen = $state(false);
	let showCreateDialog = $state(false);
	let collectionName = $state('');
	let collectionDescription = $state('');
	let isLoading = $state(false);
	let savedCollections = $state(new Set<string>()); // IDs of collections this property is in
	let isSaved = $derived(savedCollections.size > 0);
	
	// Check saved status without full reload when collections are already available
	$effect(() => {
		if ($page.data.session?.user?.id && collectionState.collections.length > 0 && !collectionState.isLoading) {
			checkSavedStatus();
		}
	});
	
	// Check saved status without fetching collections again
	function checkSavedStatus() {
		if (!$page.data.session?.user?.id) return;
		
		isLoading = true;
		
		// Use the already loaded collections instead of fetching them again
		Promise.all(
			collectionState.collections.map(async (collection) => {
				const collectionProperties = await CollectionService.getCollectionProperties(collection.id);
				const isSaved = collectionProperties.some(p => p.id === property.id);
				return { collection, isSaved };
			})
		).then(propertyCollections => {
			savedCollections = new Set(
				propertyCollections
					.filter(item => item.isSaved)
					.map(item => item.collection.id)
			);
		}).catch(error => {
			console.error('Failed to check saved status:', error);
		}).finally(() => {
			isLoading = false;
		});
	}
	
	// Use the optimized check instead of full loadSavedStatus when popover opens
	async function handlePopoverOpen(open: boolean) {
		isOpen = open;
		// Don't need to reload every time the popover opens since we're loading on component mount
	}
	
	// Original loadSavedStatus as fallback for when collections aren't loaded
	async function loadSavedStatus() {
		try {
			isLoading = true;
			if (!$page.data.session?.user?.id) {
				return;
			}
			
			// Get collections for this property
			const userCollections = await CollectionService.getCollections($page.data.session.user.id);
			
			// Check each collection to see if it contains this property
			const propertyCollections = await Promise.all(
				userCollections.map(async (collection) => {
					const collectionProperties = await CollectionService.getCollectionProperties(collection.id);
					const isSaved = collectionProperties.some(p => p.id === property.id);
					return { collection, isSaved };
				})
			);
			
			savedCollections = new Set(
				propertyCollections
					.filter(item => item.isSaved)
					.map(item => item.collection.id)
			);
		} catch (error) {
			console.error('Failed to load saved status:', error);
		} finally {
			isLoading = false;
		}
	}
	
	// Create a new collection and add the property to it
	async function createCollection() {
		if (!collectionName.trim()) {
			console.error('Collection name is required');
			return;
		}
		
		try {
			isLoading = true;
			if (!$page.data.session?.user?.id) {
				console.error('You must be logged in to create collections');
				return;
			}
			
			// Create the collection
			const newCollection = await CollectionService.createCollection(
				collectionName, 
				$page.data.session.user.id, 
				collectionDescription
			);
			
			// Add property to the new collection
			await CollectionService.addPropertyToCollection(newCollection.id, property);
			
			// Update saved state
			savedCollections.add(newCollection.id);
			savedCollections = new Set(savedCollections); // Force update
			collectionState.collections.push(newCollection);
			
			// Reset form
			collectionName = '';
			collectionDescription = '';
			showCreateDialog = false;
			
			console.log('Collection created and property added successfully');
		} catch (error) {
			console.error('Failed to create collection:', error);
		} finally {
			isLoading = false;
		}
	}
	
	// Toggle a property in a collection
	async function toggleCollection(collection: PropertyCollection) {
		try {
			isLoading = true;
			
			if (savedCollections.has(collection.id)) {
				// Remove property from collection
				await CollectionService.removePropertyFromCollection(collection.id, property.id);
				savedCollections.delete(collection.id);
			} else {
				// Check if property already exists in collection to avoid duplicates
				const collectionProperties = await CollectionService.getCollectionProperties(collection.id);
				const propertyExists = collectionProperties.some(p => p.id === property.id);
				
				if (!propertyExists) {
					// Add property to collection
					await CollectionService.addPropertyToCollection(collection.id, property);
				}
				
				savedCollections.add(collection.id);
			}
			
			// Force update
			savedCollections = new Set(savedCollections);
		} catch (error) {
			console.error('Failed to toggle property in collection:', error);
		} finally {
			isLoading = false;
		}
	}
</script>

<Popover onOpenChange={handlePopoverOpen}>
	<PopoverTrigger>
		<Button 
			size="sm" 
			variant={isSaved ? "secondary" : "outline"} 
			class={cn(
				"h-8 hover:scale-[1.01] transition-all duration-300 flex items-center justify-center gap-2",
				isSaved ? "gradient-primary text-primary-foreground hover:bg-gradient-primary/90 hover:text-primary-foreground/90 hover:scale-[1.1] transition-all duration-300" : "bg-card hover:bg-card/90", 
			)}
			disabled={isLoading}
		>
			{#if isLoading}
				<Loader2 class="h-3.5 w-3.5 animate-spin" />
			{:else}
				{#if isSaved}
					<Check class="h-3.5 w-3.5" />
					Saved
				{:else}
					<Folder class="h-3.5 w-3.5" />
					Save
				{/if}
			{/if}
		</Button>
	</PopoverTrigger>
	<PopoverContent class="w-80">
		<div class="space-y-4">
			<div class="flex justify-between items-center">
				<h4 class="font-medium">Save to Collection</h4>
				<Button variant="outline" size="sm" onclick={() => { showCreateDialog = true; }}>
					<Plus class="h-3.5 w-3.5 mr-1" />
					New
				</Button>
			</div>
			
			{#if isLoading}
				<div class="animate-pulse space-y-2">
					<div class="h-10 bg-muted/50 rounded"></div>
					<div class="h-10 bg-muted/50 rounded"></div>
				</div>
			{:else if collectionState.collections && collectionState.collections.length > 0}
				<div class="max-h-[240px] overflow-y-auto space-y-2 pr-1">
					{#each collectionState.collections as collection}
						<div 
							class="flex items-center justify-between p-2 rounded-md {savedCollections.has(collection.id) ? 'hover:bg-destructive/10' : 'hover:bg-primary/10'} cursor-pointer"
							onclick={() => toggleCollection(collection)}
						>
							<div class="flex items-center space-x-2">
								<Folder class="h-4 w-4 text-muted-foreground" />
								<span>{collection.name}</span>
							</div>
							
							{#if savedCollections.has(collection.id)}
								<div class="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
									<Check class="h-3.5 w-3.5 text-primary-foreground" />
								</div>
							{:else}
								<div class="h-5 w-5 rounded-full border border-muted"></div>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<div class="text-center p-4 border rounded-md border-dashed">
					<p class="text-sm text-muted-foreground">No collections found. Create a collection to save properties.</p>
				</div>
			{/if}
			
			<div class="text-xs text-muted-foreground">
				Property: {property.title}
			</div>
		</div>
		<Dialog bind:open={showCreateDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Create New Collection</DialogTitle>
			<DialogDescription>
				Create a new collection to save this property.
			</DialogDescription>
		</DialogHeader>
		
		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<label for="name" class="text-sm font-medium">Collection Name</label>
				<Input
					id="name"
					placeholder="e.g., Summer Vacation"
					bind:value={collectionName}
				/>
			</div>
			
			<div class="space-y-2">
				<label for="description" class="text-sm font-medium">Description (optional)</label>
				<Input
					id="description"
					placeholder="Description for this collection"
					bind:value={collectionDescription}
				/>
			</div>
		</div>
		
		<DialogFooter>
			<Button disabled={isLoading} onclick={createCollection}>
				{#if isLoading}Creating...{:else}Create Collection{/if}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog> 
	</PopoverContent>
</Popover>

<!-- Create Collection Dialog -->
