<script lang="ts">
	import { page } from '$app/stores';
	import { cn } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	
	// Props
	let { className = '' } = $props<{ className?: string }>();
</script>

<nav class={cn("sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
	<div class="container flex h-14 max-w-screen-2xl items-center">
		<a href="/" class="mr-6 flex items-center space-x-2">
			<span class="font-bold text-xl hidden sm:inline-block">NextHaven.ai</span>
		</a>
		
		<div class="flex items-center justify-between flex-1 space-x-2 md:justify-end">
			<div class="flex items-center">
				<Button
					variant={$page.url.pathname === '/home' ? "default" : "ghost"}
					size="sm"
					href="/home"
					class="text-sm font-medium mr-1"
				>
					Home
				</Button>
				<Button
					variant={$page.url.pathname === '/search' ? "default" : "ghost"}
					size="sm"
					href="/search"
					class="text-sm font-medium mx-1"
				>
					Search
				</Button>
				<Button
					variant={$page.url.pathname === '/history' ? "default" : "ghost"}
					size="sm"
					href="/history"
					class="text-sm font-medium ml-1"
				>
					History
				</Button>
			</div>
		</div>
	</div>
</nav> 