import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/ui/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        neutral: "bg-cream-200 text-ink-700",
        coral: "bg-coral-100 text-coral-700",
        teal: "bg-teal-100 text-teal-700",
        gold: "bg-[#fbf0d2] text-[#8a5e12]",
        rose: "bg-[#fde3e4] text-[#b3262a]",
        outline: "border border-cream-300 text-ink-700",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
