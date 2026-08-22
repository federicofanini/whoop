"use client";

import { useContext, type ComponentProps } from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { cn } from "@/lib/utils";

/**
 * A one-time code, as six boxes.
 *
 * The composition API is shadcn/ui's — `InputOTP` wrapping `InputOTPGroup`
 * wrapping `InputOTPSlot` — over the same `input-otp` primitive it is built on.
 * The styling is not: this project has its own token set and a deliberate
 * square, hairline-ruled design, and running `shadcn init` would have written
 * a second theme (`--background`, `--foreground`, `--radius`) on top of it.
 * Taking the behaviour and leaving the skin is the part that matters — the hard
 * bits here are paste handling, arrow-key navigation, mobile SMS autofill and
 * announcing the value to a screen reader, none of which are visual.
 *
 * There is one real `<input>` underneath, so `name` works in a form action and
 * the boxes are decoration over a field the browser already understands.
 */

export function InputOTP({
  className,
  containerClassName,
  ...props
}: ComponentProps<typeof OTPInput> & { containerClassName?: string }) {
  return (
    <OTPInput
      containerClassName={cn(
        "flex items-center gap-2 has-disabled:opacity-50",
        containerClassName,
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  );
}

export function InputOTPGroup({ className, ...props }: ComponentProps<"div">) {
  // Slots share edges rather than sitting apart, so the group reads as one
  // field — the same rule the spec tables on every other page follow.
  return <div className={cn("flex items-center", className)} {...props} />;
}

export function InputOTPSlot({
  index,
  className,
  ...props
}: ComponentProps<"div"> & { index: number }) {
  const context = useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = context?.slots[index] ?? {};

  return (
    <div
      data-active={isActive || undefined}
      className={cn(
        "relative flex h-12 w-full items-center justify-center",
        "border-y border-r border-hairline bg-surface first:border-l",
        "font-mono text-[18px] text-ink transition-colors",
        // The active box inverts its border rather than glowing: there is no
        // brand colour in this design, so emphasis is contrast.
        "data-[active=true]:z-10 data-[active=true]:border-ink data-[active=true]:ring-1 data-[active=true]:ring-ink",
        className,
      )}
      {...props}
    >
      {char}
      {hasFakeCaret ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-px animate-caret-blink bg-ink" />
        </div>
      ) : null}
    </div>
  );
}

export function InputOTPSeparator({ className, ...props }: ComponentProps<"div">) {
  return (
    <div role="separator" className={cn("px-1 text-muted", className)} {...props}>
      <span aria-hidden>–</span>
    </div>
  );
}
