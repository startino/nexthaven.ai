<script lang="ts">
  import { cn } from '$lib/utils';
  import { Input } from '$lib/components/ui/input';
  import { ChevronsUpDown } from 'lucide-svelte';

  // Combined props for clarity
  let {
    // Input props
    placeholder = 'Select option...',
    value = '',
    disabled = false,
    class: className = '',
    onInput,
    // Combobox props
    trigger,
    toggle,
    open
  } = $props<{
    placeholder?: string;
    value?: string;
    disabled?: boolean;
    class?: string;
    onInput?: (value: string) => void;
    trigger: (node: HTMLElement) => void;
    toggle: () => void;
    open: boolean;
  }>();

  // Handle input changes
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    if (onInput) {
      onInput(target.value);
    }
  }
</script>

<div class="flex items-center relative w-full">
  <Input
    {placeholder}
    {value}
    {disabled}
    onclick={toggle}
    oninput={handleInput}
    class={cn('flex h-10 items-center justify-between', className)}
  />
  <button
    type="button"
    onclick={toggle}
    aria-expanded={open}
    class="absolute right-3 flex h-4 w-4 items-center justify-center opacity-50 group-hover:opacity-100"
    aria-hidden="true"
    tabindex="-1"
  >
    <ChevronsUpDown class="h-4 w-4" />
  </button>
</div> 