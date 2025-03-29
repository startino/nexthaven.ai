<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { goto } from "$app/navigation";
	import { User, Mail, Key } from "lucide-svelte";

	let { data } = $props();
	const { supabase, session } = data;
	
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
					<form class="space-y-4" on:submit|preventDefault={updateProfile}>
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
								This is the email address associated with your account.
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
			
			<!-- Change Password -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Key size={20} />
						Change Password
					</CardTitle>
					<CardDescription>Update your account password</CardDescription>
				</CardHeader>
				<CardContent>
					<form class="space-y-4" on:submit|preventDefault={handlePasswordChange}>
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
		</div>
	</div>
</div> 