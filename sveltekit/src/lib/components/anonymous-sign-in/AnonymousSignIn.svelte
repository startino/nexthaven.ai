<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { signInAnonymously } from "$lib/supabase/auth";
	import { goto } from "$app/navigation";
	
	let isLoading = $state(false);
	let errorMessage = $state("");
	
	// Optional props
	let { buttonText = "Try Without Signing Up", redirectTo = "/" } = $props<{
		buttonText?: string;
		redirectTo?: string;
	}>();
	
	async function handleAnonymousSignIn() {
		isLoading = true;
		errorMessage = "";
		
		try {
			const result = await signInAnonymously();
			
			if (result.error) {
				errorMessage = result.error.message;
				isLoading = false;
				return;
			}
			
			// Redirect after successful anonymous sign-in
			window.location.href = redirectTo;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
			isLoading = false;
		}
	}
</script>

<div>
	{#if errorMessage}
		<div class="p-3 mb-3 rounded-md bg-red-500/20 border border-red-500/40">
			<p class="text-sm text-red-400">{errorMessage}</p>
		</div>
	{/if}
	
	<Button 
		variant="outline" 
		onclick={handleAnonymousSignIn} 
		disabled={isLoading} 
		class="w-full"
	>
		{isLoading ? "Starting trial..." : buttonText}
	</Button>
</div> 