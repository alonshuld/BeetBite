/**
 * A completion bar is read as a traffic light on how close the project is to
 * being fully collected: red while most of the money is still outstanding,
 * amber as it fills, green once it is nearly settled.
 *
 * Shared by the Projects list and a project's own page so the two bars cannot
 * drift apart — they show the same figure and must agree on its colour.
 */
export function completionBarClass(pct: number): string {
  if (pct <= 40) return "bg-danger";
  if (pct <= 70) return "bg-warning";
  return "bg-success";
}
