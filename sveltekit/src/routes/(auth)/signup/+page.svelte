<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { goto } from "$app/navigation";
	import { User, Mail, Lock, Eye, EyeOff } from "lucide-svelte";

	let { data } = $props();
	const { supabase } = data;
	
	let name = $state("");
	let email = $state("");
	let password = $state("");
	let isLoading = $state(false);
	let errorMessage = $state("");
	let showPassword = $state(false);
	
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
</script>

<div class="flex min-h-screen items-center justify-center px-4">
	<Card class="w-full max-w-md bg-white/5 backdrop-blur-sm">
		<CardHeader>
			<CardTitle class="text-2xl text-center text-gradient">Create Account</CardTitle>
			<CardDescription class="text-center">Sign up for a new account to get started</CardDescription>
		</CardHeader>
		<CardContent>
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
				<Button 
					type="submit" 
					class="w-full mt-6" 
					disabled={isLoading || !isEmailValid || !isPasswordValid}
				>
					{isLoading ? 'Creating account...' : 'Sign Up'}
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