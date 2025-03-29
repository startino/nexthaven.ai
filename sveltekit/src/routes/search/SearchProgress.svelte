<!-- 
  SearchProgress.svelte - Shows a progress bar and current search step
-->
<script lang="ts">
  import { Progress } from '$lib/components/ui/progress';
  import { 
    Search,
    Home,
    Building2,
    MapPin,
    Database,
    Brain,
    Star,
    CheckCircle,
    Clock 
  } from 'lucide-svelte';
  import type { PropertyEvaluationStep } from '$lib/event';

  // Props
  let { progress, currentStep, currentStepName, isSearching } = $props<{
    progress: number;
    currentStep: number;
    currentStepName?: PropertyEvaluationStep;
    isSearching: boolean;
  }>();

  // Loading step configuration - matching React implementation
  const steps = [
    { icon: Search, text: 'Analyzing your preferences...', duration: 15 },
    { icon: Database, text: 'Searching property databases...', duration: 20 },
    { icon: Building2, text: 'Evaluating property features...', duration: 25 },
    { icon: MapPin, text: 'Analyzing location data...', duration: 20 },
    { icon: Brain, text: 'Running AI matching algorithms...', duration: 30 },
    { icon: Star, text: 'Calculating property scores...', duration: 25 },
    { icon: Home, text: 'Curating your perfect matches...', duration: 20 },
    { icon: CheckCircle, text: 'Finalizing results...', duration: 15 }
  ];

  // Calculate total duration
  const totalDuration = steps.reduce((acc, step) => acc + step.duration, 0);

  // Format time as MM:SS
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  
  // Calculate time remaining based on progress
  function calculateTimeRemaining(progressPercent: number): number {
    // Calculate remaining percentage
    const remainingPercent = 100 - progressPercent;
    // Calculate time based on percentage of total duration
    return Math.round((remainingPercent / 100) * totalDuration);
  }

  // Computed value for time remaining
  let timeRemaining = $derived(
    isSearching ? calculateTimeRemaining(progress) : 0
  );
</script>

{#if isSearching}
  <div class="mb-6 mt-6 animate-fadeIn">
    <Progress value={progress} class="h-2" />
    
    <div class="flex justify-between items-center mt-4">
      <div class="flex items-center gap-2">
        <svelte:component this={steps[currentStep].icon} class="h-5 w-5 text-primary" />
        <span>{steps[currentStep].text}</span>
      </div>
      
      <div class="text-sm text-muted-foreground">
        {#if progress < 100}
          <span class="flex items-center gap-1">
            <Clock class="h-4 w-4" />
            Estimated time: {formatTime(timeRemaining)}
          </span>
        {:else}
          <span class="flex items-center gap-1 text-green-500">
            <CheckCircle class="h-4 w-4" />
            Complete
          </span>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out forwards;
  }
</style> 