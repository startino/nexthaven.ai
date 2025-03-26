<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { ArrowLeft, Search, Calendar, DollarSign } from 'lucide-svelte';
	import type { Json } from '$lib/types/database.types';

	// Get data from the server load function
	let { data } = $props();
	let searchHistory = $derived(data.searchHistory || []);
	
	// Format date function
	function formatDate(date: Date): string {
		const month = date.toLocaleString('default', { month: 'short' });
		return `${month} ${date.getDate()}`;
	}
	
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
</script>

<div class="space-y-6">
	<div class="flex justify-between items-center">
		<h1 class="text-3xl font-bold">Search History</h1>
		<Button 
			variant="outline" 
			class="flex items-center gap-2"
			href="/">
			<ArrowLeft class="h-4 w-4" />
			<span>Back to Home</span>
		</Button>
	</div>
	
	<Card>
		<CardHeader>
			<CardTitle>Past Searches</CardTitle>
			<CardDescription>
				View your previous searches and results
			</CardDescription>
		</CardHeader>
		<CardContent>
			{#if searchHistory.length === 0}
				<div class="py-6 text-center">
					<p class="text-muted-foreground">
						Your search history will appear here.
					</p>
					<div class="mt-4">
						<Button on:click={() => goto('/search')} variant="default">
							Start a New Search
						</Button>
					</div>
				</div>
			{:else}
				<div class="space-y-4">
					{#each searchHistory as search}
						<Card class="hover:bg-muted/50 transition-colors cursor-pointer" on:click={() => goto(`/history/${search.id}`)}>
							<CardContent class="p-4">
								<div class="flex flex-col gap-2">
									<div class="flex justify-between items-start">
										<h3 class="font-medium">{search.destination || 'Unnamed Search'}</h3>
										<Badge variant="outline" class="text-xs">
											{search.created_at ? new Date(search.created_at).toLocaleDateString() : 'Unknown date'}
										</Badge>
									</div>
									
									<div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
										<div class="flex items-center gap-1">
											<Calendar class="h-3.5 w-3.5" />
											<span>{search.date_range || 'No dates specified'}</span>
										</div>
										
										<div class="flex items-center gap-1">
											<DollarSign class="h-3.5 w-3.5" />
											<span>
												{#if isBudgetObject(search.budget)}
													Budget: ${search.budget.min} - ${search.budget.max}
												{:else}
													Budget: Not specified
												{/if}
											</span>
										</div>
										
										<div class="flex items-center gap-1">
											<Search class="h-3.5 w-3.5" />
											<span>{search.results_count || 0} results</span>
										</div>
									</div>
									
									{#if search.preferences}
										<p class="text-xs text-muted-foreground line-clamp-2 mt-1">
											{search.preferences}
										</p>
									{/if}
									
									{#if search.results_count > 0}
										<div class="mt-3">
											<Button 
												variant="outline" 
												size="sm" 
												class="text-xs"
												on:click={(e) => {
													e.stopPropagation();
													goto(`/history/${search.id}`);
												}}>
												View Results
											</Button>
										</div>
									{/if}
								</div>
							</CardContent>
						</Card>
					{/each}
				</div>
			{/if}
		</CardContent>
	</Card>
</div> 