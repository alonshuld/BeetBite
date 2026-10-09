import type { SelectHTMLAttributes } from "react";
import {
  useGetSubcontractorsQuery,
  useGetSubcontractorTeamsQuery,
} from "@/api/endpoints/subcontractors";
import { Select } from "@/components/atoms/Select";
import { teamLabel, teamsByMember } from "@/utils/subcontractorTeams";

const TEAM_PREFIX = "team:";

interface SubcontractorSelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "onChange" | "children"
> {
  label?: string;
  /** The subcontractor on the report — for a team, the member who took it. */
  value: string;
  onChange: (subcontractorId: string) => void;
  /** Text of the empty option, whose value is "". */
  emptyLabel: string;
}

/**
 * Picks the subcontractor of a report. A team is one option named after its
 * members, never its members one by one: the report still stores a single
 * member, and which one is chosen per month on the subcontractor payments
 * screen. Picking a team keeps the member already on the report when there
 * is one (an inherited choice), otherwise takes the team's first member.
 */
export function SubcontractorSelect({
  value,
  onChange,
  emptyLabel,
  ...props
}: SubcontractorSelectProps) {
  const { data: subcontractors = [] } = useGetSubcontractorsQuery();
  const { data: teams = [] } = useGetSubcontractorTeamsQuery();
  const teamOf = teamsByMember(teams);

  const options = [
    ...teams.map((team) => ({
      value: `${TEAM_PREFIX}${team.id}`,
      label: teamLabel(team.members),
    })),
    ...subcontractors
      .filter((s) => !teamOf.has(s.id))
      .map((s) => ({ value: s.id, label: s.name })),
  ].sort((a, b) => a.label.localeCompare(b.label));

  const currentTeam = teamOf.get(value);
  const selected = currentTeam ? `${TEAM_PREFIX}${currentTeam.id}` : value;

  function handleChange(next: string) {
    if (!next.startsWith(TEAM_PREFIX)) return onChange(next);
    const team = teams.find((t) => `${TEAM_PREFIX}${t.id}` === next);
    if (!team) return;
    onChange(
      team.members.some((m) => m.id === value) ? value : team.members[0].id,
    );
  }

  return (
    <Select
      {...props}
      value={selected}
      onChange={(e) => handleChange(e.target.value)}
    >
      <option value="">{emptyLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
