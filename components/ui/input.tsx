import * as React from "react";
import { cn } from "@/lib/ui/cn";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-lg border border-cream-300 bg-white px-3.5 py-2 text-sm text-ink-900 shadow-sm transition-colors",
        "placeholder:text-ink-300 focus-visible:border-coral-400 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("text-sm font-semibold text-ink-700", className)}
    {...props}
  />
));
Label.displayName = "Label";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-ink-900 shadow-sm",
      "focus-visible:border-coral-400 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
      className,
    )}
    {...props}
  />
));
Select.displayName = "Select";
