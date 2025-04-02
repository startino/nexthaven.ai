<!-- 
  SearchProgress.svelte - Shows a multi-step loading indicator for search process
-->
<script lang="ts">
  import { 
    Database,
    Image,
    Sparkle,
    Check,
  } from 'lucide-svelte';
  import type { PropertyEvaluationStep } from '$lib/event';
  import { Badge } from '$lib/components/ui/badge';

  // Props
  let { progress, currentStep, currentStepName, isSearching } = $props<{
    progress: number;
    currentStep: number;
    currentStepName?: PropertyEvaluationStep;
    isSearching: boolean;
  }>();
  
  // Define the 3 main steps for our minimalist approach
  const searchSteps = [
    { 
      id: 'retrieving', 
      icon: Database, 
      label: 'Retrieving data'
    },
    { 
      id: 'analyzing', 
      icon: Image, 
      label: 'Analyzing images'
    },
    { 
      id: 'evaluating', 
      icon: Sparkle, 
      label: 'Evaluating properties'
    }
  ];
  
  // Computed values for step statuses
  let retrievingStatus = $derived(getStepStatus('retrieving'));
  let analyzingStatus = $derived(getStepStatus('analyzing'));
  let evaluatingStatus = $derived(getStepStatus('evaluating'));
  
  // Map the current step name to our simplified 3-step process
  function getStepStatus(stepId: string): 'pending' | 'active' | 'completed' {
    if (!isSearching) return 'pending';
    
    if (progress >= 100) return 'completed';
    
    // Logic to map the current API step to our 3 visual steps
    switch (stepId) {
      case 'retrieving':
        if (currentStepName === 'started' || currentStepName === 'checking' || 
            currentStepName === 'retrieving' || currentStepName === 'retrieved') {
          return 'active';
        } else if (progress > 40) {
          return 'completed';
        }
        break;
      case 'analyzing':
        if (currentStepName === 'updating' || currentStepName === 'processing') {
          return 'active';
        } else if (progress > 70) {
          return 'completed';
        } else if (progress > 40) {
          return 'active';
        }
        break;
      case 'evaluating':
        if (currentStepName === 'formatting' || currentStepName === 'completed') {
          return 'active';
        } else if (progress > 90) {
          return 'completed';
        } else if (progress > 70) {
          return 'active';
        }
        break;
    }
    
    // Default cases
    if (progress > 0 && stepId === 'retrieving') return 'active';
    return 'pending';
  }
  
  // Helper function to get status for a specific step
  function getStatusForStep(index: number): 'pending' | 'active' | 'completed' {
    if (index === 0) return retrievingStatus;
    if (index === 1) return analyzingStatus;
    if (index === 2) return evaluatingStatus;
    return 'pending';
  }
</script>

{#if isSearching}
  <div class="mb-6 mt-6 animate-fadeIn">
    <div class="flex items-center justify-between max-w-2xl mx-auto">
      {#each searchSteps as step, index}
        {@const status = getStatusForStep(index)}
        <div class="flex flex-col items-center">
          <div class={`
            w-14 h-14 rounded-full flex items-center justify-center
            transition-all duration-300 
            ${status === 'completed' ? 'bg-primary text-primary-foreground' : 
              status === 'active' ? 'bg-primary/10 text-primary border-2 border-primary' : 
              'bg-background text-muted-foreground border-2 border-muted'}
          `}>
            {#if status === 'completed'}
              <Check class="h-6 w-6" />
            {:else}
              <svelte:component 
                this={step.icon} 
                class={`h-6 w-6 ${status === 'active' ? 'animate-pulse' : ''}`} 
              />
            {/if}
          </div>
          
          <span class={`
            text-xs mt-2 font-medium
            ${status === 'completed' ? 'text-primary' : 
              status === 'active' ? 'text-foreground' : 
              'text-muted-foreground'}
          `}>
            {step.label}
          </span>
          
          {#if status === 'active'}
            <Badge variant="outline" class="mt-1 text-[10px] py-0 h-4 animate-pulse">In progress</Badge>
          {/if}
        </div>
        
        {#if index < searchSteps.length - 1}
          <div class={`
            flex-1 h-[2px] mx-2
            ${status === 'completed' ? 'bg-primary' : 'bg-muted'}
          `}></div>
        {/if}
      {/each}
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
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  
  .animate-pulse {
    animation: pulse 1.5s ease-in-out infinite;
  }
</style> 