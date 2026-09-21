import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/*
 * One shared skeleton for every button so height, radius and disabled
 * behaviour cannot drift apart. Press feedback is a colour step rather than a
 * transform — a scaling button jitters the row it sits in, which is felt most
 * on the dense table rows where these appear several to a line.
 */
const base =
  "inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded text-sm font-semibold " +
  "transition-[background-color,border-color,color] duration-150 " +
  "disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none";

export function ButtonPrimary({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`${base} bg-beet text-white border border-beet hover:bg-beet-bright hover:border-beet-bright active:bg-beet-dim active:border-beet-dim ${className}`}
      {...props}
    />
  );
}

export function ButtonGhost({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`${base} bg-surface text-text border border-border hover:bg-surface-2 hover:border-border-strong active:bg-surface-3 ${className}`}
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
      className={`${base} h-7 border border-transparent bg-transparent px-2 text-label font-medium text-text-muted hover:border-border hover:bg-surface-2 hover:text-text ${className}`}
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
      className={`inline-flex items-center justify-center w-9 h-9 rounded border border-border bg-surface text-text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text hover:border-border-strong active:bg-surface-3 disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none ${className}`}
      {...props}
    />
  );
}

export function LinkButton({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-1 bg-transparent border-none p-0 text-sm font-semibold text-beet-bright underline decoration-beet/35 underline-offset-[3px] transition-colors hover:decoration-beet-bright disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer ${className}`}
      {...props}
    />
  );
}
