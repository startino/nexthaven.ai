<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Card, CardContent, CardHeader } from '$lib/components/ui/card';
</script>

<div class="flex flex-col items-center justify-center h-[70vh] space-y-8">
	<div class="text-center space-y-4">
		<h1 class="text-3xl font-bold tracking-tight">Finding the Perfect Stays</h1>
		<p class="text-muted-foreground max-w-lg mx-auto">
			Our AI is searching across multiple platforms to find and evaluate the best options for you.
		</p>
	</div>
	
	<div class="w-full max-w-4xl mt-6">
		<div class="flex justify-center mb-8">
			<div class="relative flex items-center justify-center w-16 h-16">
				<div class="absolute w-full h-full border-4 rounded-full border-primary animate-spin border-t-transparent"></div>
				<div class="absolute w-8 h-8 border-4 rounded-full border-accent animate-spin border-b-transparent"></div>
			</div>
		</div>
		
		<div class="space-y-6">
			<Card>
				<CardHeader class="pb-2">
					<div class="flex justify-between items-center">
						<Skeleton class="h-6 w-48" />
						<Skeleton class="h-6 w-10 rounded-full" />
					</div>
				</CardHeader>
				<CardContent class="space-y-4">
					<Skeleton class="h-4 w-full" />
					<Skeleton class="h-4 w-full" />
					<div class="flex flex-wrap gap-2 mt-2">
						<Skeleton class="h-6 w-20 rounded-full" />
						<Skeleton class="h-6 w-16 rounded-full" />
						<Skeleton class="h-6 w-24 rounded-full" />
					</div>
					<div class="flex justify-between items-center pt-2">
						<Skeleton class="h-8 w-24" />
						<Skeleton class="h-6 w-20" />
					</div>
				</CardContent>
			</Card>
			
			<Card>
				<CardHeader class="pb-2">
					<div class="flex justify-between items-center">
						<Skeleton class="h-6 w-64" />
						<Skeleton class="h-6 w-10 rounded-full" />
					</div>
				</CardHeader>
				<CardContent class="space-y-4">
					<Skeleton class="h-4 w-full" />
					<Skeleton class="h-4 w-full" />
					<div class="flex flex-wrap gap-2 mt-2">
						<Skeleton class="h-6 w-16 rounded-full" />
						<Skeleton class="h-6 w-24 rounded-full" />
						<Skeleton class="h-6 w-20 rounded-full" />
					</div>
					<div class="flex justify-between items-center pt-2">
						<Skeleton class="h-8 w-24" />
						<Skeleton class="h-6 w-20" />
					</div>
				</CardContent>
			</Card>
		</div>
	</div>

	<div class="text-center mt-6">
		<p class="text-sm text-muted-foreground animate-pulse">
			This may take a few moments...
		</p>
	</div>
</div> 