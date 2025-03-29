<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { ArrowLeft, Search, Calendar, DollarSign, Clock, Eye } from 'lucide-svelte';
	import type { Json } from '$lib/types/database.types';

	// Get data from the server load function
	let { data } = $props();
	let searchHistory = $derived(data.searchHistory || []);
	
	// Helper function to check if budget has min and max properties
	function isBudgetObject(budget: Json | null): budget is { min: number; max: number } {
		return (
			typeof budget === 'object' && 
			budget !== null && 
			'min' in budget && 
			'max' in budget &&
			typeof budget.min === 'number' &&
			typeof budget.max === 'number'
		);
	}
	
	// Format date in a readable format
	function formatDate(dateString: string): string {
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch (e) {
			return dateString || 'Unknown date';
		}
	}
</script>

<div class="min-h-screen bg-background text-foreground">
	<div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
		<div class="flex justify-between items-center">
			<h1 class="text-xl md:text-3xl font-serif italic text-foreground">Search History</h1>
		</div>
		
		{#if !searchHistory.length}
			<div class="flex flex-col items-center justify-center py-16">
				<div class="text-center space-y-4">
					<div class="text-2xl font-bold mb-2">No search history found</div>
					<div class="text-muted-foreground mb-8">You haven't performed any searches yet.</div>
					<Button 
						onclick={() => goto('/search')}
						class="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6 py-2"
					>
						<Search size={18} class="mr-2" />
						Start a New Search
					</Button>
				</div>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-6">
				{#each searchHistory as search}
					<!-- Use a navigation wrapper to handle click -->
					<button onclick={() => {
						if (search && search.id) {
							goto(`/history/${search.id}`);
						}
					}}>
						<Card 
							class="bg-card border-border text-foreground hover:shadow-xl hover:shadow-accent/20 transition-all cursor-pointer"
						>
							<CardContent class="p-6">
								<div class="flex flex-col md:flex-row justify-between gap-4">
									<div class="space-y-3">
										<div class="flex items-center gap-2">
											<h3 class="text-xl font-medium">{search.destination || 'Unnamed Search'}</h3>
											<Badge variant={search.results_count && search.results_count > 0 ? "default" : "outline"} class="font-normal">
												{search.results_count || 0} {(search.results_count || 0) === 1 ? 'result' : 'results'}
											</Badge>
										</div>
										
										<div class="flex flex-wrap gap-4 text-sm text-muted-foreground">
											<div class="flex items-center gap-1.5">
												<Calendar class="h-4 w-4" />
												<span>{search.date_range || 'No dates specified'}</span>
											</div>
											
											<div class="flex items-center gap-1.5">
												<DollarSign class="h-4 w-4" />
												<span>
													{#if isBudgetObject(search.budget)}
														${search.budget.min} - ${search.budget.max}
													{:else}
														Budget not specified
													{/if}
												</span>
											</div>
											
											<div class="flex items-center gap-1.5">
												<Clock class="h-4 w-4" />
												<span>{formatDate(search.created_at || '')}</span>
											</div>
										</div>
										
										{#if search.preferences}
											<div class="text-sm">
												<p class="text-foreground/70 line-clamp-2">
													{search.preferences}
												</p>
											</div>
										{/if}
									</div>
								</div>
							</CardContent>
						</Card>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div> 