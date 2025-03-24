<script lang="ts">
	import { goto } from '$app/navigation';
	import HomeScreen from '$lib/components/HomeScreen.svelte';
	
	function handleStartNewCampaign() {
		goto('/search');
	}
	
	function handleViewHistory() {
		goto('/history');
	}
</script>

<HomeScreen 
	onStartNewCampaign={handleStartNewCampaign}
	onViewHistory={handleViewHistory}
/> 