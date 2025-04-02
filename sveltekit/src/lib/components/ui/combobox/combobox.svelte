<script lang="ts">
  import { cn } from '$lib/utils';
  import { fly } from 'svelte/transition';
  import { type Writable } from 'svelte/store';

  // Props
  let { class: className = '' } = $props();
  
  // Create state
  let open = $state(false);
  let trigger: (node: HTMLElement) => void;
  let content: (node: HTMLElement) => void;
  let popoverOpen = $state(false);
  
  // Helper functions
  function close() {
    open = false;
    popoverOpen = false;
  }
  
  function toggle() {
    open = !open;
    popoverOpen = !popoverOpen;
  }

  // Bind the open state
  $effect(() => {
    open = popoverOpen;
  });

  $effect(() => {
    popoverOpen = open;
  });

  // Define a slot function to close the combobox
  function closeCombobox() {
    close();
  }
</script>

<div class={cn('relative max-w-[400px] w-full', className)}>
  <slot {trigger} {toggle} {open} />
  
  {#if open}
    <div
      class="z-50 min-w-[8rem] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
      transition:fly={{ duration: 200, y: 5 }}
    >
      <slot name="content" {closeCombobox} />
    </div>
  {/if}
</div> 