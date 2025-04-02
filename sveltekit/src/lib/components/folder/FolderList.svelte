<script lang="ts">
	import { page } from '$app/stores';
	import { folders, setFolders, setCurrentFolder } from '$lib/stores/folders';
	import { FolderService } from '$lib/services/folder.service';
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
		DialogClose
	} from '$lib/components/ui/dialog';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import type { PropertyFolder } from '$lib/stores/folders';
	
	// Props
	let { classname = '' } = $props<{
		classname?: string; 
	}>();
	
	// Local state for dialogs and inputs
	let showCreateDialog = $state(false);
	let showEditDialog = $state(false);
	let showDeleteDialog = $state(false);
	let folderName = $state('');
	let folderDescription = $state('');
	let selectedFolder: PropertyFolder | null = $state(null);
	let isLoading = $state(false);
	
	// Load folders when component mounts
	$effect(() => {
		if ($page.data.session?.user) {
			loadFolders();
		}
	});
	
	// Load folders for the current user
	async function loadFolders() {
		try {
			isLoading = true;
			if (!$page.data.session?.user?.id) {
				return;
			}
			
			const userFolders = await FolderService.getFolders($page.data.session.user.id);
			
			// If no 'My Trip' folder exists, create it
			if (!userFolders.some((folder) => folder.name === 'My Trip')) {
				await FolderService.ensureDefaultFolder($page.data.session.user.id);
				// Reload folders after creating default
				const updatedFolders = await FolderService.getFolders($page.data.session.user.id);
				setFolders(updatedFolders);
			} else {
				setFolders(userFolders);
			}
		} catch (error) {
			console.error('Failed to load folders:', error);
		} finally {
			isLoading = false;
		}
	}
	
	// Create a new folder
	async function createFolder() {
		if (!folderName.trim()) {
			console.error('Folder name is required');
			return;
		}
		
		try {
			isLoading = true;
			if (!$page.data.session?.user?.id) {
				console.error('You must be logged in to create folders');
				return;
			}
			
			await FolderService.createFolder(
				folderName, 
				$page.data.session.user.id, 
				folderDescription
			);
			
			// Reload folders after creating
			await loadFolders();
			
			// Reset form
			folderName = '';
			folderDescription = '';
			showCreateDialog = false;
			
			console.log('Folder created successfully');
		} catch (error) {
			console.error('Failed to create folder:', error);
		} finally {
			isLoading = false;
		}
	}
	
	// Select a folder for editing
	function editFolder(folder: PropertyFolder) {
		selectedFolder = folder;
		folderName = folder.name;
		folderDescription = folder.description || '';
		showEditDialog = true;
	}
	
	// Update an existing folder
	async function updateFolder() {
		if (!selectedFolder) return;
		if (!folderName.trim()) {
			console.error('Folder name is required');
			return;
		}
		
		try {
			isLoading = true;
			
			await FolderService.updateFolder(selectedFolder.id, {
				name: folderName,
				description: folderDescription
			});
			
			// Reload folders after updating
			await loadFolders();
			
			// Reset form
			folderName = '';
			folderDescription = '';
			selectedFolder = null;
			showEditDialog = false;
			
			console.log('Folder updated successfully');
		} catch (error) {
			console.error('Failed to update folder:', error);
		} finally {
			isLoading = false;
		}
	}
	
	// Select a folder for deletion
	function confirmDeleteFolder(folder: PropertyFolder) {
		selectedFolder = folder;
		showDeleteDialog = true;
	}
	
	// Delete a folder
	async function deleteFolder() {
		if (!selectedFolder) return;
		
		try {
			isLoading = true;
			
			await FolderService.deleteFolder(selectedFolder.id);
			
			// Reload folders after deletion
			await loadFolders();
			
			// Reset selection
			selectedFolder = null;
			showDeleteDialog = false;
			
			console.log('Folder deleted successfully');
		} catch (error) {
			console.error('Failed to delete folder:', error);
		} finally {
			isLoading = false;
		}
	}
	
	// Select a folder
	function selectFolder(folder: PropertyFolder) {
		setCurrentFolder(folder);
	}
</script>

