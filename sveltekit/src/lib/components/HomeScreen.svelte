<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';
	
	// Props
	let { 
		onStartNewCampaign = () => {}, 
		onViewHistory = () => {}
	} = $props<{
		onStartNewCampaign?: () => void;
		onViewHistory?: () => void;
	}>();
</script>

<div class="flex flex-col items-center justify-center space-y-8 py-12">
	<div class="text-center space-y-4">
		<h1 class="text-4xl font-bold tracking-tight">NextHaven.ai</h1>
		<p class="text-muted-foreground max-w-[42rem] leading-normal sm:text-xl sm:leading-8">
			Find your perfect vacation rental using AI-powered recommendations.
		</p>
	</div>
	
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
		<Card class="border border-border/40">
			<CardHeader>
				<CardTitle>Start New Search</CardTitle>
				<CardDescription>
					Search for properties based on your preferences
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p class="text-sm text-muted-foreground">
					Enter your destination, dates, and preferences to find the perfect vacation rental.
					Our AI will analyze options across multiple platforms to recommend the best choices.
				</p>
			</CardContent>
			<CardFooter>
				<Button onclick={onStartNewCampaign} class="w-full">
					Start New Search
				</Button>
			</CardFooter>
		</Card>
		
		<Card class="border border-border/40">
			<CardHeader>
				<CardTitle>View History</CardTitle>
				<CardDescription>
					Access your previous searches and bookings
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p class="text-sm text-muted-foreground">
					Review your search history, compare previous recommendations,
					and quickly access your favorite properties from past searches.
				</p>
			</CardContent>
			<CardFooter>
				<Button onclick={onViewHistory} variant="outline" class="w-full">
					View History
				</Button>
			</CardFooter>
		</Card>
	</div>
	
	<div class="mt-8 text-center">
		<p class="text-sm text-muted-foreground">
			Powered by advanced AI to find you the best vacation rentals across multiple platforms.
		</p>
	</div>
</div> 