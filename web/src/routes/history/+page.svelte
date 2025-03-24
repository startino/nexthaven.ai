<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
</script>

<div class="space-y-6">
	<div class="flex justify-between items-center">
		<h1 class="text-3xl font-bold">Search History</h1>
		<Button variant="outline" onclick={() => goto('/')}>
			Back to Home
		</Button>
	</div>
	
	<Card>
		<CardHeader>
			<CardTitle>Past Searches</CardTitle>
			<CardDescription>
				View your previous searches and results
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="py-6 text-center">
				<p class="text-muted-foreground">
					Your search history will appear here.
				</p>
				<div class="mt-4">
					<Button onclick={() => goto('/search')} variant="default">
						Start a New Search
					</Button>
				</div>
			</div>
		</CardContent>
	</Card>
</div> 