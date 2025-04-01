<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { goto } from "$app/navigation";
	import { Separator } from "$lib/components/ui/separator";
	import { createSupabaseBrowserClient } from "$lib/supabase/client";
	import { isAnonymousUser } from "$lib/supabase/auth";
	import { page } from "$app/stores";
	import { CheckCircle } from "lucide-svelte";

	let { data } = $props();
	const supabase = createSupabaseBrowserClient();
	
	// Check for conversion success in URL parameters
	let isConversionSuccess = $state($page.url.searchParams.get('conversion') === 'success');
	let redirectTo = $state($page.url.searchParams.get('redirectTo') || '/');
	
	// Pre-fill email from URL if available (useful after account conversion)
	let email = $state($page.url.searchParams.get('email') || "");
	let password = $state("");
	let isLoading = $state(false);
	let errorMessage = $state("");
	
	// Check if user is already using an anonymous account
	let isCurrentlyAnonymous = $state(false);
	
	// Fix: Use a non-async function in $effect
	$effect(() => {
		// Use immediately invoked function expression for async code
		(async () => {
			const { data: { session } } = await supabase.auth.getSession();
			isCurrentlyAnonymous = session?.user ? isAnonymousUser(session.user) : false;
		})();
	});
	
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
		
		// Redirect to the specified redirectTo URL or default to home
		goto(redirectTo);
	}
</script>

<div class="flex min-h-screen items-center justify-center px-4">
	<Card class="w-full max-w-md">
		<CardHeader>
			<CardTitle class="text-2xl text-center text-gradient">Sign In</CardTitle>
			<CardDescription class="text-center">
				{#if isCurrentlyAnonymous}
					You're using a temporary account. Sign in to access your data permanently.
				{:else}
					Enter your credentials to access your account
				{/if}
			</CardDescription>
		</CardHeader>
		<CardContent>
			{#if isConversionSuccess}
				<div class="mb-6 p-4 bg-green-100/20 border border-green-500/30 rounded-lg flex items-start gap-3">
					<CheckCircle class="text-green-500 shrink-0 mt-0.5" size={18} />
					<div>
						<p class="text-sm text-green-400 font-medium">Account upgraded successfully!</p>
						<p class="text-xs text-green-400/80 mt-1">
							Please check your email for a verification link, then sign in with your new credentials to continue.
						</p>
					</div>
				</div>
			{/if}
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
			
			{#if isCurrentlyAnonymous}
				<div class="mt-6 p-3 bg-primary/10 rounded-lg border border-primary/20">
					<p class="text-sm">
						<strong>You're using a temporary account.</strong> <br>
						Create a permanent account to keep your data and settings beyond the trial period.
					</p>
					<Button 
						variant="outline" 
						class="w-full mt-3" 
						onclick={() => goto('/signup?convert=true')}
					>
						Upgrade to Permanent Account
					</Button>
				</div>
			{/if}
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