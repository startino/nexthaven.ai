<script lang="ts">
	// Import required shadcn components
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Search, Check } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';
	
	// Props for configurable elements
	let { 
		title = 'Create an account to continue',
		description = 'You\'ve used your free anonymous search. Create an account to unlock the full experience.',
		benefits = [
			'Full 14-day trial with unlimited searches',
			'Save your favorite properties',
			'Personalized recommendations',
			'Access to premium search filters'
		],
		redirectPath = '/search'
	} = $props();
</script>

<div class="w-full" in:fade={{ duration: 300 }}>
	<Card class="overflow-hidden border-primary/10">
		<CardHeader class="bg-primary/5 border-b border-primary/10">
			<CardTitle class="flex items-center gap-2">
				<Search class="h-5 w-5 text-primary" />
				<span>Free Search Used</span>
			</CardTitle>
		</CardHeader>
		
		<CardContent class="pt-6">
			<div class="space-y-4">
				<div>
					<h3 class="text-xl font-medium mb-2">{title}</h3>
					<CardDescription class="text-base">{description}</CardDescription>
				</div>
				
				<div class="bg-muted/50 rounded-lg p-4 border">
					<h4 class="font-medium mb-2">With an account, you'll get:</h4>
					<ul class="space-y-2">
						{#each benefits as benefit}
							<li class="flex items-start gap-2 text-sm">
								<Check class="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
								<span>{benefit}</span>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		</CardContent>
		
		<CardFooter class="flex flex-col sm:flex-row gap-3 border-t pt-4 pb-4 bg-muted/20">
			<Button href="/signup?redirect={redirectPath}" class="w-full sm:w-auto">
				Create Free Account
			</Button>
			<Button href="/login?redirect={redirectPath}" variant="outline" class="w-full sm:w-auto">
				Sign In
			</Button>
			
			<p class="text-xs text-muted-foreground mt-3 sm:ml-auto sm:mt-auto">
				No credit card required
			</p>
		</CardFooter>
	</Card>
</div> 