import { useState, useEffect } from "react";
import { useGetClientsQuery } from "@/api/endpoints/clients";
import { useGetProjectsQuery } from "@/api/endpoints/projects";
import { useGetProjectReportsQuery } from "@/api/endpoints/project-reports";
import { PageHeader } from "@/components/molecules/PageHeader";
import { Select } from "@/components/atoms/Select";
import { FormGroup } from "@/components/molecules/FormGroup";

function formatILS(n: number): string {
  return `₪${Math.round(n).toLocaleString("he-IL")}`;
}

interface SimProject {
  projectId: number;
  projectName: string;
  savedMargin: number;
  simMargin: number;
  totalIncome: number;
}

export default function ProfitSimulatorPage() {
  const { data: clients = [] } = useGetClientsQuery();
  const { data: projects = [] } = useGetProjectsQuery();
  const { data: reports = [] } = useGetProjectReportsQuery();

  const [clientId, setClientId] = useState<string>("");
  const [baseline, setBaseline] = useState<number>(20);
  const [overrides, setOverrides] = useState<Map<number, number>>(new Map());

  const clientProjects = projects.filter(
    (p) => clientId && p.client?.id === parseInt(clientId),
  );

  const simProjects: SimProject[] = clientProjects.map((p) => {
    const projectReports = reports.filter((r) => r.project.id === p.id);
    const totalIncome = projectReports.reduce((sum, r) => sum + r.income, 0);
    const lastReport = projectReports[projectReports.length - 1];
    const savedMargin = lastReport?.profitMarginPercent ?? baseline;
    const simMargin = overrides.get(p.id) ?? baseline;
    return {
      projectId: p.id,
      projectName: p.name,
      savedMargin,
      simMargin,
      totalIncome,
    };
  });

  function setOverride(projectId: number, value: number) {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(projectId, value);
      return next;
    });
  }

  function handleBaselineChange(val: number) {
    setBaseline(val);
    setOverrides(new Map());
  }

  function reset() {
    setBaseline(20);
    setOverrides(new Map());
  }

  useEffect(() => {
    setOverrides(new Map());
  }, [clientId]);

  const totalIncome = simProjects.reduce((sum, p) => sum + p.totalIncome, 0);
  const savedProfit = simProjects.reduce(
    (sum, p) => sum + p.totalIncome * (p.savedMargin / 100),
    0,
  );
  const simProfit = simProjects.reduce(
    (sum, p) => sum + p.totalIncome * (p.simMargin / 100),
    0,
  );
  const delta = simProfit - savedProfit;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Profit Margin Simulator"
        subtitle="Preview how margin changes affect totals — nothing is saved"
      />

      <div className="flex flex-col gap-4 max-w-lg">
        <FormGroup>
          <Select
            id="sim-client"
            label="Client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">— Select a client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormGroup>

        {clientId && (
          <FormGroup>
            <label className="text-[12px] font-medium uppercase tracking-wide text-text-muted block mb-1">
              Baseline margin: {baseline}%
            </label>
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={baseline}
              onChange={(e) => handleBaselineChange(parseInt(e.target.value))}
              className="w-full accent-beet"
            />
          </FormGroup>
        )}
      </div>

      {clientId && simProjects.length === 0 && (
        <p className="text-text-muted text-sm">
          This client has no projects yet.
        </p>
      )}

      {simProjects.length > 0 && (
        <>
          <div className="flex flex-col gap-3">
            {simProjects.map((sp) => {
              const simProfitHere = sp.totalIncome * (sp.simMargin / 100);
              const savedProfitHere = sp.totalIncome * (sp.savedMargin / 100);
              const d = simProfitHere - savedProfitHere;
              const hasOverride = overrides.has(sp.projectId);
              return (
                <div
                  key={sp.projectId}
                  className="bg-surface border border-border rounded p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-medium text-text">{sp.projectName}</p>
                      <p className="text-xs text-text-muted">
                        Saved margin: {sp.savedMargin}%
                        {hasOverride && (
                          <span className="ml-2 text-beet-bright">
                            (overridden)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-text-muted">Income</p>
                      <p className="font-semibold text-text">
                        {formatILS(sp.totalIncome)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <label className="text-xs text-text-muted shrink-0 w-16">
                      {sp.simMargin}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      step={1}
                      value={sp.simMargin}
                      onChange={(e) =>
                        setOverride(sp.projectId, parseInt(e.target.value))
                      }
                      className="flex-1 accent-beet"
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">
                      Sim profit:{" "}
                      <span className="text-success font-medium">
                        {formatILS(simProfitHere)}
                      </span>
                    </span>
                    <span
                      className={`font-medium ${d >= 0 ? "text-success" : "text-danger"}`}
                    >
                      {d >= 0 ? "+" : ""}
                      {formatILS(d)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-surface-2 border border-border rounded p-5 flex flex-col gap-3">
            <h2 className="font-serif text-lg text-text">Summary</h2>
            <div className="grid grid-cols-3 gap-4 max-[640px]:grid-cols-1 text-sm">
              <div>
                <p className="text-text-muted text-xs uppercase tracking-wide mb-1">
                  Total Income
                </p>
                <p className="font-bold text-text text-lg">
                  {formatILS(totalIncome)}
                </p>
              </div>
              <div>
                <p className="text-text-muted text-xs uppercase tracking-wide mb-1">
                  Simulated Profit
                </p>
                <p className="font-bold text-success text-lg">
                  {formatILS(simProfit)}
                </p>
              </div>
              <div>
                <p className="text-text-muted text-xs uppercase tracking-wide mb-1">
                  Delta vs Saved
                </p>
                <p
                  className={`font-bold text-lg ${delta >= 0 ? "text-success" : "text-danger"}`}
                >
                  {delta >= 0 ? "+" : ""}
                  {formatILS(delta)}
                </p>
              </div>
            </div>
            <button
              onClick={reset}
              className="text-xs text-text-muted hover:text-beet-bright underline self-start"
            >
              Reset to saved values
            </button>
          </div>
        </>
      )}
    </div>
  );
}
