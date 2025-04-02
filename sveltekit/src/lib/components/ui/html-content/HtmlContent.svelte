<script lang="ts">
  /**
   * A component for safely rendering HTML content with Svelte 5
   */
  let { content, className = "" } = $props<{
    content: string;
    className?: string;
  }>();
</script>

{#if content}
  <div class={className}>
    {@html content}
  </div>
{/if} 