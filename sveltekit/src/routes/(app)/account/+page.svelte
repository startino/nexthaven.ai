<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { goto } from "$app/navigation";
	import { User, Mail, Key, ArrowUp, AlertTriangle } from "lucide-svelte";
	import { isAnonymousUser } from "$lib/supabase/auth";
	import { onMount } from "svelte";
	import PartnerSection from "$lib/components/partner/PartnerSection.svelte";

	let { data } = $props();
	const { supabase, session } = data;
	
	// Check if the current user is anonymous
	let isAnonymous = $state(false);
	
	// Check user anonymous status on mount
	onMount(async () => {
		// Check if the user is anonymous by directly looking at the is_anonymous flag
		if (session?.user) {
			const userMetadata = session.user.user_metadata || {};
			
			// Log metadata for debugging
			console.log("User metadata for anonymous check:", userMetadata);
			
			// Primary check: look at the is_anonymous flag we explicitly set
			// When a user is converted, we set is_anonymous to false
			if (userMetadata.is_anonymous === true) {
				isAnonymous = true;
			} else if (userMetadata.is_anonymous === false) {
				// Explicitly set to false - this user was converted
				isAnonymous = false;
			} else {
				// Fall back to the comprehensive check for users who don't have the flag set
				isAnonymous = isAnonymousUser(session.user);
			}
			
			console.log("Final anonymous state:", isAnonymous);
		}
	});
	
	let email = $state(session?.user?.email || "");
	let name = $state(session?.user?.user_metadata?.name || "");
	let currentPassword = $state("");
	let newPassword = $state("");
	let confirmPassword = $state("");
	let isLoading = $state(false);
	let successMessage = $state("");
	let errorMessage = $state("");
	let profileUpdateSuccess = $state("");
	let profileUpdateError = $state("");
	
	function handleSignUp() {
		goto('/signup?convert=true');
	}
	
	async function handlePasswordChange() {
		isLoading = true;
		errorMessage = "";
		successMessage = "";
		
		// Basic validation
		if (newPassword !== confirmPassword) {
			errorMessage = "New passwords don't match";
			isLoading = false;
			return;
		}
		
		if (newPassword.length < 6) {
			errorMessage = "Password must be at least 6 characters";
			isLoading = false;
			return;
		}
		
		// Update password using Supabase
		const { error } = await supabase.auth.updateUser({
			password: newPassword
		});
		
		if (error) {
			errorMessage = error.message;
			isLoading = false;
			return;
		}
		
		// Success
		successMessage = "Password updated successfully";
		currentPassword = "";
		newPassword = "";
		confirmPassword = "";
		isLoading = false;
	}
	
	async function updateProfile() {
		isLoading = true;
		profileUpdateError = "";
		profileUpdateSuccess = "";
		
		const { data, error } = await supabase.auth.updateUser({
			data: { name }
		});
		
		if (error) {
			profileUpdateError = error.message;
			isLoading = false;
			return;
		}
		
		profileUpdateSuccess = "Profile updated successfully";
		isLoading = false;
	}
</script>

<div class="container mx-auto py-8 px-4">
	<div class="max-w-3xl mx-auto">		
		<div class="space-y-6">

			<!-- Partner Section -->
			<PartnerSection {data} />
			{#if isAnonymous}
				<!-- Anonymous Account Warning -->
				<Card class="bg-gradient-to-r from-amber-900/30 to-amber-800/20 border border-amber-500/30">
					<CardHeader>
						<CardTitle class="flex items-center gap-2 text-amber-400">
							<AlertTriangle size={20} />
							Temporary Account
						</CardTitle>
						<CardDescription class="text-amber-300/80">
							You're currently using a temporary account with limited access
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div class="space-y-4">
							<p class="text-sm">
								Your temporary account provides basic access, but has some limitations:
							</p>
							<ul class="list-disc pl-5 text-sm space-y-1">
								<li>Your data will be lost if you clear your browser data or use a different device</li>
								<li>Some premium features are not available</li>
								<li>Trial period is limited</li>
							</ul>
							<div class="bg-amber-500/10 p-4 rounded-lg border border-amber-500/30">
								<div class="flex flex-col sm:flex-row items-center justify-between gap-4">
									<div>
										<h3 class="font-medium text-base text-amber-400 mb-1">Create a permanent account</h3>
										<p class="text-sm">Sign up now to keep all your data and unlock full access.</p>
									</div>
									<Button 
										onclick={handleSignUp}
										class="w-full sm:w-auto flex items-center gap-2"
									>
										<ArrowUp size={16} />
										Sign Up
									</Button>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			{/if}
			
			<!-- Profile Info -->
			<Card class="bg-card max-w-3xl">
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<User size={20} />
						Profile Information
					</CardTitle>
					<CardDescription>View and manage your profile details</CardDescription>
				</CardHeader>
				<CardContent>
					<form class="space-y-4" onsubmit={(e) => { e.preventDefault(); updateProfile(); }}>
						<div class="space-y-2">
							<Label for="name">Name</Label>
							<Input id="name" type="text" bind:value={name} placeholder="Your name" />
							<p class="text-xs text-muted-foreground">
								This is how we'll address you in the app.
							</p>
						</div>
						
						<div class="space-y-2">
							<Label for="email">Email</Label>
							<Input id="email" type="email" value={email} disabled class="bg-muted" />
							<p class="text-xs text-muted-foreground">
								{isAnonymous 
									? "This is a temporary email. Sign up to set your own email address." 
									: "This is the email address associated with your account."}
							</p>
						</div>
						
						{#if profileUpdateError}
							<p class="text-sm text-red-500">{profileUpdateError}</p>
						{/if}
						
						{#if profileUpdateSuccess}
							<p class="text-sm text-green-500">{profileUpdateSuccess}</p>
						{/if}
						
						<Button type="submit" variant="outline" disabled={isLoading}>
							{isLoading ? 'Updating...' : 'Update Profile'}
						</Button>
					</form>
				</CardContent>
			</Card>
		
			<!-- Change Password (only for non-anonymous users) -->
			{#if !isAnonymous}
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<Key size={20} />
							Change Password
						</CardTitle>
						<CardDescription>Update your account password</CardDescription>
					</CardHeader>
					<CardContent>
						<form class="space-y-4" onsubmit={(e) => { e.preventDefault(); handlePasswordChange(); }}>
							<div class="space-y-2">
								<Label for="newPassword">New Password</Label>
								<Input id="newPassword" type="password" bind:value={newPassword} required />
								<p class="text-xs text-muted-foreground">
									Must be at least 6 characters.
								</p>
							</div>
							<div class="space-y-2">
								<Label for="confirmPassword">Confirm New Password</Label>
								<Input id="confirmPassword" type="password" bind:value={confirmPassword} required />
							</div>
							
							{#if errorMessage}
								<p class="text-sm text-red-500">{errorMessage}</p>
							{/if}
							
							{#if successMessage}
								<p class="text-sm text-green-500">{successMessage}</p>
							{/if}
							
							<Button type="submit" class="button-gradient" disabled={isLoading}>
								{isLoading ? 'Updating...' : 'Update Password'}
							</Button>
						</form>
					</CardContent>
				</Card>
			{:else}
				<!-- Password section for anonymous users -->
				<Card class="border border-gray-700/50">
					<CardHeader>
						<CardTitle class="flex items-center gap-2 text-gray-400">
							<Key size={20} />
							Account Security
						</CardTitle>
						<CardDescription>Set a password for your account</CardDescription>
					</CardHeader>
				</Card>
			{/if}

		</div>
	</div>
</div> 