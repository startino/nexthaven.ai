<script lang="ts">
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { User, LogOut, Settings, CreditCard, Folder } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	// Get user information from session
	let userName = $derived(
		$page.data.session?.user?.user_metadata?.name || 
		$page.data.session?.user?.email?.split('@')[0] || 
		'User'
	);
	
	let userEmail = $derived($page.data.session?.user?.email || '');

	async function handleSignOut() {
		const { supabase } = $page.data;
		await supabase.auth.signOut();
		goto('/auth/login');
	}
</script>

<DropdownMenu>
	<DropdownMenuTrigger asChild let:builder>
		<Button variant="ghost" size="icon" builders={[builder]}>
			<User class="h-5 w-5" />
			<span class="sr-only">Account menu</span>
		</Button>
	</DropdownMenuTrigger>
	<DropdownMenuContent align="end">
		<div class="flex items-center justify-start gap-2 p-2">
			<div class="flex flex-col space-y-1 leading-none">
				<p class="font-medium">{userName}</p>
				{#if userEmail}
					<p class="text-xs text-muted-foreground">{userEmail}</p>
				{/if}
			</div>
		</div>
		<DropdownMenuSeparator />
		<DropdownMenuItem on:click={() => goto('/account')}>
			<Settings class="mr-2 h-4 w-4" />
			<span>Settings</span>
		</DropdownMenuItem>
		<DropdownMenuItem on:click={() => goto('/subscription')}>
			<CreditCard class="mr-2 h-4 w-4" />
			<span>Subscription</span>
		</DropdownMenuItem>
		<DropdownMenuItem on:click={() => goto('/collections')}>
			<Folder class="mr-2 h-4 w-4" />
			<span>My Saved Properties</span>
		</DropdownMenuItem>
		<DropdownMenuSeparator />
		<DropdownMenuItem on:click={handleSignOut}>
			<LogOut class="mr-2 h-4 w-4" />
			<span>Log out</span>
		</DropdownMenuItem>
	</DropdownMenuContent>
</DropdownMenu> 