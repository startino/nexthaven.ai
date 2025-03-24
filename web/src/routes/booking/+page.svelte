<script lang="ts">
	import { propertyStore } from '$lib/stores/properties';
	import { goto } from '$app/navigation';
	import { formatCurrency } from '$lib/utils';
	import { get } from 'svelte/store';
	import { onMount } from 'svelte';
	import type { UnifiedProperty } from '$lib/types/unified-property';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Separator } from '$lib/components/ui/separator';
	
	// Local state
	let selectedProperty = $state<UnifiedProperty | null>(null);
	let formData = $state({
		firstName: '',
		lastName: '',
		email: '',
		phone: '',
		specialRequests: ''
	});
	let isSubmitting = $state(false);
	let bookingComplete = $state(false);
	
	// Get selected property on mount
	onMount(() => {
		const storeData = get(propertyStore);
		if (!storeData.selectedProperty) {
			// If no property selected, redirect to compare
			goto('/compare');
		} else {
			selectedProperty = storeData.selectedProperty;
		}
	});
	
	// Handle form submission
	async function handleSubmit() {
		isSubmitting = true;
		
		// Simulate API call
		await new Promise(resolve => setTimeout(resolve, 1500));
		
		// Show booking confirmation
		bookingComplete = true;
		isSubmitting = false;
	}
</script>

<div class="space-y-6 max-w-6xl mx-auto">
	<div class="flex justify-between items-center">
		<h1 class="text-3xl font-bold">Complete Your Booking</h1>
		<Button variant="outline" onclick={() => goto('/compare')}>
			Back to Compare
		</Button>
	</div>
	
	{#if bookingComplete}
		<Card class="border-green-500/20 bg-green-500/5">
			<CardContent class="flex flex-col items-center text-center py-8 space-y-4">
				<div class="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 mb-2">
					<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
				</div>
				<CardTitle class="text-2xl text-green-500">Booking Confirmed!</CardTitle>
				<p class="text-lg">We've sent a confirmation email to {formData.email}</p>
				<Button 
					onclick={() => goto('/search')}
					class="mt-4"
				>
					Return to Search
				</Button>
			</CardContent>
		</Card>
	{:else if selectedProperty}
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
			<!-- Property Details -->
			<Card>
				<div class="h-64 overflow-hidden">
					<img 
						src={selectedProperty.media.main_image || 'https://via.placeholder.com/800x400?text=No+Image'} 
						alt={selectedProperty.name}
						class="w-full h-full object-cover"
					/>
				</div>
				
				<CardHeader class="space-y-1 pb-2">
					<div class="flex justify-between items-start">
						<CardTitle class="text-2xl">{selectedProperty.name}</CardTitle>
						<Badge>{selectedProperty.score}</Badge>
					</div>
					<CardDescription>{selectedProperty.location}</CardDescription>
				</CardHeader>
				
				<CardContent class="space-y-4 pb-0">
					<div class="flex items-center gap-3 text-sm text-muted-foreground">
						<span>{selectedProperty.capacity.bedrooms} bedrooms</span>
						<span>•</span>
						<span>{selectedProperty.capacity.beds} beds</span>
						{#if selectedProperty.features.size}
							<span>•</span>
							<span>{selectedProperty.features.size} m²</span>
						{/if}
					</div>
					
					<div>
						<h3 class="font-medium mb-2">Amenities</h3>
						<div class="flex flex-wrap gap-2">
							{#each selectedProperty.features.amenities as amenity}
								<Badge variant="outline">{amenity}</Badge>
							{/each}
						</div>
					</div>
					
					<Separator />
					
					<div class="flex justify-between items-center pt-2">
						<div>
							<div class="text-2xl font-bold">{formatCurrency(selectedProperty.pricing.total)}</div>
							<div class="text-sm text-muted-foreground">total price</div>
						</div>
						<Badge variant="secondary">{selectedProperty.source}</Badge>
					</div>
				</CardContent>
			</Card>
			
			<!-- Booking Form -->
			<Card>
				<CardHeader>
					<CardTitle>Guest Details</CardTitle>
					<CardDescription>Please fill in your information to complete the booking</CardDescription>
				</CardHeader>
				<CardContent>
					<form on:submit|preventDefault={handleSubmit} class="space-y-4">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label for="firstName">First Name</Label>
								<Input 
									id="firstName" 
									bind:value={formData.firstName} 
									required
								/>
							</div>
							
							<div class="space-y-2">
								<Label for="lastName">Last Name</Label>
								<Input 
									id="lastName" 
									bind:value={formData.lastName} 
									required
								/>
							</div>
						</div>
						
						<div class="space-y-2">
							<Label for="email">Email</Label>
							<Input 
								id="email" 
								type="email"
								bind:value={formData.email} 
								required
							/>
						</div>
						
						<div class="space-y-2">
							<Label for="phone">Phone Number</Label>
							<Input 
								id="phone" 
								type="tel"
								bind:value={formData.phone} 
								required
							/>
						</div>
						
						<div class="space-y-2">
							<Label for="specialRequests">Special Requests</Label>
							<Textarea 
								id="specialRequests" 
								bind:value={formData.specialRequests} 
								rows={3}
							/>
						</div>
						
						<Button 
							type="submit"
							disabled={isSubmitting}
							class="w-full"
						>
							{isSubmitting ? 'Processing...' : 'Complete Booking'}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	{:else}
		<Card>
			<CardContent class="text-center py-6">
				<p class="text-muted-foreground">Loading property details...</p>
			</CardContent>
		</Card>
	{/if}
</div> 