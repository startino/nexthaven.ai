<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { goto } from "$app/navigation";
	import { User, Mail, Lock } from "lucide-svelte";

	let { data } = $props();
	const { supabase } = data;
	
	let name = $state("");
	let email = $state("");
	let password = $state("");
	let confirmPassword = $state("");
	let isLoading = $state(false);
	let errorMessage = $state("");
	
	// Form validation
	let isEmailValid = $derived(validateEmail(email) || email === "");
	let isPasswordValid = $derived(password.length >= 6 || password === "");
	let doPasswordsMatch = $derived(password === confirmPassword || confirmPassword === "");
	
	function validateEmail(email: string): boolean {
		const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return re.test(email);
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
		
		if (password !== confirmPassword) {
			errorMessage = "Passwords don't match";
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
	<Card class="w-full max-w-md border-border bg-card/80 backdrop-blur-sm">
		<CardHeader>
			<div class="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
				<User size={28} class="text-gradient" />
			</div>
			<CardTitle class="text-2xl text-center text-gradient">Create Account</CardTitle>
			<CardDescription class="text-center">Sign up for a new account to get started</CardDescription>
		</CardHeader>
		<CardContent>
			<form class="space-y-4" onsubmit={(e) => { e.preventDefault(); handleSignup(); }}>
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
					<Input 
						id="password" 
						type="password" 
						bind:value={password} 
						required 
						class="{!isPasswordValid && password ? 'border-red-500' : 'border-border/50'} focus-visible:ring-primary"
					/>
					{#if !isPasswordValid && password}
						<p class="text-xs text-red-500 mt-1">Password must be at least 6 characters</p>
					{/if}
				</div>
				<div class="space-y-2">
					<Label for="confirmPassword" class="flex items-center gap-1.5">
						<Lock size={14} />
						Confirm Password
					</Label>
					<Input 
						id="confirmPassword" 
						type="password" 
						bind:value={confirmPassword} 
						required 
						class="{!doPasswordsMatch && confirmPassword ? 'border-red-500' : 'border-border/50'} focus-visible:ring-primary"
					/>
					{#if !doPasswordsMatch && confirmPassword}
						<p class="text-xs text-red-500 mt-1">Passwords don't match</p>
					{/if}
				</div>
				{#if errorMessage}
					<div class="p-3 rounded-md bg-red-500/20 border border-red-500/40">
						<p class="text-sm text-red-400">{errorMessage}</p>
					</div>
				{/if}
				<Button 
					type="submit" 
					class="w-full button-gradient" 
					disabled={isLoading || !isEmailValid || !isPasswordValid || !doPasswordsMatch}
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
				<a href="/terms" class="underline hover:text-primary">Terms of Service</a>
				and
				<a href="/privacy" class="underline hover:text-primary">Privacy Policy</a>
			</div>
		</CardFooter>
	</Card>
</div> 