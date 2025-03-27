<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { CollectionList, CollectionProperties } from '$lib/components/folder';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft } from 'lucide-svelte';

	// Check authentication on mount
	$effect(() => {
		if (!$page.data.session) {
			goto('/auth/login');
		}
	});
</script>

<div class="min-h-screen bg-background">
	<div class="max-w-7xl mx-auto px-4 py-6 lg:py-8">
		<!-- Page header -->
		<div class="mb-6">
			<Button 
				variant="ghost" 
				class="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
				href="/"
			>
				<ArrowLeft size={18} />
				<span>Back to home</span>
			</Button>
			
			<h1 class="text-3xl font-serif">My Saved Properties</h1>
			<p class="text-muted-foreground mt-2">Organize and manage your saved properties in collections.</p>
		</div>
		
		<!-- Main content -->
		<div class="grid grid-cols-1 md:grid-cols-12 gap-6">
			<!-- Sidebar -->
			<div class="md:col-span-3 border rounded-lg p-4 bg-card">
				<CollectionList />
			</div>
			
			<!-- Main content area -->
			<div class="md:col-span-9 border rounded-lg p-6 bg-card">
				<CollectionProperties />
			</div>
		</div>
	</div>
</div> 