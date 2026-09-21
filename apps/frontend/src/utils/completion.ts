/**
 * A completion bar is read as a traffic light on how much of a project is
 * still ahead of it: green on a new project with most of its work to come,
 * amber as it fills, red once it is close to done.
 *
 * Shared by the Projects list and a project's own page so the two bars cannot
 * drift apart — they show the same figure and must agree on its colour.
 */
export function completionBarClass(pct: number): string {
  if (pct <= 40) return "bg-success";
  if (pct <= 70) return "bg-warning";
  return "bg-danger";
}
