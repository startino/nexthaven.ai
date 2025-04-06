import type { Button as ButtonPrimitive } from 'bits-ui';
import { type VariantProps, tv } from 'tailwind-variants';
import Root from './button.svelte';

const buttonVariants = tv({
	base: 'focus-visible:ring-ring inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50',
	variants: {
		variant: {
			default: 'button-gradient text-white hover:bg-primary/90 shadow',
			destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
			outline:
				'border border-border bg-white/5 hover:bg-accent hover:text-accent-foreground border shadow-sm',
			secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm',
			ghost: 'hover:bg-primary/70',
			link: 'text-primary underline-offset-4 hover:underline',
			card: 'bg-card text-card-foreground'
		},
		size: {
			default: 'h-9 px-4 py-2',
			sm: 'h-8 rounded-full px-3 text-xs',
			lg: 'h-10 rounded-full px-8',
			icon: 'h-9 w-9'
		}
	},
	defaultVariants: {
		variant: 'default',
		size: 'default'
	}
});

type Variant = VariantProps<typeof buttonVariants>['variant'];
type Size = VariantProps<typeof buttonVariants>['size'];

type Props = ButtonPrimitive.Props & {
	variant?: Variant;
	size?: Size;
};

type Events = ButtonPrimitive.Events;

export {
	Root,
	type Props,
	type Events,
	//
	Root as Button,
	type Props as ButtonProps,
	type Events as ButtonEvents,
	buttonVariants
};
