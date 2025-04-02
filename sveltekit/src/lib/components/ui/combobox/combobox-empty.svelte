<script lang="ts">
  import { cn } from '$lib/utils';

  // Props
  let { 
    class: className = '' 
  } = $props<{
    class?: string;
  }>();
</script>

<div class={cn('py-6 text-center text-sm', className)}>
  <slot>No results found.</slot>
</div> 