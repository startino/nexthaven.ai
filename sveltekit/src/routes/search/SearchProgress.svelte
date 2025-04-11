<!-- 
  SearchProgress.svelte - Shows a single circular loading indicator with current step label
-->
<script lang="ts">
  import { 
    Database,
    Image,
    Sparkle,
  } from 'lucide-svelte';
  import type { PropertyEvaluationStep } from '$lib/event';

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
  
  // Get current active step index
  let activeStepIndex = $derived(() => {
    if (!isSearching) return -1;
    
    if (currentStepName === 'started' || currentStepName === 'checking' || 
        currentStepName === 'retrieving' || currentStepName === 'retrieved') {
      return 0;
    } else if (currentStepName === 'updating' || currentStepName === 'analyzing_images' || currentStepName === 'processing') {
      return 1;
    } else if (currentStepName === 'formatting' || currentStepName === 'completed') {
      return 2;
    }
    return 0;
  });

  // Get current step info
  let currentStepInfo = $derived(() => searchSteps[activeStepIndex()] || searchSteps[0]);

  // Calculate circle properties
  const strokeWidth = 12; // Stroke width
  const size = 200; // SVG size
  const radius = (size - strokeWidth * 2) / 2; // Adjust radius to account for stroke width
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate stroke dash offset based on progress
  let dashOffset = $derived(circumference - (progress / 100) * circumference);
</script>

{#if isSearching}
  <div class="flex flex-col items-center justify-center py-8 animate-fadeIn">
    <!-- SVG Circle Container -->
    <div class="relative w-48 h-48">
      <!-- Define gradients -->
      <svg width="0" height="0">
        <defs>
          <!-- Main gradient -->
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#FF00FF;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#9333EA;stop-opacity:1" />
          </linearGradient>
          <!-- Background gradient -->
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#E5E7EB;stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:#E5E7EB;stop-opacity:0.1" />
          </linearGradient>
        </defs>
      </svg>

      <!-- Main circle SVG -->
      <div class="animate-spin-slow">
        <svg 
          class="w-full h-full -rotate-90 drop-shadow-xl filter blur-[1px]"
          viewBox="0 0 {size} {size}"
          width={size}
          height={size}
        >
          <!-- Background circle -->
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#bgGradient)"
            stroke-width={strokeWidth}
            fill="none"
            class="opacity-30"
          />
          <!-- Progress circle with shimmer effect -->
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#progressGradient)"
            stroke-width={strokeWidth}
            fill="none"
            stroke-dasharray={circumference}
            stroke-dashoffset={dashOffset}
            stroke-linecap="round"
            class="transition-all duration-300 ease-in-out animate-shimmer"
          />
        </svg>
      </div>
      
      <!-- Center content with icon and label -->
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="w-32 h-32 bg-background rounded-full shadow-inner flex flex-col items-center justify-center gap-2 p-4">
          <div class="w-8 h-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground animate-pulse">
            <svelte:component this={currentStepInfo().icon} class="w-4 h-4" />
          </div>
          <span class="text-sm font-medium text-foreground text-center">
            {currentStepInfo().label}
          </span>
        </div>
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
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  
  .animate-pulse {
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .animate-spin-slow {
    animation: spin-slow 8s linear infinite;
  }

  @keyframes shimmer {
    0% { opacity: 1; }
    50% { opacity: 0.7; }
    100% { opacity: 1; }
  }

  .animate-shimmer {
    animation: shimmer 2s ease-in-out infinite;
  }

  /* Add a subtle glow effect to the progress circle */
  :global(.drop-shadow-xl) {
    filter: drop-shadow(0 0 8px rgba(147, 51, 234, 0.3));
  }
</style> 