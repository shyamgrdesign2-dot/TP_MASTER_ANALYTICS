import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge must know our `tw-` prefix to dedupe conflicting utilities
// correctly (e.g. cn("tw-p-2", "tw-p-4") → "tw-p-4").
const twMerge = extendTailwindMerge({ prefix: "tw-" });

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
