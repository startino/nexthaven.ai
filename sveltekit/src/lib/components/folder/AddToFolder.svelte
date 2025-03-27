<script lang="ts">
	import { page } from '$app/stores';
	import { folders } from '$lib/stores/folders';
	import { FolderService } from '$lib/services/folder.service';
	import type { UnifiedProperty } from '$lib/types/unified-property';
	import { PlusCircle, Folder, X } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Popover,
		PopoverContent,
		PopoverTrigger
	} from '$lib/components/ui/popover';
	
	// Props
	let { property } = $props<{
		property: UnifiedProperty;
	}>();
	
	// Local state
	let isOpen = $state(false);
	let isLoading = $state(false);
	let addingToFolderId: string | null = $state(null);
	
	// Add a property to a folder
	async function addToFolder(folderId: string) {
		if (!property || !folderId) return;
		
		try {
			// Set loading state for this specific folder
			isLoading = true;
			addingToFolderId = folderId;
			
			// Add the property to the folder
			await FolderService.addPropertyToFolder(folderId, property);
			
			// Success feedback
			console.log(`Added to folder successfully`);
			
			// Close the popover
			isOpen = false;
			
		} catch (error) {
			console.error('Failed to add property to folder:', error);
		} finally {
			isLoading = false;
			addingToFolderId = null;
		}
	}
</script>

<Popover bind:open={isOpen}>
	<PopoverTrigger asChild let:builder>
		<Button variant="outline" size="icon" builders={[builder]} title="Save to folder">
			<PlusCircle class="h-4 w-4" />
		</Button>
	</PopoverTrigger>
	<PopoverContent class="w-56 p-2">
		<div class="flex items-center justify-between mb-2">
			<h5 class="text-sm font-medium">Save to folder</h5>
			<Button 
				variant="ghost" 
				size="icon" 
				class="h-5 w-5" 
				onclick={() => isOpen = false}
			>
				<X class="h-3 w-3" />
			</Button>
		</div>
		
		{#if $folders && $folders.length > 0}
			<div class="max-h-40 overflow-y-auto space-y-1">
				{#each $folders as folder}
					<Button 
						variant="ghost" 
						size="sm" 
						class="w-full justify-start px-2 py-1 h-auto"
						disabled={isLoading && addingToFolderId === folder.id}
						onclick={() => addToFolder(folder.id)}
					>
						<Folder class="h-4 w-4 mr-2" />
						<span class="truncate">{folder.name}</span>
						{#if isLoading && addingToFolderId === folder.id}
							<span class="ml-auto animate-spin">⋯</span>
						{/if}
					</Button>
				{/each}
			</div>
		{:else}
			<div class="p-2 text-center text-muted-foreground text-sm">
				No folders found. Create a folder first.
			</div>
		{/if}
	</PopoverContent>
</Popover> 