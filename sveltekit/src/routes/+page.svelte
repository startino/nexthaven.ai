<script lang="ts">
	import { getContext } from 'svelte';
	import HomeScreen from '$lib/components/HomeScreen.svelte';
	import LoadingScreen from '$lib/components/LoadingScreen.svelte';
	// Import other screens as we create them 
	import { propertyService } from '$lib/services/api';
	import type { UnifiedProperty } from '$lib/types/unified-property';
	import { navigating, page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { ArrowRight, Search, Brain, Globe, Zap, Sparkles, ChevronRight, ScrollText, TimerOff, Merge } from 'lucide-svelte';

	// Benefits data
	const benefits = [

		{
			title: 'No BS scrolling',
			description: 'AI reviews every image, so you don\'t have to waste time sifting through irrelevant listings.',
			icon: TimerOff
		},
		{
			title: 'All-in-One Portal',
			description: 'Stop switching between platforms. Enjoy a unified hub for major rental sites.',
			icon: Merge
		},
		{
			title: 'Personalized',
			description: 'See properties matched to your specific taste and needs through AI.',
			icon: Sparkles
		},
	];

	// How it works steps
	const steps = [
		{
			title: 'Input Your Preferences',
			description: 'Describe the look, feel, or amenities you care about—like "sunlit writing nook" or "boho decor."'
		},
		{
			title: 'AI Analyzes Listings',
			description: 'Vision-capable language models interpret photos and tags, highlighting spaces that match your style.'
		},
		{
			title: 'Get Tailored Accommodations',
			description: 'Compare options across top platforms, all filtered by your preferences.'
		}
	];

</script>

<div class="flex flex-col items-center justify-center min-h-screen bg-background">
	<!-- Hero Section -->
	<section class="w-full max-w-6xl mx-auto px-4  py-12 md:py-32 text-center">
		<h1 class="text-5xl md:text-6xl font-serif leading-tight mb-4">
			Find Your Next Haven, <span class="text-gradient">Powered by AI</span>
		</h1>
		<p class="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
			All your short-term rental listings together. <br class="hidden md:block"/> Smart. Personalized. Effortless.
		</p>
		
		<!-- Primary CTA -->
		<div class="w-full max-w-md mx-auto">
			{#if $page.data.session}
				<Button 
					variant="default" 
					class="h-14 text-lg font-semibold flex items-center justify-between group rounded-2xl shadow-lg p-4"
					href="/search"
				>
					<div class="flex items-center">
						<Search class="mr-2" />
						Find Your Next Haven
					</div>
					<ArrowRight class="transition-transform group-hover:translate-x-1" />
				</Button>
			{:else}
				<a href="/login" class="block w-full">
					<div class="group bg-gradient-to-r from-[hsl(var(--hotel))] to-[hsl(var(--apartment))] rounded-xl overflow-hidden hover:shadow-lg transition-all">
						<div class="flex items-center justify-between px-6 py-5 rounded-xl">
							<div class="flex items-center gap-4">
								<Search size={24} class="text-primary-foreground" />
								<div class="text-left text-primary-foreground">
									<div class="text-xl font-bold">Find Your Next Haven</div>
								</div>
							</div>
							<ArrowRight size={24} class="text-primary-foreground transition-transform group-hover:translate-x-1" />
						</div>
					</div>
				</a>
			{/if}
		</div>
	</section>

	<!-- Key Benefits -->
	<section class="w-full bg-card py-16">
		<div class="max-w-6xl mx-auto px-4">
			<h2 class="text-3xl font-serif text-center mb-12">Key Benefits</h2>
			<div class="grid md:grid-cols-3 gap-8">
				{#each benefits as benefit}
					<div class="flex flex-col items-center text-center p-6 rounded-xl bg-background shadow-sm">
						<svelte:component this={benefit.icon} size={32} class="mb-4 text-accent" />
						<h3 class="text-xl font-semibold mb-2">{benefit.title}</h3>
						<p class="text-muted-foreground">{benefit.description}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- How It Works -->
	<section class="w-full bg-background py-16">
		<div class="max-w-6xl mx-auto px-4">
			<h2 class="text-3xl font-serif text-center mb-12">How It Works</h2>
			<div class="grid md:grid-cols-3 gap-8">
				{#each steps as step, i}
					<div class="flex flex-col p-6 rounded-xl bg-card">
						<div class="text-6xl font-bold mb-4 number-gradient">{i + 1}</div>
						<h3 class="text-xl font-semibold mb-2">{step.title}</h3>
						<p class="text-muted-foreground">{step.description}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Social Proof -->
	<!--
	<section class="w-full bg-background py-16">
		<div class="max-w-3xl mx-auto px-4 text-center">
			<blockquote class="text-xl italic text-muted-foreground">
				"I found my dream writing retreat in seconds—no more endless scrolling."
			</blockquote>
			<p class="mt-4 font-semibold">— Digital Nomad</p>
		</div>
	</section>
	-->

	<!-- Secondary CTA -->
	<section class="w-full py-16 bg-gradient-to-r from-[hsl(var(--hotel))] to-[hsl(var(--apartment))]">
		<div class="max-w-3xl mx-auto px-4 text-center">
			<h2 class="text-3xl font-serif mb-6 text-primary-foreground">25 seconds, or 10 clicks is all it takes.</h2>
			<Button  
				variant="card"
				size="lg"
				class="font-semibold"
				href='/search'
			>
				Find My Next Haven
				<ChevronRight class="ml-2" />
			</Button>
		</div>
	</section>

	<!-- Footer -->
	<footer class="w-full py-12 bg-card">
		<div class="max-w-6xl mx-auto px-4">
			<div class="grid md:grid-cols-2 gap-8 mb-8">
				<div>
					<h3 class="font-semibold mb-4">Quick Links</h3>
					<ul class="space-y-2">
						<li><a href="/contact" class="text-sm text-muted-foreground hover:text-accent">Contact</a></li>
						<li><a href="/privacy" class="text-sm text-muted-foreground hover:text-accent">Privacy</a></li>
						<li><a href="/terms" class="text-sm text-muted-foreground hover:text-accent">Terms</a></li>
					</ul>
				</div>
				<div>
					<h3 class="font-semibold mb-4">Contact</h3>
					<div class="space-y-2">
						<p class="text-sm text-muted-foreground">
							Interested in partnering with us?<br>
							<a href="mailto:jorge.lewis@starti.no" class="text-accent hover:underline">jorge.lewis@starti.no</a>
						</p>
						<a 
							href="https://instagram.com/nexthaven.ai" 
							target="_blank" 
							rel="noopener noreferrer" 
							class="text-sm text-muted-foreground hover:text-accent flex items-center gap-2"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
							@nexthaven.ai
						</a>
					</div>
				</div>
			</div>
			<div class="border-t border-border pt-8 text-center">
				<p class="text-sm text-muted-foreground">Made by nomads at <a href="https://starti.no" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">Startino</a></p>
			</div>
		</div>
	</footer>
</div>

<style>
	/* Using the utility classes defined in app.css */
	:global(.text-gradient) {
		@apply from-[hsl(var(--hotel))] to-[hsl(var(--apartment))] bg-gradient-to-r bg-clip-text text-transparent;
	}

	:global(.button-gradient) {
		@apply from-[hsl(var(--hotel))] to-[hsl(var(--apartment))] hover:from-[hsl(var(--hotel))]/90 hover:to-[hsl(var(--apartment))]/90 bg-gradient-to-r;
	}

	:global(.number-gradient) {
		@apply from-[hsl(var(--hotel))] to-[hsl(var(--apartment))] bg-gradient-to-r bg-clip-text text-transparent;
	}
</style>

