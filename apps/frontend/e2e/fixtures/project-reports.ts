import type {
  ProjectReport,
  ProjectReportDetail,
} from "../../src/api/endpoints/project-reports";

export const PROJECT_ID = "proj-1";
export const REPORT_ID = "rep-1";
export const ENTRY_1_ID = "entry-1";
export const ENTRY_2_ID = "entry-2";
export const CORP_PAY_ID = "corp-pay-1";
export const TEST_MONTH = "2026-01";

export const mockProject = {
  id: PROJECT_ID,
  clientId: "client-1",
  client: { id: "client-1", name: "Tel Aviv Municipality" },
  name: "City Hall",
  description: "Major renovation project",
  estimatedAmount: 1_000_000,
  isDone: false,
  hasReports: true,
  paymentProgress: { totalPaid: 250_000 },
};

export const mockSubcontractors = [{ id: "sub-1", name: "יוסי לוי" }];

export const mockCorporations = [{ id: "corp-1", name: "FloorCo" }];

export const mockReportList: ProjectReport[] = [
  {
    id: REPORT_ID,
    date: "2026-01-01T00:00:00.000Z",
    profitMargin: 10,
    totalIncome: 50_000,
    incomeEntries: [
      {
        id: ENTRY_1_ID,
        amount: 30_000,
        incomeDate: "2026-01-15T00:00:00.000Z",
      },
      { id: ENTRY_2_ID, amount: 20_000, incomeDate: null },
    ],
    corporationPayments: [
      {
        id: CORP_PAY_ID,
        corporation: { id: "corp-1", name: "FloorCo" },
        amount: 8_000,
      },
    ],
    project: {
      id: PROJECT_ID,
      name: "City Hall",
      client: { id: "client-1", name: "Tel Aviv Municipality" },
    },
    subcontractor: { id: "sub-1", name: "יוסי לוי" },
  },
];

export const mockReportDetail: ProjectReportDetail = {
  id: REPORT_ID,
  date: "2026-01-01T00:00:00.000Z",
  profitMargin: 10,
  profit: 5_000,
  totalIncome: 50_000,
  incomeEntries: [
    { id: ENTRY_1_ID, amount: 30_000, incomeDate: "2026-01-15T00:00:00.000Z" },
    { id: ENTRY_2_ID, amount: 20_000, incomeDate: null },
  ],
  project: { id: PROJECT_ID, name: "City Hall" },
  subcontractor: { id: "sub-1", name: "יוסי לוי", payment: 37_000 },
  corporationPayments: [
    {
      id: CORP_PAY_ID,
      corporation: { id: "corp-1", name: "FloorCo" },
      amount: 8_000,
    },
  ],
};
