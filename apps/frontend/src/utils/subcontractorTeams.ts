import type { SubcontractorTeam } from "@/api/endpoints/subcontractors";

/** A team has no name of its own; it is shown as its members' names. */
export function teamLabel(members: { name: string }[]): string {
  return members.map((m) => m.name).join(" + ");
}

/** Each team member's id → their team. Subcontractors working alone are absent. */
export function teamsByMember(
  teams: SubcontractorTeam[],
): Map<string, SubcontractorTeam> {
  const index = new Map<string, SubcontractorTeam>();
  for (const team of teams) {
    for (const member of team.members) index.set(member.id, team);
  }
  return index;
}
