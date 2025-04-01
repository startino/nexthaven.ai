<script lang="ts">
	import '../app.css';
	import { setContext } from 'svelte';
	import { invalidate } from '$app/navigation';
	import NavigationBar from '$lib/components/ui/NavigationBar.svelte';
	import { collectionState, setCollections } from '$lib/stores/collections.svelte';
	import { CollectionService } from '$lib/services/collection.service';
	import { ToltTracker } from '$lib/components/tolt';
	import { TrialBanner } from '$lib/components/trial-banner';
	import { onMount } from 'svelte';

	// Get data from layout load
	let { data, children } = $props();
	
	// Use the values from layout data
	$effect(() => {
		session = data.session;
		supabase = data.supabase;
		subscriptionStatus = data.subscriptionStatus;
		hasExpiredTrial = data.hasExpiredTrial;
		isAnonymous = data.isAnonymous;
		
		// If we're signing in anonymously, set the loading state
		if (data.isSigningInAnonymously) {
			isSettingUpAnonymousAccount = true;
		}
	});
	
	// Initialize state variables
	let session = $state(data.session);
	let supabase = $state(data.supabase);
	let subscriptionStatus = $state(data.subscriptionStatus);
	let hasExpiredTrial = $state(data.hasExpiredTrial);
	let isAnonymous = $state(data.isAnonymous);
	let isLoading = $state(false);
	
	// Track anonymous account setup loading state
	let isSettingUpAnonymousAccount = $state(data.isSigningInAnonymously || false);
	
	// Setup auth listener
	$effect(() => {
		loadCollections();
		const { data: authListener } = supabase.auth.onAuthStateChange(
			(event, _session) => {
				if (_session?.expires_at !== session?.expires_at) {
					invalidate('supabase:auth');
				}
				
				// Explicitly refresh subscription status on sign in events
				if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
					console.log('Auth event detected, refreshing subscription status');
					invalidate('subscription:status');
					
					// If this is a new anonymous sign-in, show loading indicator for a few seconds
					// to indicate the account is being set up
					if (event === 'SIGNED_IN' && _session?.user && isAnonymousUser(_session.user)) {
						handleAnonymousSignIn();
					}
				}
			}
		);
		
		return () => {
			authListener.subscription.unsubscribe();
		};
	});
	
	// Initial setup and load effect
	onMount(() => {
		// If we're setting up an anonymous account, show loading for a bit
		if (isSettingUpAnonymousAccount) {
			// Artificially delay to show the loading screen (account setup is actually fast)
			// This gives users feedback that something is happening
			setTimeout(() => {
				isSettingUpAnonymousAccount = false;
			}, 2500);
		}
	});
	
	// Function to handle anonymous sign-in process
	async function handleAnonymousSignIn() {
		isSettingUpAnonymousAccount = true;
		
		// Artificially delay to show the loading screen (account setup is actually fast)
		// This gives users feedback that something is happening
		setTimeout(() => {
			isSettingUpAnonymousAccount = false;
		}, 2500);
	}
	
	// Check if a user is anonymous based on metadata or email pattern
	function isAnonymousUser(user: any): boolean {
		if (!user) return false;
		
		// Check user metadata
		if (user.user_metadata?.is_anonymous === true) return true;
		if (user.app_metadata?.is_anonymous === true) return true;
		
		// Check email pattern
		if (user.email) {
			if (user.email.endsWith('@anonymous.user')) return true;
			if (user.email.includes('anon-')) return true;
		}
		
		return false;
	}

	// Load collections for the current user
	async function loadCollections() {
		try {
			if (!session?.user?.id) {
				return;
			}
			collectionState.isLoading = true;
			const userCollections = await CollectionService.getCollections(session.user.id);

			// If no 'My Trip' collection exists, create it
			if (!userCollections.some((collection) => collection.name === 'My Trip')) {
				await CollectionService.ensureDefaultCollection(session.user.id);
				// Reload collections after creating default
				const updatedCollections = await CollectionService.getCollections(session.user.id);
				setCollections(updatedCollections);
				
			} else {
				setCollections(userCollections);
			}
		} catch (error) {
			console.error('Failed to load collections:', error);
		} finally {
			collectionState.isLoading = false;
		}
	}
</script>

<div class="min-h-screen bg-black dark text-foreground">
	<!-- Tolt Tracker (invisible) -->
	<ToltTracker />
	
	{#if isLoading || isSettingUpAnonymousAccount}
		<!-- Loading indicator during anonymous account setup or other loading processes -->
		<div class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
			<div class="p-8 rounded-lg bg-card border border-border flex flex-col items-center gap-5">
				<div class="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
				<div class="flex flex-col items-center">
					<p class="text-xl font-medium text-foreground">Setting up your account</p>
					{#if isSettingUpAnonymousAccount}
						<p class="text-sm text-muted-foreground mt-2 text-center max-w-xs">
							Creating a temporary account so you can explore all features right away.
							No signup required!
						</p>
					{:else}
						<p class="text-sm text-muted-foreground mt-2">
							Just a moment...
						</p>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Navigation -->
	<NavigationBar />
	
	<!-- Trial banner for anonymous users -->
	{#if isAnonymous && session}
		<TrialBanner 
			subscriptionStatus={subscriptionStatus} 
			userEmail={session.user.email || null}
			hasExpiredTrial={!!hasExpiredTrial}
		/>
	{/if}

	<!-- Page content -->
	<main>
		{@render children()}
	</main>
</div>
