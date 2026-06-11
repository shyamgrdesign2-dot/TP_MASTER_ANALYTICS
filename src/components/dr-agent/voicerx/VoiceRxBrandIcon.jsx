

import { cn } from "../utils";

/** @deprecated Prefer {@link VoiceRxBrandIcon}; kept for existing imports. */
export function VoiceRxWaveGlyph({ className }) {
  return <VoiceRxBrandIcon className={cn("text-white", className)} />;
}

/** Voice Rx equalizer mark — use `text-white` on gradient buttons. */
export function VoiceRxBrandIcon({ className }) {
  return (
    <svg
      className={cn("shrink-0", className)}
      width={18}
      height={15}
      viewBox="0 0 18 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden>
      
      <path
        d="M0.964237 11.108C0.437121 11.108 0 10.6709 0 10.1437V4.6283C0 4.10118 0.437121 3.66406 0.964237 3.66406C1.49135 3.66406 1.92847 4.10118 1.92847 4.6283V10.1437C1.92847 10.6837 1.49135 11.108 0.964237 11.108Z"
        fill="currentColor" />
      
      <path
        d="M4.82166 12.9464C4.29454 12.9464 3.85742 12.5093 3.85742 11.9822V2.80262C3.85742 2.2755 4.29454 1.83838 4.82166 1.83838C5.34877 1.83838 5.7859 2.2755 5.7859 2.80262V11.9822C5.7859 12.5221 5.34877 12.9464 4.82166 12.9464Z"
        fill="currentColor" />
      
      <path
        d="M8.67908 14.785C8.15196 14.785 7.71484 14.3478 7.71484 13.8207V0.964236C7.71484 0.437121 8.15196 0 8.67908 0C9.2062 0 9.64332 0.437121 9.64332 0.964236V13.8207C9.64332 14.3478 9.2062 14.785 8.67908 14.785Z"
        fill="currentColor" />
      
      <path
        d="M12.5345 12.9464C12.0074 12.9464 11.5703 12.5093 11.5703 11.9822V2.80262C11.5703 2.2755 12.0074 1.83838 12.5345 1.83838C13.0617 1.83838 13.4988 2.2755 13.4988 2.80262V11.9822C13.4988 12.5221 13.0617 12.9464 12.5345 12.9464Z"
        fill="currentColor" />
      
      <path
        d="M16.392 11.108C15.8649 11.108 15.4277 10.6709 15.4277 10.1437V4.6283C15.4277 4.10118 15.8649 3.66406 16.392 3.66406C16.9191 3.66406 17.3562 4.10118 17.3562 4.6283V10.1437C17.3562 10.6837 16.9191 11.108 16.392 11.108Z"
        fill="currentColor" />
      
    </svg>);

}