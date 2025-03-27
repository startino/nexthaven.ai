<script lang="ts">
	import { page } from '$app/stores';
	import { currentFolder, folderProperties, setFolderProperties } from '$lib/stores/folders';
	import { FolderService } from '$lib/services/folder.service';
	import type { UnifiedProperty } from '$lib/types/unified-property';
	import { PropertyCard } from '$lib/components/property';
	import { PackageSearch, FolderOpen } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	
	// Properties to display
	let properties = $state<UnifiedProperty[]>([]);
	let isLoading = $state(false);
	
	// Load properties when the current folder changes
	$effect(() => {
		if ($currentFolder) {
			loadFolderProperties($currentFolder.id);
		}
	});
	
	// Load properties for a folder
	async function loadFolderProperties(folderId: string) {
		if (!folderId) return;
		
		try {
			isLoading = true;
			
			// Get property IDs saved in this folder
			const propertyIds = await FolderService.getFolderProperties(folderId);
			
			if (propertyIds.length === 0) {
				properties = [];
				setFolderProperties(folderId, []);
				return;
			}
			
			// Here you would typically fetch the actual property data from your API
			// For now we're using a placeholder function
			const folderProps = await fetchPropertiesByIds(propertyIds);
			properties = folderProps;
			setFolderProperties(folderId, folderProps);
			
		} catch (error) {
			console.error('Failed to load folder properties:', error);
			properties = [];
		} finally {
			isLoading = false;
		}
	}
	
	// Placeholder function - in a real app, you would fetch from your API
	async function fetchPropertiesByIds(propertyIds: string[]): Promise<UnifiedProperty[]> {
		// In a real implementation, you would fetch the actual properties from your API
		// This is a placeholder that simulates an API call
		console.log('Fetching properties with IDs:', propertyIds);
		
		// Here you would call your API endpoint to get the properties
		// For example: 
		// const response = await fetch('/api/properties?ids=' + propertyIds.join(','));
		// return await response.json();
		
		// For now, return empty array
		return [];
	}
	
	// Handle property selection
	function handlePropertySelect(event: CustomEvent<UnifiedProperty>) {
		// This would open property details, navigate to property page, etc.
		console.log('Selected property:', event.detail);
	}
	
	// Remove a property from the folder
	async function removeProperty(property: UnifiedProperty) {
		if (!$currentFolder) return;
		
		try {
			await FolderService.removePropertyFromFolder($currentFolder.id, property.id);
			
			// Refresh the properties list
			await loadFolderProperties($currentFolder.id);
			
		} catch (error) {
			console.error('Failed to remove property from folder:', error);
		}
	}
</script>

<div class="space-y-4 py-4">
	<!-- Folder header -->
	{#if $currentFolder}
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-2">
				<FolderOpen class="h-5 w-5 text-muted-foreground" />
				<h2 class="text-2xl font-semibold">{$currentFolder.name}</h2>
			</div>
		</div>
		
		{#if $currentFolder.description}
			<p class="text-muted-foreground">{$currentFolder.description}</p>
		{/if}
	{:else}
		<h2 class="text-2xl font-semibold">Select a folder</h2>
	{/if}
	
	<!-- Properties grid -->
	{#if isLoading}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each Array(3) as _, i}
				<div class="animate-pulse rounded-lg bg-muted/50 h-64"></div>
			{/each}
		</div>
	{:else if properties.length > 0}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each properties as property}
				<div class="relative group">
					<PropertyCard 
						property={property}
						on:select={handlePropertySelect}
					/>
					<div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
						<Button
							variant="destructive"
							size="icon"
							class="h-6 w-6 rounded-full"
							onclick={() => removeProperty(property)}
						>
							<span class="sr-only">Remove from folder</span>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
							</svg>
						</Button>
					</div>
				</div>
			{/each}
		</div>
	{:else if $currentFolder}
		<div class="text-center py-16 space-y-3 border-2 border-dashed rounded-lg border-muted-foreground/20">
			<PackageSearch class="w-12 h-12 mx-auto text-muted-foreground/60" />
			<h3 class="text-lg font-medium">No properties in this folder</h3>
			<p class="text-muted-foreground max-w-md mx-auto">
				When you find properties you like, you can save them to this folder for later reference.
			</p>
		</div>
	{:else}
		<div class="text-center py-16 space-y-3 border-2 border-dashed rounded-lg border-muted-foreground/20">
			<FolderOpen class="w-12 h-12 mx-auto text-muted-foreground/60" />
			<h3 class="text-lg font-medium">Select a folder</h3>
			<p class="text-muted-foreground max-w-md mx-auto">
				Choose a folder from the sidebar to view its properties.
			</p>
		</div>
	{/if}
</div> 