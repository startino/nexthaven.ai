<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { setSearchQuery, clearStore } from '$lib/stores/properties';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	
	// Get data from loader
	let { data } = $props();
	
	// Local state
	let searchInput = $state('');
	let destination = $state('');
	let startDate = $state('');
	let endDate = $state('');
	let adults = $state(2);
	let children = $state(0);
	let budgetMin = $state(200);
	let budgetMax = $state(600);
	
	// Derived state
	let isFormValid = $derived(
		destination && startDate && endDate && adults > 0 && budgetMin > 0 && budgetMax >= budgetMin
	);
	
	// Clear the store on mount
	clearStore();
	
	function handleSearch() {
		if (!isFormValid) return;
		
		// Build search query object
		const searchQuery = JSON.stringify({
			query: destination,
			date: `${startDate} to ${endDate}`,
			budget: {
				min: budgetMin,
				max: budgetMax
			},
			adults,
			children,
			number_of_rooms: 1
		});
		
		// Store the search query
		setSearchQuery(searchQuery);
		
		// Navigate to loading page
		goto('/loading');
	}
	
	function selectDestination(dest: string) {
		destination = dest;
	}
</script>

<div class="max-w-4xl mx-auto space-y-6">
	<div class="flex justify-between items-center">
		<h1 class="text-3xl font-bold">Search Properties</h1>
		<Button variant="outline" onclick={() => goto('/')}>
			Back to Home
		</Button>
	</div>
	
	<Card>
		<CardHeader>
			<CardTitle>Find Your Perfect Stay</CardTitle>
		</CardHeader>
		<CardContent>
			<form class="space-y-6">
				<div class="space-y-4">
					<div>
						<Label for="destination">Destination</Label>
						<Input 
							id="destination" 
							type="text" 
							placeholder="Where are you going?" 
							bind:value={destination}
						/>
						
						{#if data?.popularDestinations?.length}
							<div class="mt-2">
								<p class="text-xs text-muted-foreground mb-2">Popular destinations:</p>
								<div class="flex flex-wrap gap-2">
									{#each data.popularDestinations as dest}
										<Badge 
											variant="outline" 
											onclick={() => selectDestination(dest.name)}
											class="cursor-pointer hover:bg-accent/20"
										>
											{dest.name}
										</Badge>
									{/each}
								</div>
							</div>
						{/if}
					</div>
					
					<Separator />
					
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="checkin">Check-in</Label>
							<Input 
								id="checkin" 
								type="date" 
								bind:value={startDate}
							/>
						</div>
						<div class="space-y-2">
							<Label for="checkout">Check-out</Label>
							<Input 
								id="checkout" 
								type="date" 
								bind:value={endDate}
							/>
						</div>
					</div>
					
					<Separator />
					
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="adults">Adults</Label>
							<Input 
								id="adults" 
								type="number" 
								min="1" 
								bind:value={adults}
							/>
						</div>
						<div class="space-y-2">
							<Label for="children">Children</Label>
							<Input 
								id="children" 
								type="number" 
								min="0" 
								bind:value={children}
							/>
						</div>
					</div>
					
					<Separator />
					
					<div class="space-y-2">
						<Label>Budget Range (per night)</Label>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Input 
									type="number" 
									placeholder="Min" 
									bind:value={budgetMin}
								/>
							</div>
							<div>
								<Input 
									type="number" 
									placeholder="Max" 
									bind:value={budgetMax}
								/>
							</div>
						</div>
					</div>
				</div>
			</form>
		</CardContent>
		<CardFooter>
			<Button 
				onclick={handleSearch}
				disabled={!isFormValid}
				class="w-full"
			>
				Search Properties
			</Button>
		</CardFooter>
	</Card>
</div> 