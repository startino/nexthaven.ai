<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { cn } from '$lib/utils';
	import { Input } from '../input';

  // Create event dispatcher for change events
  const dispatch = createEventDispatcher<{
    change: [number, number];
  }>();

  // Component props
  let { 
    min = $bindable(0),
    max = $bindable(10000),
    step = $bindable(100),
    value = $bindable<[number, number]>([min, max]),
    formatValue = $bindable((val: number) => val.toLocaleString()),
    showLabels = $bindable(true),
    class: className = '',
    thumbClass = '',
    rangeClass = '',
    trackClass = '' 
  } = $props<{
    min?: number;
    max?: number;
    step?: number;
    value?: [number, number];
    formatValue?: (value: number) => string;
    showLabels?: boolean;
    class?: string;
    thumbClass?: string;
    rangeClass?: string;
    trackClass?: string;
  }>();

  // State to track drag operation
  let dragging = $state<'min' | 'max' | null>(null);
  let containerWidth = $state(0);
  let containerLeft = $state(0);
  let containerElement: HTMLDivElement;
  let minInputValue = $state(String(value[0]));
  let maxInputValue = $state(String(value[1]));
  
  // Fix initial values to be within range
  $effect(() => {
    if (value[0] < min) value = [min, value[1]];
    if (value[1] > max) value = [value[0], max];
    if (value[0] > value[1] - step) value = [value[1] - step, value[1]];
  });
  
  // Update input fields when values change
  $effect(() => {
    minInputValue = String(value[0]);
    maxInputValue = String(value[1]);
  });
  
  // Calculate positions based on values
  let minThumbPercentage = $derived(((value[0] - min) / (max - min)) * 100);
  let maxThumbPercentage = $derived(((value[1] - min) / (max - min)) * 100);
  let trackWidth = $derived(maxThumbPercentage - minThumbPercentage);
  
  // Get container dimensions on mount and resize
  onMount(() => {
    updateContainerDimensions();
    window.addEventListener('resize', updateContainerDimensions);
    
    return () => {
      window.removeEventListener('resize', updateContainerDimensions);
    };
  });
  
  function updateContainerDimensions() {
    if (containerElement) {
      const rect = containerElement.getBoundingClientRect();
      containerWidth = rect.width;
      containerLeft = rect.left;
    }
  }
  
  // Value calculation helpers
  function percentToValue(percent: number): number {
    // Convert percentage to a value within min-max range
    const rawValue = min + ((max - min) * percent) / 100;
    
    // Round to nearest step
    const steps = Math.round((rawValue - min) / step);
    return min + (steps * step);
  }
  
  function positionToPercent(position: number): number {
    // Convert position to percentage
    const percent = ((position - containerLeft) / containerWidth) * 100;
    return Math.max(0, Math.min(100, percent));
  }
  
  // Handle input field changes
  function handleMinInputChange() {
    const newValue = Number(minInputValue);
    if (!isNaN(newValue)) {
      // Ensure value is within valid range
      const limitedValue = Math.min(Math.max(min, newValue), value[1] - step);
      value = [limitedValue, value[1]];
      minInputValue = String(limitedValue);
      dispatch('change', value);
    } else {
      // Reset to current value if invalid input
      minInputValue = String(value[0]);
    }
  }
  
  function handleMaxInputChange() {
    const newValue = Number(maxInputValue);
    if (!isNaN(newValue)) {
      // Ensure value is within valid range
      const limitedValue = Math.max(Math.min(max, newValue), value[0] + step);
      value = [value[0], limitedValue];
      maxInputValue = String(limitedValue);
      dispatch('change', value);
    } else {
      // Reset to current value if invalid input
      maxInputValue = String(value[1]);
    }
  }
  
  // Handle input blur events
  function handleInputBlur(inputType: 'min' | 'max') {
    if (inputType === 'min') {
      handleMinInputChange();
    } else {
      handleMaxInputChange();
    }
  }
  
  // Handle key press in input fields
  function handleInputKeyDown(event: KeyboardEvent, inputType: 'min' | 'max') {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (inputType === 'min') {
        handleMinInputChange();
      } else {
        handleMaxInputChange();
      }
    }
  }
  
  // Start dragging on mousedown
  function startDrag(event: MouseEvent | TouchEvent, thumb: 'min' | 'max') {
    event.preventDefault();
    dragging = thumb;
    
    // Add event listeners for drag and release
    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('touchmove', handleTouchDrag, { passive: false });
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchend', stopDrag);
    window.addEventListener('touchcancel', stopDrag);
    
    // Set current position immediately
    if ('touches' in event) {
      handleTouchDrag(event);
    } else {
      handleDrag(event);
    }
  }
  
  function handleDrag(event: MouseEvent) {
    if (!dragging) return;
    
    const percent = positionToPercent(event.clientX);
    const newValue = percentToValue(percent);
    
    // Update the value based on which thumb is being dragged
    if (dragging === 'min') {
      const limitedValue = Math.min(newValue, value[1] - step);
      value = [Math.max(min, limitedValue), value[1]];
    } else if (dragging === 'max') {
      const limitedValue = Math.max(newValue, value[0] + step);
      value = [value[0], Math.min(max, limitedValue)];
    }
    
    dispatch('change', value);
  }
  
  function handleTouchDrag(event: TouchEvent) {
    if (!dragging || !event.touches[0]) return;
    event.preventDefault(); // Prevent scrolling while dragging
    
    const touch = event.touches[0];
    const percent = positionToPercent(touch.clientX);
    const newValue = percentToValue(percent);
    
    // Update the value based on which thumb is being dragged
    if (dragging === 'min') {
      const limitedValue = Math.min(newValue, value[1] - step);
      value = [Math.max(min, limitedValue), value[1]];
    } else if (dragging === 'max') {
      const limitedValue = Math.max(newValue, value[0] + step);
      value = [value[0], Math.min(max, limitedValue)];
    }
    
    dispatch('change', value);
  }
  
  function stopDrag() {
    dragging = null;
    window.removeEventListener('mousemove', handleDrag);
    window.removeEventListener('touchmove', handleTouchDrag);
    window.removeEventListener('mouseup', stopDrag);
    window.removeEventListener('touchend', stopDrag);
    window.removeEventListener('touchcancel', stopDrag);
  }
  
  function handleKeyDown(event: KeyboardEvent, thumb: 'min' | 'max') {
    const stepSize = event.shiftKey ? step * 10 : step;
    
    if (thumb === 'min') {
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        const newValue = Math.min(value[0] + stepSize, value[1] - step);
        value = [newValue, value[1]];
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        const newValue = Math.max(min, value[0] - stepSize);
        value = [newValue, value[1]];
      }
    } else if (thumb === 'max') {
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        const newValue = Math.min(max, value[1] + stepSize);
        value = [value[0], newValue];
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        const newValue = Math.max(value[0] + step, value[1] - stepSize);
        value = [value[0], newValue];
      }
    }
    
    if (['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      dispatch('change', value);
    }
  }
