import { SubcontractorTeamResponseDto } from '../dto/subcontractor-team-response.dto';

type TeamWithMembers = {
  id: string;
  members: { id: string; name: string; companyNumber: string }[];
};

/** Compares by name the way the screens and PDFs order team members. */
export const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, 'he');

export const toSubcontractorTeamResponse = (
  team: TeamWithMembers,
): SubcontractorTeamResponseDto => ({
  id: team.id,
  members: [...team.members].sort(byName).map((member) => ({
    id: member.id,
    name: member.name,
    companyNumber: member.companyNumber,
  })),
});
