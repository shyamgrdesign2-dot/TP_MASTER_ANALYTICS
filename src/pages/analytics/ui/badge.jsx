import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "./lib/utils";

const badgeVariants = cva(
  "tw-inline-flex tw-items-center tw-rounded-md tw-border tw-px-2 tw-py-0.5 tw-text-xs tw-font-semibold tw-transition-colors",
  {
    variants: {
      variant: {
        default: "tw-border-transparent tw-bg-primary tw-text-primary-foreground",
        secondary: "tw-border-transparent tw-bg-muted tw-text-muted-foreground",
        success: "tw-border-transparent tw-bg-success/12 tw-text-success",
        destructive: "tw-border-transparent tw-bg-destructive/12 tw-text-destructive",
        warning: "tw-border-transparent tw-bg-chart-4/15 tw-text-chart-4",
        outline: "tw-text-foreground tw-border-border",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
