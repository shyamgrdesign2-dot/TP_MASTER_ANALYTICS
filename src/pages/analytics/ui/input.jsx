import React from "react";
import { cn } from "./lib/utils";

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "tw-flex tw-h-9 tw-w-full tw-rounded-md tw-border tw-border-input tw-bg-background tw-px-3 tw-py-1 tw-text-sm tw-shadow-sm tw-transition-colors placeholder:tw-text-muted-foreground focus-visible:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-ring disabled:tw-cursor-not-allowed disabled:tw-opacity-50",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