</script>

<div class={cn("relative", className)}>

  
  <div 
    bind:this={containerElement}
    class="relative h-8"
  >
    <!-- Track background -->
    <div 
      class={cn("absolute inset-y-0 top-1/2 -translate-y-1/2 h-2 w-full rounded-full bg-muted", trackClass)}
    ></div>
    
    <!-- Range fill -->
    <div
      class={cn("absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-primary", rangeClass)}
      style={`left: ${minThumbPercentage}%; width: ${trackWidth}%;`}
    ></div>
    
    <!-- Min thumb -->
    <button
      type="button"
      class={cn(
        "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-7 w-7",
        "rounded-full bg-background border-2 border-primary shadow-sm",
        "transition-shadow focus:outline-none focus-visible:ring-2",
        "focus-visible:ring-offset-2 focus-visible:ring-primary",
        dragging === 'min' ? "cursor-grabbing" : "cursor-grab",
        thumbClass
      )}
      style={`left: ${minThumbPercentage}%; z-index: ${dragging === 'min' ? 30 : 20};`}
      onmousedown={(e) => startDrag(e, 'min')}
      ontouchstart={(e) => startDrag(e, 'min')}
      onkeydown={(e) => handleKeyDown(e, 'min')}
      aria-label={`Minimum value: ${formatValue(value[0])}`}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value[0]}
      role="slider"
    ></button>
    
    <!-- Max thumb -->
    <button
      type="button"
      class={cn(
        "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-7 w-7",
        "rounded-full bg-background border-2 border-primary shadow-sm",
        "transition-shadow focus:outline-none focus-visible:ring-2",
        "focus-visible:ring-offset-2 focus-visible:ring-primary",
        dragging === 'max' ? "cursor-grabbing" : "cursor-grab",
        thumbClass
      )}
      style={`left: ${maxThumbPercentage}%; z-index: ${dragging === 'max' ? 30 : 20};`}
      onmousedown={(e) => startDrag(e, 'max')}
      ontouchstart={(e) => startDrag(e, 'max')}
      onkeydown={(e) => handleKeyDown(e, 'max')}
      aria-label={`Maximum value: ${formatValue(value[1])}`}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value[1]}
      role="slider"
    ></button>
  </div>
  
  <!-- Editable input fields for min/max values -->
  <div class="flex justify-between mt-1">
    <div class="flex flex-row gap-1 items-center">
        $
      <Input
        type="text"
        bind:value={minInputValue}
        onblur={() => handleInputBlur('min')}
        onkeydown={(e) => handleInputKeyDown(e, 'min')}
      class="w-20 place-items-center text-center"
      aria-label="Minimum value"
      />
    </div>
    <div class="flex flex-row gap-1 items-center">
        $
      <Input
        type="text"
        bind:value={maxInputValue}
        onblur={() => handleInputBlur('max')}
        onkeydown={(e) => handleInputKeyDown(e, 'max')}
        class="w-20 place-items-center text-center"
        aria-label="Maximum value"
      />
    </div>
  </div>
</div> 