import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/ui/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[12px] text-sm font-semibold transition-all focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-coral-600 text-white shadow-soft hover:bg-coral-700",
        secondary: "bg-ink-900 text-cream-50 hover:bg-ink-700",
        accent: "bg-teal-600 text-white hover:bg-teal-700",
        outline: "border border-cream-300 bg-white text-ink-900 hover:bg-cream-100",
        ghost: "text-ink-700 hover:bg-cream-100",
        danger: "bg-rose-600 text-white hover:brightness-95",
      },
      size: {
        sm: "h-9 px-3.5 text-xs",
        md: "h-11 px-4",
        lg: "h-[52px] px-6 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
