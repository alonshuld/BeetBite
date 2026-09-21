interface LoadingStateProps {
  label: string;
  className?: string;
}

/*
 * A waiting screen should hold the space the content will occupy rather than
 * collapsing to one line of grey text, so the layout does not jump when the
 * rows arrive.
 */
export function LoadingState({ label, className = "" }: LoadingStateProps) {
  return (
    <div
      className={`flex items-center justify-center gap-2.5 rounded-lg border border-dashed border-border py-16 text-sm text-text-muted ${className}`}
      role="status"
    >
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border-strong border-t-beet" />
      {label}
    </div>
  );
}
