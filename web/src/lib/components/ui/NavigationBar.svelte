<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
</script>

<header class="w-full bg-black/60 backdrop-blur-md py-4 px-6 border-b border-border fixed top-0 z-50">
	<div class="container mx-auto flex justify-between items-center">
		<div class="flex items-center">
			<a href="/" class="text-xl font-bold">nexthaven.ai</a>
		</div>
		
		<div class="flex items-center gap-6">
			{#if $page.url.pathname !== '/search'}
				<Button 
					variant="outline" 
					class="text-sm"
					onclick={() => goto('/search')}
				>
					Search
				</Button>
			{/if}
			
			<Button 
				variant="ghost" 
				class="text-sm"
				onclick={() => goto('/history')}
			>
				History
			</Button>
		</div>
	</div>
</header>

<!-- Add spacing to account for fixed header -->
<div class="h-16"></div> 