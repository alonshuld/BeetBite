import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/*
 * One shared skeleton for every button so height, radius and disabled
 * behaviour cannot drift apart. Buttons are pills: the round end marks them
 * as pressable at a glance and sets them apart from square-cornered fields. Press feedback is a colour step rather than a
 * transform — a scaling button jitters the row it sits in, which is felt most
 * on the dense table rows where these appear several to a line.
 */
const base =
  "inline-flex shrink-0 items-center justify-center gap-1.5 h-9 px-4 rounded-full text-sm font-semibold whitespace-nowrap " +
  "transition-[background-color,border-color,color] duration-150 " +
  "disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none";

export function ButtonPrimary({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`${base} bg-ink text-on-ink border border-ink hover:bg-ink-hover hover:border-ink-hover active:bg-ink ${className}`}
      {...props}
    />
  );
}

export function ButtonGhost({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`${base} bg-surface text-text border border-border-strong/70 hover:bg-surface-2 hover:border-border-strong active:bg-surface-3 ${className}`}
      {...props}
    />
  );
}

/**
 * Tertiary tier: an action that belongs to a card but must not compete with
 * the card's own title. It carries no chrome until you reach for it.
 */
export function ButtonQuiet({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`${base} h-7 border border-transparent bg-transparent px-2.5 text-label font-medium text-text-muted hover:border-border hover:bg-surface-2 hover:text-text ${className}`}
      {...props}
    />
  );
}

export function ButtonDanger({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`${base} bg-transparent text-danger border border-danger/45 hover:bg-danger hover:text-white hover:border-danger active:bg-danger/85 ${className}`}
      {...props}
    />
  );
}

export function ButtonIcon({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex shrink-0 items-center justify-center w-9 h-9 rounded-full border border-border-strong/70 bg-surface text-text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text hover:border-border-strong active:bg-surface-3 disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none ${className}`}
      {...props}
    />
  );
}

export function LinkButton({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-1 bg-transparent border-none p-0 text-sm font-semibold text-beet underline decoration-beet/35 underline-offset-[3px] transition-colors hover:decoration-beet-bright disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer ${className}`}
      {...props}
    />
  );
}
