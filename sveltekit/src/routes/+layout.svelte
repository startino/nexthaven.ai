<script lang="ts">
	import '../app.css';
	import { setContext } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { browser } from '$app/environment';
	import NavigationBar from '$lib/components/ui/NavigationBar.svelte';
	import { collectionState, setCollections } from '$lib/stores/collections.svelte';
	import { CollectionService } from '$lib/services/collection.service';
	import { ToltTracker } from '$lib/components/tolt';
	import { TrialBanner } from '$lib/components/trial-banner';
	import { isAnonymousUser } from '$lib/supabase/auth';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { Loader2 } from 'lucide-svelte';
	import { searchQuotaState } from '$lib/stores/search-quota.svelte';
	import { ANONYMOUS_SEARCH_LIMIT } from '$lib/utils/anonymousSearch';
	import { Toaster } from '$lib/components/ui/sonner';

	// Get data from layout load
	let { data, children } = $props();
	
	// Initialize state variables first so they're immediately available
	let session = $state(data.session);
	let supabase = $state(data.supabase);
	let isAnonymous = $state(data.isAnonymous);
	
	// Track anonymous account setup loading state - initialize it immediately based on data
	let isSettingUpAnonymousAccount: boolean = $state(data.isSigningInAnonymously || true);
	
	// Use the values from layout data - this runs after initialization
	$effect(() => {
		session = data.session;
		supabase = data.supabase;
		isAnonymous = data.isAnonymous;
		
		// If we're signing in anonymously, set the loading state immediately
		if (data.isSigningInAnonymously) {
			// Check if already shown in this browser session
			const browserSessionKey = 'anon_setup_shown_this_session';
			const wasShownThisSession = browser ? sessionStorage.getItem(browserSessionKey) === 'true' : false;
			
			// Only set up if we haven't shown the dialog in this browser session
			if (!wasShownThisSession && browser) {
				// Check if we've already shown the setup dialog in a previous session
				const hasShownSetup = browser ? sessionStorage.getItem('setup_shown') === 'true' : false;
				
				// Only show full dialog for new users
				if (!hasShownSetup) {
					isSettingUpAnonymousAccount = true;
					
					// Mark as shown with timestamp
					sessionStorage.setItem('setup_shown', 'true');
					sessionStorage.setItem('setup_shown_timestamp', Date.now().toString());
					sessionStorage.setItem(browserSessionKey, 'true');
					
					// Hide after a delay
					setTimeout(() => {
						isSettingUpAnonymousAccount = false;
					}, 2500);
				}
			}
		}
	});
	
	// Initial setup - keep this more minimal
	onMount(() => {
		searchQuotaState.isAnonymous = data.isAnonymous;
		searchQuotaState.hasReachedLimit = data.anonymousSearchInfo.hasReachedLimit;
		searchQuotaState.remainingSearches = data.anonymousSearchInfo.remainingSearches;
		searchQuotaState.searchCount = data.anonymousSearchInfo.searchCount;
		// Check if already shown in this browser session
		const browserSessionKey = 'anon_setup_shown_this_session';
		const wasShownThisSession = browser ? sessionStorage.getItem(browserSessionKey) === 'true' : false;
		// If already shown in this browser session, don't show again
		if (wasShownThisSession) {
			isSettingUpAnonymousAccount = false;
			return;
		}
		
		// Calculate minimum time to show dialog (at least 2.5 seconds from when it started)
		const setupShownTimestamp = browser ? sessionStorage.getItem('setup_shown_timestamp') : null;
		const timeElapsed = setupShownTimestamp ? Date.now() - parseInt(setupShownTimestamp, 10) : 0;
		const minTimeToShow = 2500; // minimum time to show in ms
		
		// Handle the case where we need to show the dialog and it hasn't been shown yet
		if (data.isSigningInAnonymously) {
			const hasShownSetup = browser ? sessionStorage.getItem('setup_shown') === 'true' : false;
			
			if (!hasShownSetup) {
				// Show immediately
				isSettingUpAnonymousAccount = true;
				
				// Mark as shown, with timestamp
				if (browser) {
					sessionStorage.setItem('setup_shown', 'true');
					sessionStorage.setItem('setup_shown_timestamp', Date.now().toString());
					sessionStorage.setItem(browserSessionKey, 'true');
				}
				
				// Calculate remaining time to show
				const timeToShow = Math.max(minTimeToShow - timeElapsed, 1000);
				
				// Hide after the minimum delay
				setTimeout(() => {
					isSettingUpAnonymousAccount = false;
				}, timeToShow);
			} else if (isSettingUpAnonymousAccount && timeElapsed < minTimeToShow) {
				// If already showing but haven't shown long enough, wait remaining time
				const remainingTime = minTimeToShow - timeElapsed;
				
				// Mark as shown in this browser session
				if (browser) {
					sessionStorage.setItem(browserSessionKey, 'true');
				}
				
				setTimeout(() => {
					isSettingUpAnonymousAccount = false;
				}, remainingTime);
			}
		} else {
			isSettingUpAnonymousAccount = false;
		}
	});
	
	// Function to handle anonymous sign-in process
	async function handleAnonymousSignIn() {

		// Use a dedicated flag in sessionStorage specifically for this browser session
		// This is different from 'setup_shown' which just tracks if it was ever shown
		const browserSessionKey = 'anon_setup_shown_this_session';
		const wasShownThisSession = browser ? sessionStorage.getItem(browserSessionKey) === 'true' : false;
		
		// If already shown in this browser session, never show again until tab is closed
		if (wasShownThisSession) {
			console.log('Setup dialog already shown in this browser session - skipping');
			return;
		}
		
		// Check if we've already shown the setup dialog in a previous session
		const hasShownSetup = browser ? sessionStorage.getItem('setup_shown') === 'true' : false;
		if (hasShownSetup) {
			// We've shown it before, but not in this session - only show briefly if at all
			const setupShownTimestamp = browser ? sessionStorage.getItem('setup_shown_timestamp') : null;
			const timeElapsed = setupShownTimestamp ? Date.now() - parseInt(setupShownTimestamp, 10) : 0;
			const minTimeToShow = 2500;
			
			// If it was shown recently enough, don't show again
			if (timeElapsed < 60000) { // within last minute
				console.log('Setup dialog was shown recently - skipping');
				return;
			}
			
			// If it was shown a while ago, just flash briefly
			isSettingUpAnonymousAccount = true;
			
			// Mark as shown in this browser session
			if (browser) {
				sessionStorage.setItem(browserSessionKey, 'true');
			}
			
			// Hide quickly
			setTimeout(() => {
				isSettingUpAnonymousAccount = false;
			}, 1000);
			return;
		}
		
		// This is a first-time showing
		// Mark as shown to prevent repeated displays
		if (browser) {
			sessionStorage.setItem('setup_shown', 'true');
			sessionStorage.setItem('setup_shown_timestamp', Date.now().toString());
			sessionStorage.setItem(browserSessionKey, 'true');
		}
			searchQuotaState.isAnonymous = true;
			searchQuotaState.remainingSearches = ANONYMOUS_SEARCH_LIMIT;
			searchQuotaState.searchCount = 0;

			setTimeout(() => {
				isSettingUpAnonymousAccount = false;
			}, 2500);
	}
	
	// Setup auth listener
	$effect(() => {
		loadCollections();
		
		// Track if the current session is already established
		const isEstablishedSession = session?.user?.id && isAnonymous;
		
		const { data: authListener } = supabase.auth.onAuthStateChange(
			(event, _session) => {
				if (_session?.expires_at !== session?.expires_at) {
					invalidate('supabase:auth');
				}
				
				// Explicitly refresh subscription status on sign in events
				if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
					console.log('Auth event detected, refreshing subscription status');
					invalidate('subscription:status');
					
					// Only proceed with anonymous handling for NEW sign-ins, not TOKEN_REFRESHED events
					if (event === 'SIGNED_IN' && _session?.user && isAnonymousUser(_session.user)) {
						// Check if this is actually a new user vs returning user with TOKEN_REFRESHED
						if (!isEstablishedSession) {
							console.log('Handling NEW anonymous sign-in (not a refresh)');
							handleAnonymousSignIn();
						} else {
							console.log('Ignoring anonymous auth event - established session detected');
						}
					}
				}
			}
		);
		
		return () => {
			authListener.subscription.unsubscribe();
		};
	});
	
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

