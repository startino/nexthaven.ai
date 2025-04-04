<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { goto } from "$app/navigation";
	import { User, Mail, Lock, Eye, EyeOff, ArrowUp, AlertCircle } from "lucide-svelte";
	import { convertAnonymousUser, isAnonymousUser } from "$lib/supabase/auth";
	import { page } from "$app/stores";
	import { createSupabaseBrowserClient } from "$lib/supabase/client";
	import { Separator } from "$lib/components/ui/separator";

	let { data } = $props();
	const supabase = createSupabaseBrowserClient();
	
	let name = $state("");
	let email = $state("");
	let password = $state("");
	let isLoading = $state(false);
	let isGoogleLoading = $state(false);
	let errorMessage = $state("");
	let successMessage = $state("");
	let showPassword = $state(false);
	let isConvertingAnonymous = $state($page.url.searchParams.get('convert') === 'true');
	
	// Check if user was redirected from search page
	let isFromSearch = $state($page.url.searchParams.get('redirect') === '/search');
	
	// Check if the current user is anonymous regardless of the convert parameter
	let isCurrentlyAnonymous = $state(false);
	let currentUserId = $state<string | null>(null);
	
	$effect(() => {
		// Immediately invoke an async function
		(async () => {
			const { data: { session } } = await supabase.auth.getSession();
			isCurrentlyAnonymous = session?.user ? isAnonymousUser(session.user) : false;
			
			// Store the user ID for the OAuth upgrade flow
			if (session?.user) {
				currentUserId = session.user.id;
			}
			
			// If we have an anonymous user and the convert parameter wasn't passed,
			// we should still suggest conversion
			if (isCurrentlyAnonymous && !isConvertingAnonymous) {
				isConvertingAnonymous = true;
			}
		})();
	});
	
	// Form validation
	let isEmailValid = $derived(validateEmail(email) || email === "");
	let isPasswordValid = $derived(password.length >= 6 || password === "");
	
	function validateEmail(email: string): boolean {
		const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return re.test(email);
	}
	
	function togglePasswordVisibility() {
		showPassword = !showPassword;
	}
	
	async function handleSignup() {
		isLoading = true;
		errorMessage = "";
		successMessage = "";
		
		// Final validation
		if (!name.trim()) {
			errorMessage = "Please enter your name";
			isLoading = false;
			return;
		}
		
		if (!validateEmail(email)) {
			errorMessage = "Please enter a valid email address";
			isLoading = false;
			return;
		}
		
		if (password.length < 6) {
			errorMessage = "Password must be at least 6 characters";
			isLoading = false;
			return;
		}
		
		// Check if user is trying to convert an anonymous account
		if (isConvertingAnonymous && isCurrentlyAnonymous) {
			const { success, error, message } = await convertAnonymousUser(
				supabase,
				email,
				password,
				name
			);
			
			if (error) {
				errorMessage = error.message;
				isLoading = false;
				return;
			}
			
			// Always redirect to login after conversion
			// The user needs to verify their email and login with their new credentials
			const redirectTo = $page.url.searchParams.get('redirectTo') || '/';
			window.location.href = `/login?conversion=success&email=${encodeURIComponent(email)}&redirectTo=${encodeURIComponent(redirectTo)}`;
			return;
		}
		
		// Normal signup
		const { data: authData, error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					name
				},
				emailRedirectTo: `${window.location.origin}/login`
			}
		});
		
		if (error) {
			errorMessage = error.message;
			isLoading = false;
			return;
		}
		
		// Success - show confirmation message and redirect
		window.location.href = `/signup/confirmation?email=${encodeURIComponent(email)}`;
	}
	
	// Handle Google OAuth signup/upgrade
	async function handleGoogleSignup() {
		isGoogleLoading = true;
		errorMessage = "";
		
		try {
			// Add special upgrade parameter if converting anonymous account
			const extraParams = isConvertingAnonymous && isCurrentlyAnonymous && currentUserId 
				? `&upgrade=true&anonymousId=${currentUserId}` 
				: '';
			
			// Initiate Google OAuth signup with Supabase
			const { error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: `${window.location.origin}/auth/callback?provider=google${extraParams}`
				}
			});
			
			if (error) {
				errorMessage = error.message;
				isGoogleLoading = false;
			}
			// No need to redirect here as OAuth will handle it
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : "An error occurred during Google sign up";
			isGoogleLoading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center px-4 overflow-y-auto">
	<Card class="w-full max-w-md bg-white/5 backdrop-blur-sm">
		{#if isFromSearch && isCurrentlyAnonymous}
			<div class="px-6 pt-6 pb-0">
				<div class="p-3 rounded-md bg-yellow-500/20 border border-yellow-500/40 flex gap-2 items-start">
					<AlertCircle class="text-yellow-400 shrink-0 mt-0.5" size={18} />
					<div>
						<p class="text-sm text-yellow-300 font-medium">Search limit reached</p>
						<p class="text-xs text-yellow-300/80 mt-1">
							You've exhausted your anonymous search limit. Create an account to unlock more searches and additional features.
						</p>
					</div>
				</div>
			</div>
		{/if}
		<CardHeader>
			{#if isConvertingAnonymous && isCurrentlyAnonymous}
				<div class="flex justify-center mb-2">
					<div class="bg-primary/20 text-primary px-3 py-1 rounded-full flex items-center gap-1 text-xs font-medium">
						<ArrowUp size={12} />
						Create Account
					</div>
				</div>
			{/if}
			<CardTitle class="text-2xl text-center text-gradient">
				Create Account
			</CardTitle>
			<CardDescription class="text-center">
				{#if isFromSearch && isCurrentlyAnonymous}
					Create an account to continue searching and unlock all features
				{:else if isConvertingAnonymous && isCurrentlyAnonymous}
					Keep your data and continue your journey with a permanent account
				{:else}
					Sign up for a new account to get started
				{/if}
			</CardDescription>
		</CardHeader>
		<CardContent>
			{#if isConvertingAnonymous && isCurrentlyAnonymous}
				<div class="mb-6 p-3 bg-primary/10 rounded-lg border border-primary/20">
					<p class="text-sm">
						{#if isFromSearch}
							By creating an account, you'll get access to unlimited searches and all premium features. Your existing data will be preserved.
						{:else}
							By creating a permanent account, all your existing data and settings will be preserved.
						{/if}
					</p>
				</div>
			{/if}
			
			<Button
				type="button"
				variant="outline"
				class="w-full flex items-center justify-center gap-2 mb-6"
				onclick={handleGoogleSignup}
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
					<span>Sign up with Google</span>
				{/if}
			</Button>
			
			<div class="relative my-6">
				<div class="absolute inset-0 flex items-center">
					<Separator />
				</div>
				<div class="relative flex justify-center text-xs uppercase">
					<span class="bg-background px-2 text-muted-foreground">Or continue with email</span>
				</div>
			</div>
			
			<form class="space-y-6" onsubmit={(e) => { e.preventDefault(); handleSignup(); }}>
				<div class="space-y-2">
					<Label for="name" class="flex items-center gap-1.5">
						<User size={14} />
						Name
					</Label>
					<Input 
						id="name" 
						type="text" 
						placeholder="Your name" 
						bind:value={name} 
						required 
						class="border-border/50 focus-visible:ring-primary"
					/>
				</div>
				<div class="space-y-2">
					<Label for="email" class="flex items-center gap-1.5">
						<Mail size={14} />
						Email
					</Label>
					<Input 
						id="email" 
						type="email" 
						placeholder="name@example.com" 
						bind:value={email} 
						required 
						class="{!isEmailValid && email ? 'border-red-500' : 'border-border/50'} focus-visible:ring-primary"
					/>
					{#if !isEmailValid && email}
						<p class="text-xs text-red-500 mt-1">Please enter a valid email address</p>
					{/if}
				</div>
				<div class="space-y-2">
					<Label for="password" class="flex items-center gap-1.5">
						<Lock size={14} />
						Password
					</Label>
					<div class="relative">
						<Input 
							id="password" 
							type={showPassword ? "text" : "password"} 
							bind:value={password} 
							required 
							class="{!isPasswordValid && password ? 'border-red-500' : 'border-border/50'} focus-visible:ring-primary pr-10"
						/>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							class="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
							onclick={togglePasswordVisibility}
							tabindex={-1}
						>
							{#if showPassword}
								<EyeOff size={16} />
							{:else}
								<Eye size={16} />
							{/if}
							<span class="sr-only">{showPassword ? 'Hide' : 'Show'} password</span>
						</Button>
					</div>
					{#if !isPasswordValid && password}
						<p class="text-xs text-red-500 mt-1">Password must be at least 6 characters</p>
					{/if}
				</div>
				{#if errorMessage}
					<div class="p-3 rounded-md bg-red-500/20 border border-red-500/40">
						<p class="text-sm text-red-400">{errorMessage}</p>
					</div>
				{/if}
				
				{#if successMessage}
					<div class="p-3 rounded-md bg-green-500/20 border border-green-500/40">
						<p class="text-sm text-green-400">{successMessage}</p>
					</div>
				{/if}
				
				<Button 
					type="submit" 
					class="w-full mt-6" 
					disabled={isLoading || !isEmailValid || !isPasswordValid || successMessage !== ""}
				>
					{#if isLoading}
						Creating account...
					{:else}
						Create Account
					{/if}
				</Button>
			</form>
		</CardContent>
		<CardFooter class="flex flex-col space-y-4">
			<div class="text-sm text-center">
				Already have an account?
				<a href="/login" class="underline text-gradient hover:opacity-80 transition-opacity">Sign in</a>
			</div>
			<div class="text-xs text-center text-muted-foreground">
				By signing up, you agree to our
				<a href="/legal/tos" class="underline hover:text-primary">Terms of Service</a>
				and
				<a href="/legal/privacy" class="underline hover:text-primary">Privacy Policy</a>
			</div>
		</CardFooter>
	</Card>
</div> 