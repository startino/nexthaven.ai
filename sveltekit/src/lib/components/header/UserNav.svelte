<script lang="ts">
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { User, LogOut, Settings, CreditCard } from 'lucide-svelte';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { goto } from '$app/navigation';
	import { signOut } from '$lib/services/auth';

	const toastStore = getToastStore();

	async function handleSignOut() {
		await signOut();
		toastStore.trigger({
			message: 'You have been signed out',
			background: 'variant-filled-success'
		});
		goto('/login');
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
				<p class="font-medium">My Account</p>
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
		<DropdownMenuSeparator />
		<DropdownMenuItem on:click={handleSignOut}>
			<LogOut class="mr-2 h-4 w-4" />
			<span>Log out</span>
		</DropdownMenuItem>
	</DropdownMenuContent>
</DropdownMenu> 