<Toaster richColors />

<div class="min-h-dvh bg-black dark text-foreground relative">
	<!-- Tolt Tracker (invisible) -->
	<ToltTracker />
	<!-- Navigation -->
	<NavigationBar />

	<!-- Page content -->
	<main>
		{@render children()}
	</main>
	
	<!-- Anonymous Account Setup Loading Screen -->
	{#if isSettingUpAnonymousAccount}
		<div 
			class="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center"
			transition:fade={{ duration: 200 }}
		>
			<div class="max-w-md text-center p-6" in:fly={{ y: 20, duration: 300, delay: 100 }}>
				<div class="flex justify-center mb-6">
					<div class="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
						<Loader2 class="h-8 w-8 text-primary animate-spin" />
					</div>
				</div>
				
				<h2 class="text-2xl font-semibold mb-3">Setting up your experience</h2>
			
				<p class="text-muted-foreground mb-6">
					Welcome to the future of travel.
				</p>
				<div class="flex justify-center gap-2">
					<div class="h-2 w-2 rounded-full bg-primary/30 animate-pulse" style="animation-delay: 0ms;"></div>
					<div class="h-2 w-2 rounded-full bg-primary/30 animate-pulse" style="animation-delay: 200ms;"></div>
					<div class="h-2 w-2 rounded-full bg-primary/30 animate-pulse" style="animation-delay: 400ms;"></div>
				</div>
			</div>
		</div>
	{/if}
</div>
