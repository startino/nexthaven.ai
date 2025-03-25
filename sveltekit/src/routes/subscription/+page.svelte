<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { Crown } from "lucide-svelte";
	
	let { data } = $props();
</script>

<div class="container mx-auto py-12 px-4">
	<div class="max-w-4xl mx-auto">
		<h1 class="text-3xl font-bold text-gradient mb-8">Premium Subscription</h1>
		
		<div class="grid gap-8 md:grid-cols-2">
			<div class="bg-black/20 border border-border p-6 rounded-lg">
				<div class="flex items-center gap-3 mb-4">
					<div class="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
						<Crown size={24} class="text-gradient" />
					</div>
					<div>
						<h2 class="text-xl font-semibold">Free Plan</h2>
						<p class="text-muted-foreground text-sm">Current plan</p>
					</div>
				</div>
				
				<ul class="space-y-3 my-6">
					<li class="flex items-center gap-2 text-sm">
						<span class="text-muted-foreground">✓</span>
						<span>Basic search functionality</span>
					</li>
					<li class="flex items-center gap-2 text-sm">
						<span class="text-muted-foreground">✓</span>
						<span>Limited results per search</span>
					</li>
					<li class="flex items-center gap-2 text-sm">
						<span class="text-muted-foreground">✓</span>
						<span>Standard search filters</span>
					</li>
				</ul>
				
				<p class="text-xl font-bold mb-6">$0<span class="text-sm text-muted-foreground font-normal">/month</span></p>
				
				<Button disabled variant="outline" class="w-full">Current Plan</Button>
			</div>
			
			<div class="bg-primary/5 border border-primary/20 p-6 rounded-lg relative overflow-hidden">
				<div class="absolute top-0 right-0 bg-primary/20 text-xs font-medium py-1 px-3 rounded-bl-lg">
					RECOMMENDED
				</div>
				
				<div class="flex items-center gap-3 mb-4">
					<div class="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
						<Crown size={24} class="text-gradient" />
					</div>
					<div>
						<h2 class="text-xl font-semibold">Premium Plan</h2>
						<p class="text-muted-foreground text-sm">Unlock all features</p>
					</div>
				</div>
				
				<ul class="space-y-3 my-6">
					<li class="flex items-center gap-2 text-sm">
						<span class="text-primary">✓</span>
						<span>Advanced search algorithms</span>
					</li>
					<li class="flex items-center gap-2 text-sm">
						<span class="text-primary">✓</span>
						<span>Unlimited search results</span>
					</li>
					<li class="flex items-center gap-2 text-sm">
						<span class="text-primary">✓</span>
						<span>Premium filters and sorting</span>
					</li>
					<li class="flex items-center gap-2 text-sm">
						<span class="text-primary">✓</span>
						<span>Save and compare properties</span>
					</li>
					<li class="flex items-center gap-2 text-sm">
						<span class="text-primary">✓</span>
						<span>Priority customer support</span>
					</li>
				</ul>
				
				<p class="text-xl font-bold mb-6">$9.99<span class="text-sm text-muted-foreground font-normal">/month</span></p>
				
				<Button class="w-full button-gradient">Upgrade Now</Button>
			</div>
		</div>
		
		<div class="mt-8 text-center text-sm text-muted-foreground">
			Questions about our plans? <a href="#" class="text-primary underline">Contact us</a>
		</div>
	</div>
</div> 