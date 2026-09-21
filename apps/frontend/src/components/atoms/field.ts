/*
 * Shared field chrome. Inputs, selects and textareas are read as one column in
 * the form modals, so their border, focus ring and padding live in one string
 * rather than being retyped three times and drifting.
 */
export const fieldBase =
  "w-full px-3 py-2 rounded-sm bg-surface border border-border text-text text-sm " +
  "outline-none transition-[border-color,box-shadow] duration-150 " +
  "placeholder:text-text-dim " +
  "hover:border-border-strong " +
  "focus:border-beet focus:shadow-[0_0_0_3px_var(--beet-glow)] " +
  "disabled:opacity-45 disabled:cursor-not-allowed disabled:bg-surface-2";

/*
 * Sentence case, not the tracked-out caps this app used to set. Hebrew has no
 * uppercase, so `uppercase` silently did nothing on half the labels and the
 * two languages rendered as different products.
 */
export const fieldLabel = "text-label font-semibold text-text-muted";
