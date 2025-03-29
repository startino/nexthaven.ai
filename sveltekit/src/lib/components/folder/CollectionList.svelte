<script lang="ts">
	import { page } from '$app/stores';
	import { collectionState, setCurrentCollection, type PropertyCollection } from '$lib/stores/collections.svelte';
	import { CollectionService } from '$lib/services/collection.service';
	import { Trash2, Edit2, Plus, Folder, Package } from 'lucide-svelte';
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
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	
	// Props
	let { classname = '' } = $props<{
		classname?: string; 
	}>();
	
	// Local state for dialogs and inputs
	let showCreateDialog = $state(false);
	let showEditDialog = $state(false);
	let showDeleteDialog = $state(false);
	let collectionName = $state('');
	let collectionDescription = $state('');
	let selectedCollection: PropertyCollection | null = $state(null);
	
	// Create a new collection
	async function createCollection() {
		if (!collectionName.trim()) {
			console.error('Collection name is required');
			return;
		}
		
		try {
			collectionState.isLoading = true;
			if (!$page.data.session?.user?.id) {
				console.error('You must be logged in to create collections');
				return;
			}
			
			const collection = await CollectionService.createCollection(
				collectionName, 
				$page.data.session.user.id, 
				collectionDescription
			);
			
			collectionState.collections.push(collection);
			
			// Reset form
			collectionName = '';
			collectionDescription = '';
			showCreateDialog = false;
			
			console.log('Collection created successfully');
		} catch (error) {
			console.error('Failed to create collection:', error);
		} finally {
			collectionState.isLoading = false;
		}
	}
	
	// Select a collection for editing
	function editCollection(collection: PropertyCollection) {
		selectedCollection = collection;
		collectionName = collection.name;
		collectionDescription = collection.description || '';
		showEditDialog = true;
	}
	
	// Update an existing collection
	async function updateCollection() {
		if (!selectedCollection) return;
		if (!collectionName.trim()) {
			console.error('Collection name is required');
			return;
		}
		
		try {
			collectionState.isLoading = true;
			
			await CollectionService.updateCollection(selectedCollection.id, {
				name: collectionName,
				description: collectionDescription
			});
			
			collectionState.collections.splice(collectionState.collections.indexOf(selectedCollection), 1, {
				...selectedCollection,
				name: collectionName,
				description: collectionDescription
			});
			
			// Reset form
			collectionName = '';
			collectionDescription = '';
			selectedCollection = null;
			showEditDialog = false;
			
			console.log('Collection updated successfully');
		} catch (error) {
			console.error('Failed to update collection:', error);
		} finally {
			collectionState.isLoading = false;
		}
	}
	
	// Select a collection for deletion
	function confirmDeleteCollection(collection: PropertyCollection) {
		selectedCollection = collection;
		showDeleteDialog = true;
	}
	
	// Delete a collection
	async function deleteCollection() {
		if (!selectedCollection) return;
		
		try {
			collectionState.isLoading = true;
			
			await CollectionService.deleteCollection(selectedCollection.id);
			
			collectionState.collections.splice(collectionState.collections.indexOf(selectedCollection), 1);
			
			// Reset selection
			selectedCollection = null;
			showDeleteDialog = false;
			
			console.log('Collection deleted successfully');
		} catch (error) {
			console.error('Failed to delete collection:', error);
		} finally {
			collectionState.isLoading = false;
		}
	}
	
	// Select a collection
	function selectCollection(collection: PropertyCollection) {
		setCurrentCollection(collection);
	}
</script>

<div class={`py-2 ${classname}`}>
	<div class="flex justify-between items-center mb-4">
		<Button class="w-full"  onclick={() => { showCreateDialog = true; }}>
			<Plus class="h-4 w-4 mr-2" />
			New Collection
		</Button>
	</div>
	
	<div class="space-y-2">
		{#if collectionState.isLoading}
			<div class="animate-pulse space-y-2">
				<div class="h-10 bg-muted/50 rounded"></div>
				<div class="h-10 bg-muted/50 rounded"></div>
			</div>
		{:else if collectionState.collections && collectionState.collections.length > 0}
			{#each collectionState.collections as collection}
				<button 
					class="group flex items-center w-full justify-between py-2 px-4 rounded-md hover:bg-primary/10"
					onclick={() => selectCollection(collection)}
				>
					<div class="flex items-center space-x-2">
						<Folder class="h-5 w-5 text-muted-foreground" />
						<span>{collection.name}</span>
					</div>
					
					<DropdownMenu>
						<DropdownMenuTrigger asChild let:builder>
							<Button 
								variant="ghost" 
								size="icon" 
								builders={[builder]}
								onclick={(e: MouseEvent) => e.stopPropagation()}
								class="opacity-0 group-hover:opacity-100 transition-opacity"
							>
								<Edit2 class="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onclick={() => editCollection(collection)}>
								<Edit2 class="h-4 w-4 mr-2" />
								Edit Collection
							</DropdownMenuItem>
							{#if collection.name !== 'My Trip'}
								<DropdownMenuItem 
									onclick={() => confirmDeleteCollection(collection)}
									class="text-destructive focus:text-destructive"
								>
									<Trash2 class="h-4 w-4 mr-2" />
									Delete Collection
								</DropdownMenuItem>
							{/if}
						</DropdownMenuContent>
					</DropdownMenu>
				</button>
			{/each}
		{:else}
			<div class="text-center p-4 border rounded-md border-dashed">
				<Package class="h-10 w-10 mx-auto text-muted-foreground mb-2" />
				<p class="text-muted-foreground">No collections found. Create your first collection to organize your saved properties.</p>
			</div>
		{/if}
	</div>
	
	<!-- Create Collection Dialog -->
	<Dialog bind:open={showCreateDialog}>
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Create New Collection</DialogTitle>
				<DialogDescription>
					Create a new collection to organize your saved properties.
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
		
				<Button disabled={collectionState.isLoading} onclick={createCollection}>
					{#if collectionState.isLoading}Creating...{:else}Create Collection{/if}
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
	
	<!-- Edit Collection Dialog -->
	<Dialog bind:open={showEditDialog}>
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Edit Collection</DialogTitle>
				<DialogDescription>
					Update your collection details.
				</DialogDescription>
			</DialogHeader>
			
			<div class="space-y-4 py-4">
				<div class="space-y-2">
					<label for="edit-name" class="text-sm font-medium">Collection Name</label>
					<Input
						id="edit-name"
						placeholder="e.g., Summer Vacation"
						bind:value={collectionName}
					/>
				</div>
				
				<div class="space-y-2">
					<label for="edit-description" class="text-sm font-medium">Description (optional)</label>
					<Input
						id="edit-description"
						placeholder="Description for this collection"
						bind:value={collectionDescription}
					/>
				</div>
			</div>
			
			<DialogFooter>
				<Button disabled={collectionState.isLoading} onclick={updateCollection}>
					{#if collectionState.isLoading}Updating...{:else}Update Collection{/if}
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
	
	<!-- Delete Collection Dialog -->
	<Dialog bind:open={showDeleteDialog}>
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Delete Collection</DialogTitle>
				<DialogDescription>
					Are you sure you want to delete this collection? This action cannot be undone.
				</DialogDescription>
			</DialogHeader>
			
			{#if selectedCollection}
				<p class="py-4">You are about to delete the collection "{selectedCollection.name}".</p>
			{/if}
			
			<DialogFooter>
				<Button variant="destructive" disabled={collectionState.isLoading} onclick={deleteCollection}>
					{#if collectionState.isLoading}Deleting...{:else}Delete Collection{/if}
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
</div> 