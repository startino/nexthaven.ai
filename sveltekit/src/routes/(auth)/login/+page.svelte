<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { goto } from "$app/navigation";

	let { data } = $props();
	const { supabase } = data;
	
	let email = $state("");
	let password = $state("");
	let isLoading = $state(false);
	let errorMessage = $state("");
	
	async function handleLogin() {
		isLoading = true;
		errorMessage = "";
		
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password
		});
		
		if (error) {
			errorMessage = error.message;
			isLoading = false;
			return;
		}
		
		goto("/");
	}
</script>

<div class="flex min-h-screen items-center justify-center px-4">
	<Card class="w-full max-w-md">
		<CardHeader>
			<CardTitle class="text-2xl text-center text-gradient">Sign In</CardTitle>
			<CardDescription class="text-center">Enter your credentials to access your account</CardDescription>
		</CardHeader>
		<CardContent>
			<form class="space-y-4" onsubmit={(e) => { e.preventDefault(); handleLogin(); }}>
				<div class="space-y-2">
					<Label for="email">Email</Label>
					<Input id="email" type="email" placeholder="name@example.com" bind:value={email} required />
				</div>
				<div class="space-y-2">
					<Label for="password">Password</Label>
					<Input id="password" type="password" bind:value={password} required />
				</div>
				{#if errorMessage}
					<p class="text-sm text-red-500">{errorMessage}</p>
				{/if}
				<Button type="submit" class="w-full button-gradient" disabled={isLoading}>
					{isLoading ? 'Signing in...' : 'Sign In'}
				</Button>
			</form>
		</CardContent>
		<CardFooter class="flex flex-col space-y-4">
			<div class="text-sm text-center">
				<a href="/forgot-password" class="underline hover:text-primary">Forgot password?</a>
			</div>
			<div class="text-sm text-center">
				Don't have an account?
				<a href="/signup" class="underline hover:text-primary">Sign up</a>
			</div>
		</CardFooter>
	</Card>
</div> 