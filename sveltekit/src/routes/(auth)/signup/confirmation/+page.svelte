<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { page } from "$app/stores";
	import { Mail, ArrowLeft, CheckCircle } from "lucide-svelte";
	
	// Get email from URL query params
	const email = $page.url.searchParams.get('email') || '';
</script>

<div class="flex min-h-screen items-center justify-center px-4">
	<Card class="w-full max-w-md border-border bg-card/80 backdrop-blur-sm">
		<CardHeader class="text-center">
			<div class="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
				<Mail size={32} class="text-gradient" />
			</div>
			<CardTitle class="text-2xl text-gradient">Check Your Email</CardTitle>
			<CardDescription>
				We've sent a confirmation link to
				<span class="font-medium text-primary">{email}</span>
			</CardDescription>
		</CardHeader>
		<CardContent class="text-center space-y-4">
			<div class="bg-primary/10 rounded-lg p-4 flex flex-col items-center gap-2">
				<CheckCircle size={20} class="text-primary" />
				<p class="text-sm">
					Please check your email and click the confirmation link to complete your signup.
					If you don't see the email, check your spam folder.
				</p>
			</div>
		</CardContent>
		<CardFooter class="flex flex-col space-y-4">
			<Button
				variant="outline"
				class="w-full" 
				href="/login"
			>
				<ArrowLeft size={16} class="mr-2" />
				Back to Login
			</Button>
			<div class="text-xs text-center text-muted-foreground">
				Didn't receive the email?
				<a href="/login" class="underline text-gradient hover:opacity-80 transition-opacity ml-1">Try signing in</a>
			</div>
		</CardFooter>
	</Card>
</div> 