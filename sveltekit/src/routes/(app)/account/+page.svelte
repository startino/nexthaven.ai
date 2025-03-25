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
	let currentPassword = $state("");
	let newPassword = $state("");
	let confirmPassword = $state("");
	let isLoading = $state(false);
	let successMessage = $state("");
	let errorMessage = $state("");
	
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
</script>

<div class="container mx-auto py-8 px-4">
	<div class="max-w-3xl mx-auto">
		<h1 class="text-3xl font-bold text-gradient mb-6">Account Settings</h1>
		
		<div class="space-y-6">
			<!-- Profile Info -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<User size={20} />
						Profile Information
					</CardTitle>
					<CardDescription>View and manage your profile details</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="space-y-4">
						<div class="space-y-2">
							<Label for="email">Email</Label>
							<div class="flex">
								<Input id="email" type="email" value={email} disabled class="bg-muted" />
							</div>
							<p class="text-xs text-muted-foreground">
								This is the email address associated with your account.
							</p>
						</div>
					</div>
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
			
			<!-- Danger Zone -->
			<Card class="border-destructive/20">
				<CardHeader>
					<CardTitle class="text-destructive">Danger Zone</CardTitle>
					<CardDescription>Irreversible account actions</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="space-y-4">
						<p class="text-sm text-muted-foreground">
							If you want to delete your account, please contact support. This action cannot be undone.
						</p>
						<form action="/logout" method="POST">
							<Button 
								type="submit" 
								variant="destructive" 
								class="w-full"
							>
								Sign Out
							</Button>
						</form>
					</div>
				</CardContent>
			</Card>
		</div>
	</div>
</div> 