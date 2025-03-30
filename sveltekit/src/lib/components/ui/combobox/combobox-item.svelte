<script lang="ts">
  import { cn } from '$lib/utils';
  import { Check } from 'lucide-svelte';

  // Props
  let {
    value,
    selected = false,
    disabled = false,
    class: className = '',
    onClick,
    closeCombobox
  } = $props<{
    value: string;
    selected?: boolean;
    disabled?: boolean;
    class?: string;
    onClick?: (value: string) => void;
    closeCombobox: () => void;
  }>();

  // Handle item click
  function handleClick() {
    if (disabled) return;
    if (onClick) onClick(value);
    closeCombobox();
  }
</script>

<div
  class={cn(
    'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
    selected && 'bg-accent text-accent-foreground',
    disabled && 'pointer-events-none opacity-50',
    !disabled && !selected && 'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
    className
  )}
  role="option"
  aria-selected={selected}
  data-disabled={disabled}
  onclick={handleClick}
  tabindex={disabled ? -1 : 0}
  onkeydown={(e) => e.key === 'Enter' && handleClick()}
>
  {#if selected}
    <span class="absolute left-2 flex h-4 w-4 items-center justify-center">
      <Check class="h-4 w-4" />
    </span>
  {/if}
  <slot />
</div> 