<script lang="ts">
  import { cn } from '$lib/utils';

  // Combined props
  let { 
    class: className = '',
    closeCombobox
  } = $props<{
    class?: string;
    closeCombobox: () => void;
  }>();
</script>

<div class={cn('max-h-96 overflow-auto p-1', className)}>
  <slot {closeCombobox} />
</div> 