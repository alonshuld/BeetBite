import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubcontractorSelect } from "./SubcontractorSelect";

vi.mock("@/api/endpoints/subcontractors", () => ({
  useGetSubcontractorsQuery: vi.fn(),
  useGetSubcontractorTeamsQuery: vi.fn(),
}));

import {
  useGetSubcontractorsQuery,
  useGetSubcontractorTeamsQuery,
} from "@/api/endpoints/subcontractors";

const avi = { id: "avi", name: "Avi Levi", companyNumber: "1", teamId: "t1" };
const moshe = {
  id: "moshe",
  name: "Moshe Cohen",
  companyNumber: "2",
  teamId: "t1",
};
const yossi = {
  id: "yossi",
  name: "Yossi Mizrahi",
  companyNumber: "3",
  teamId: null,
};

function renderSelect(value: string, onChange = vi.fn()) {
  render(
    <SubcontractorSelect
      aria-label="Subcontractor"
      value={value}
      onChange={onChange}
      emptyLabel="—"
    />,
  );
  return onChange;
}

describe("SubcontractorSelect", () => {
  beforeEach(() => {
    vi.mocked(useGetSubcontractorsQuery).mockReturnValue({
      data: [avi, moshe, yossi],
    } as unknown as ReturnType<typeof useGetSubcontractorsQuery>);
    vi.mocked(useGetSubcontractorTeamsQuery).mockReturnValue({
      data: [{ id: "t1", members: [avi, moshe] }],
    } as unknown as ReturnType<typeof useGetSubcontractorTeamsQuery>);
  });

  it("offers a team as one option and hides its members", () => {
    renderSelect("");

    const options = screen.getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["—", "Avi Levi + Moshe Cohen", "Yossi Mizrahi"]);
  });

  it("shows the team as selected when the report names a member", () => {
    renderSelect("moshe");

    expect(
      screen.getByRole("option", { name: "Avi Levi + Moshe Cohen" }),
    ).toHaveProperty("selected", true);
  });

  it("picking a team gives its first member", async () => {
    const onChange = renderSelect("yossi");

    await userEvent.selectOptions(
      screen.getByLabelText("Subcontractor"),
      "Avi Levi + Moshe Cohen",
    );

    expect(onChange).toHaveBeenCalledWith("avi");
  });

  it("re-picking the team keeps the member already chosen", async () => {
    const onChange = renderSelect("moshe");

    await userEvent.selectOptions(
      screen.getByLabelText("Subcontractor"),
      "Avi Levi + Moshe Cohen",
    );

    expect(onChange).not.toHaveBeenCalledWith("avi");
  });

  it("picking a lone subcontractor gives their id", async () => {
    const onChange = renderSelect("");

    await userEvent.selectOptions(
      screen.getByLabelText("Subcontractor"),
      "Yossi Mizrahi",
    );

    expect(onChange).toHaveBeenCalledWith("yossi");
  });
});