<div class={`py-2 ${classname}`}>
	<div class="flex justify-between items-center mb-4">
		<h2 class="text-xl font-semibold">My Folders</h2>
		<Button size="sm" variant="outline" onclick={() => { showCreateDialog = true; }}>
			<Plus class="h-4 w-4 mr-2" />
			New Folder
		</Button>
	</div>
	
	<div class="space-y-2">
		{#if isLoading}
			<div class="animate-pulse space-y-2">
				<div class="h-10 bg-muted/50 rounded"></div>
				<div class="h-10 bg-muted/50 rounded"></div>
			</div>
		{:else if $folders && $folders.length > 0}
			{#each $folders as folder}
				<div 
					class="group flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer"
					onclick={() => selectFolder(folder)}
				>
					<div class="flex items-center space-x-2">
						<Folder class="h-5 w-5 text-muted-foreground" />
						<span>{folder.name}</span>
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
							<DropdownMenuItem onclick={() => editFolder(folder)}>
								<Edit2 class="h-4 w-4 mr-2" />
								Edit Folder
							</DropdownMenuItem>
							{#if folder.name !== 'My Trip'}
								<DropdownMenuItem 
									onclick={() => confirmDeleteFolder(folder)}
									class="text-destructive focus:text-destructive"
								>
									<Trash2 class="h-4 w-4 mr-2" />
									Delete Folder
								</DropdownMenuItem>
							{/if}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			{/each}
		{:else}
			<div class="text-center p-4 border rounded-md border-dashed">
				<Package class="h-10 w-10 mx-auto text-muted-foreground mb-2" />
				<p class="text-muted-foreground">No folders found. Create your first folder to organize your saved properties.</p>
			</div>
		{/if}
	</div>
	
	<!-- Create Folder Dialog -->
	<Dialog bind:open={showCreateDialog}>
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Create New Folder</DialogTitle>
				<DialogDescription>
					Create a new folder to organize your saved properties.
				</DialogDescription>
			</DialogHeader>
			
			<div class="space-y-4 py-4">
				<div class="space-y-2">
					<label for="name" class="text-sm font-medium">Folder Name</label>
					<Input
						id="name"
						placeholder="e.g., Summer Vacation"
						bind:value={folderName}
					/>
				</div>
				
				<div class="space-y-2">
					<label for="description" class="text-sm font-medium">Description (optional)</label>
					<Input
						id="description"
						placeholder="Description for this folder"
						bind:value={folderDescription}
					/>
				</div>
			</div>
			
			<DialogFooter>
				<DialogClose asChild>
					<Button variant="outline">Cancel</Button>
				</DialogClose>
				<Button disabled={isLoading} onclick={createFolder}>
					{#if isLoading}Creating...{:else}Create Folder{/if}
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
	
	<!-- Edit Folder Dialog -->
	<Dialog bind:open={showEditDialog}>
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Edit Folder</DialogTitle>
				<DialogDescription>
					Update your folder details.
				</DialogDescription>
			</DialogHeader>
			
			<div class="space-y-4 py-4">
				<div class="space-y-2">
					<label for="edit-name" class="text-sm font-medium">Folder Name</label>
					<Input
						id="edit-name"
						placeholder="e.g., Summer Vacation"
						bind:value={folderName}
					/>
				</div>
				
				<div class="space-y-2">
					<label for="edit-description" class="text-sm font-medium">Description (optional)</label>
					<Input
						id="edit-description"
						placeholder="Description for this folder"
						bind:value={folderDescription}
					/>
				</div>
			</div>
			
			<DialogFooter>
				<DialogClose asChild>
					<Button variant="outline">Cancel</Button>
				</DialogClose>
				<Button disabled={isLoading} onclick={updateFolder}>
					{#if isLoading}Updating...{:else}Update Folder{/if}
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
	
	<!-- Delete Folder Dialog -->
	<Dialog bind:open={showDeleteDialog}>
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Delete Folder</DialogTitle>
				<DialogDescription>
					Are you sure you want to delete this folder? This action cannot be undone.
				</DialogDescription>
			</DialogHeader>
			
			{#if selectedFolder}
				<p class="py-4">You are about to delete the folder "{selectedFolder.name}".</p>
			{/if}
			
			<DialogFooter>
				<DialogClose asChild>
					<Button variant="outline">Cancel</Button>
				</DialogClose>
				<Button variant="destructive" disabled={isLoading} onclick={deleteFolder}>
					{#if isLoading}Deleting...{:else}Delete Folder{/if}
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
</div> 