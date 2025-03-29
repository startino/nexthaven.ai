<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils.js";

	type $$Props = HTMLAttributes<HTMLDivElement>;

	let className: $$Props["class"] = undefined;
	export { className as class };
</script>

<div
	class={cn("text-card-foreground rounded-2xl bg-white/5 border border-white/10 shadow-sm", className)}
	{...$$restProps}
>
	<slot />
</div>
