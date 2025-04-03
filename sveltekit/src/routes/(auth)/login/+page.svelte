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
	import { CheckCircle, Mail } from "lucide-svelte";

	let { data } = $props();
	const supabase = createSupabaseBrowserClient();
	
	// Check for conversion success in URL parameters
	let isConversionSuccess = $state($page.url.searchParams.get('conversion') === 'success');
	let redirectTo = $state($page.url.searchParams.get('redirectTo') || '/');
	
	// Pre-fill email from URL if available (useful after account conversion)
	let email = $state($page.url.searchParams.get('email') || "");
	let password = $state("");
	let isLoading = $state(false);
	let isGoogleLoading = $state(false);
	// Get error message from URL parameters if available (for OAuth errors)
	let errorMessage = $state($page.url.searchParams.get('error') || "");
	
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

	// Handle Google OAuth login
	async function handleGoogleLogin() {
		isGoogleLoading = true;
		errorMessage = "";
		
		try {
			// Initiate Google OAuth login with Supabase
			const { error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: `${window.location.origin}/auth/callback?redirectTo=${redirectTo}&provider=google`
				}
			});
			
			if (error) {
				errorMessage = error.message;
				isGoogleLoading = false;
			}
			// No need to redirect here as OAuth will handle it
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : "An error occurred during Google sign in";
			isGoogleLoading = false;
		}
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

			<div class="relative my-6">
				<div class="absolute inset-0 flex items-center">
					<Separator />
				</div>
				<div class="relative flex justify-center text-xs uppercase">
					<span class="bg-background px-2 text-muted-foreground">Or continue with</span>
				</div>
			</div>
			
			<Button
				type="button"
				variant="outline"
				class="w-full flex items-center justify-center gap-2"
				onclick={handleGoogleLogin}
				disabled={isGoogleLoading}
			>
				{#if isGoogleLoading}
					<span class="loading loading-spinner loading-xs"></span>
				{:else}
					<svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
						<g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
							<path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
							<path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
							<path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
							<path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
						</g>
					</svg>
					<span>Sign in with Google</span>
				{/if}
			</Button>
			
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