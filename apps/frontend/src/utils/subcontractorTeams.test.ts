import { describe, expect, it } from "vitest";
import { teamLabel, teamsByMember } from "./subcontractorTeams";

const team = {
  id: "team-1",
  members: [
    { id: "a", name: "דוד", companyNumber: "111111111" },
    { id: "b", name: "משה", companyNumber: "222222222" },
  ],
};

describe("teamLabel", () => {
  it("joins the member names", () => {
    expect(teamLabel(team.members)).toBe("דוד + משה");
  });
});

describe("teamsByMember", () => {
  it("indexes every member to their team", () => {
    const index = teamsByMember([team]);
    expect(index.get("a")).toBe(team);
    expect(index.get("b")).toBe(team);
    expect(index.get("solo")).toBeUndefined();
  });
});
