<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Textarea } from "$lib/components/ui/textarea";
	import { HandshakeIcon, VideoIcon, CheckCircle } from "lucide-svelte";
	import { toast } from "svelte-sonner";

	// Props for user data
	let { data } = $props();
	const { supabase, session } = data;

	// State for form data
	let partnerType = $state<'affiliate' | 'content-creator' | null>(null);
	let about = $state("");
	let email = $state(session?.user?.email || "");
	let isLoading = $state(false);
	let successMessage = $state("");
	let errorMessage = $state("");
	let hasApplied = $state(false);
	let existingApplications = $state<Record<string, boolean>>({});

	// Check for existing applications on mount
	async function checkExistingApplications() {
		if (!session?.user?.id) return;

		const { data: applications, error } = await supabase
			.from('partner_applications')
			.select('partner_type')
			.eq('user_id', session.user.id);

		if (error) {
			console.error('Error checking existing applications:', error);
			return;
		}

		// Create a map of existing applications
		const appMap = applications.reduce((acc, app) => {
			acc[app.partner_type] = true;
			return acc;
		}, {} as Record<string, boolean>);

		existingApplications = appMap;
	}

	// Call check on mount
	$effect(() => {
		checkExistingApplications();
	});

	// Function to handle partner application
	async function handlePartnerApplication() {
		if (!partnerType) return;

		// Check if user has already applied for this type
		if (existingApplications[partnerType]) {
			toast.error("Application already exists", {
				description: "You have already applied for this partner program."
			});
			return;
		}

		isLoading = true;
		errorMessage = "";
		successMessage = "";

		try {
			// Insert application into partner_applications table
			const { error } = await supabase
				.from('partner_applications')
				.insert([
					{
						user_id: session?.user?.id,
						partner_type: partnerType,
						about,
						email,
						status: 'pending'
					}
				]);

			if (error) {
				// Handle unique constraint violation
				if (error.code === '23505') {
					toast.error("Application already exists", {
						description: "You have already applied for this partner program."
					});
					// Update local state to reflect the existing application
					existingApplications = { ...existingApplications, [partnerType]: true };
					return;
				}
				throw error;
			}

			toast.success("Application submitted successfully!", {
				description: "We'll review your application and get back to you soon."
			});
			
			successMessage = "Your application has been submitted successfully!";
			hasApplied = true;
			existingApplications = { ...existingApplications, [partnerType]: true };
			
			// Reset form
			about = "";
			email = session?.user?.email || "";
		} catch (error: any) {
			errorMessage = error.message || "An error occurred while submitting your application";
			toast.error("Failed to submit application", {
				description: errorMessage
			});
		} finally {
			isLoading = false;
		}
	}

	// Function to check if a partner type has an existing application
	function hasExistingApplication(type: 'affiliate' | 'content-creator'): boolean {
		return !!existingApplications[type];
	}
</script>

<Card class="bg-gradient-to-br from-primary/20 via-primary/10 to-background border-primary/20">
	<CardHeader>
		<CardTitle class="flex items-center gap-2 text-2xl">
			<HandshakeIcon size={24} />
			Become a Partner
		</CardTitle>
		<CardDescription class="text-lg">Choose how you'd like to partner with us</CardDescription>
	</CardHeader>
	<CardContent>
		<div class="grid gap-6">
			<!-- Partnership Options -->
			<div class="grid sm:grid-cols-2 gap-4">
				<!-- Affiliate Partner Card -->
				<Card class="relative cursor-pointer transition-all hover:border-primary 
					{partnerType === 'affiliate' ? 'border-primary bg-primary/5' : ''} 
					{hasExistingApplication('affiliate') ? 'bg-emerald-500/10 border-emerald-500/50' : ''}"
					onclick={() => !hasExistingApplication('affiliate') && (partnerType = 'affiliate')}>
					<CardHeader>
						<div class="flex items-center justify-between">
							<CardTitle class="text-lg">Affiliate Partner</CardTitle>
							{#if hasExistingApplication('affiliate')}
								<CheckCircle class="text-emerald-500" size={20} />
							{/if}
						</div>
						<CardDescription>
							Earn commission by referring customers to our platform
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ul class="list-disc pl-5 text-sm space-y-1">
							<li>Earn 20% commission per paid user</li>
							<li>Access to marketing materials</li>
							<li>Real-time tracking dashboard</li>
						</ul>
						{#if hasExistingApplication('affiliate')}
							<div class="mt-4 text-sm font-medium text-emerald-500 flex items-center gap-2">
								<CheckCircle size={16} />
								Application Submitted, we'll get back in a couple of days.
							</div>
						{/if}
					</CardContent>
				</Card>

				<!-- Content Creator Card -->
				<Card class="relative cursor-pointer transition-all hover:border-primary 
					{partnerType === 'content-creator' ? 'border-primary bg-primary/5' : ''}
					{hasExistingApplication('content-creator') ? 'bg-emerald-500/10 border-emerald-500/50' : ''}"
					onclick={() => !hasExistingApplication('content-creator') && (partnerType = 'content-creator')}>
					<CardHeader>
						<div class="flex items-center justify-between">
							<CardTitle class="text-lg">Content Creator</CardTitle>
							{#if hasExistingApplication('content-creator')}
								<CheckCircle class="text-emerald-500" size={20} />
							{/if}
							<VideoIcon size={20} />
						</div>
						<CardDescription>
							Create engaging video content for our platform
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div class="space-y-4">
							<ul class="list-disc pl-5 text-sm space-y-1">
								<li>Earn $200 for every 30 videos</li>
								<li>Flexible content themes</li>
								<li>Professional editing support</li>
							</ul>
							<div class="text-sm p-2 bg-primary/10 rounded-md">
								<span class="font-medium">Limited Time Offer:</span> Get a $50 bonus for your first approved video series!
							</div>
							{#if hasExistingApplication('content-creator')}
								<div class="text-sm font-medium text-emerald-500 flex items-center gap-2">
									<CheckCircle size={16} />
									Application Submitted, we'll get back in a couple of days.
								</div>
							{/if}
						</div>
					</CardContent>
				</Card>
			</div>

			{#if partnerType && !hasExistingApplication(partnerType)}
				<form class="space-y-4" onsubmit={(e) => { e.preventDefault(); handlePartnerApplication(); }}>
					<div class="space-y-2">
						<Label for="email">Email</Label>
						<Input
							id="email"
							type="email"
							bind:value={email}
							placeholder="Your email address"
							required
						/>
						<p class="text-xs text-muted-foreground">
							We'll use this email to contact you about your application
						</p>
					</div>

					<div class="space-y-2">
						<Label for="about">Tell us about yourself</Label>
						<Textarea
							id="about"
							bind:value={about}
							placeholder="Tell us a bit about yourself and your background..."
							required
						/>
						<p class="text-xs text-muted-foreground">
							{#if partnerType === 'affiliate'}
								Share what you do and how you plan to promote our platform
							{:else}
								Share your content creation experience and the type of videos you'd like to create
							{/if}
						</p>
					</div>

					{#if errorMessage}
						<p class="text-sm text-red-500">{errorMessage}</p>
					{/if}

					{#if successMessage}
						<p class="text-sm text-green-500">{successMessage}</p>
					{/if}

					<Button type="submit" class="w-full" disabled={isLoading}>
						{isLoading ? 'Submitting...' : 'Submit Application'}
					</Button>
				</form>
			{/if}
		</div>
	</CardContent>
</Card>