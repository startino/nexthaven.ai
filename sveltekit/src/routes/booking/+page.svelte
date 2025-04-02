<script lang="ts">
	import { goto } from '$app/navigation';
	import { getSelectedProperty } from '$lib/stores/properties.svelte';
	import { onMount } from 'svelte';
	import { BookingComponent } from '$lib/components/booking';
	
	// Get server data
	let { data } = $props();
	let searchId = $derived(data.searchId);
	
	// Local state - get property using Svelte 5 runes
	let property = $derived(getSelectedProperty());
	
	// Redirect if no property is selected
	$effect(() => {
		if (!property) {
			// If no property selected, redirect to compare with searchId if available
			const searchIdParam = searchId ? `?searchId=${searchId}` : '';
			goto('/compare' + searchIdParam);
		}
	});
	
	// Function to handle back button click with search ID preservation
	function goBack() {
		const searchIdParam = searchId ? `?searchId=${searchId}` : '';
		goto('/compare' + searchIdParam);
	}
</script>

<BookingComponent 
	property={property} 
	backText="Back to compare"
	on:back={goBack}
/> 