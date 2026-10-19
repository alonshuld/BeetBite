import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  useGetProjectReportsQuery,
  useChangeReportSubcontractorMutation,
} from "@/api/endpoints/project-reports";
import { useGetSubcontractorTeamsQuery } from "@/api/endpoints/subcontractors";
import {
  useGetSubcontractorPaymentsQuery,
  useCreateSubcontractorPaymentMutation,
  useUpdateSubcontractorPaymentMutation,
  useDeleteSubcontractorPaymentMutation,
} from "@/api/endpoints/subcontractor-payments";
import { PageHeader } from "@/components/molecules/PageHeader";
import { SearchInput } from "@/components/molecules/SearchInput";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { Badge, ButtonGhost, EmptyState } from "@/components/atoms";
import { TeamsModal } from "@/components/organisms/TeamsModal";
import { teamLabel, teamsByMember } from "@/utils/subcontractorTeams";
import { useLang } from "@/contexts/useLang";
import { useFieldCheck } from "@/hooks/useFieldCheck";
import { formatYM, formatISODate } from "@/utils/formatMonth";
import { Icon } from "@/components/atoms/Icon";
import { formatILS, roundToAgorot } from "@/utils/formatMoney";

type PaymentStatus = "Paid" | "Partial" | "Unpaid";

// Red / amber / green, read as a traffic light across the whole screen.
const STATUS_VARIANT: Record<PaymentStatus, "green" | "yellow" | "red"> = {
  Paid: "green",
  Partial: "yellow",
  Unpaid: "red",
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Compared in agorot, like the server's overpayment guard. */
function projectStatus(paid: number, owed: number): PaymentStatus {
  if (paid <= 0) return "Unpaid";
  if (Math.round(paid * 100) >= Math.round(owed * 100)) return "Paid";
  return "Partial";
}

export default function SubcontractorPaymentsPage() {
  const { month } = useOutletContext<{ month: string }>();
  const { data: monthReports = [] } = useGetProjectReportsQuery(month);
  const { data: monthlyPayments = [] } =
    useGetSubcontractorPaymentsQuery(month);
  const [createPayment] = useCreateSubcontractorPaymentMutation();
  const [updatePayment] = useUpdateSubcontractorPaymentMutation();
  const [deletePayment] = useDeleteSubcontractorPaymentMutation();
  const [changeReportSubcontractor] = useChangeReportSubcontractorMutation();
  const { data: teams = [] } = useGetSubcontractorTeamsQuery();
  const teamOf = teamsByMember(teams);
  const { t, lang } = useLang();
  const checkFields = useFieldCheck();

  // A card is one subcontractor working alone, or one whole team.
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [search, setSearch] = useState("");
  // The inline row that records one instalment: which project it is open for,
  // the amount typed into it, the day that money moved and an optional note.
  const [entryOpen, setEntryOpen] = useState<Record<string, boolean>>({});
  const [entryAmounts, setEntryAmounts] = useState<Record<string, string>>({});
  const [entryDescriptions, setEntryDescriptions] = useState<
    Record<string, string>
  >({});
  const [pendingProject, setPendingProject] = useState<Record<string, boolean>>(
    {},
  );
  // The day the money moved, per project row. Defaults to today; the user can
  // change it, because paperwork is often entered days after the transfer.
  const [paymentDates, setPaymentDates] = useState<Record<string, string>>({});
  // Which already-recorded instalment has its date open for correction.
  const [editingDate, setEditingDate] = useState<Record<string, boolean>>({});
  // The draft description of each already-recorded instalment open for
  // editing, keyed by payment id. No key means the editor is closed.
  const [descriptionDrafts, setDescriptionDrafts] = useState<
    Record<string, string>
  >({});

  function paymentDateFor(projectId: string): string {
    return paymentDates[projectId] ?? todayISO();
  }

  interface SubCard {
    /** The team id for a team, the subcontractor id for someone alone. */
    key: string;
    label: string;
    isTeam: boolean;
    /** Everyone on the card: the whole team, or the one subcontractor. */
    members: { id: string; name: string }[];
    projectBreakdown: {
      reportId: string;
      projectId: string;
      projectName: string;
      clientId: string;
      clientName: string;
      owed: number;
      /** The member who took the project this month — the report's subcontractor. */
      subId: string;
    }[];
    totalOwed: number;
    totalPaid: number;
  }

  const cardMap = new Map<string, SubCard>();
  for (const report of monthReports) {
    const sub = report.subcontractor;
    const team = teamOf.get(sub.id);
    const corpTotal = report.supplierPayments.reduce(
      (s, cp) => s + cp.amount,
      0,
    );
    // To the agora, as the server computes it: rounding to whole shekels
    // made the ✓ offer e.g. 7,989 against 7,988.60 owed, which it refuses.
    const owed = roundToAgorot(
      report.totalIncome -
        report.totalIncome * (report.profitMargin / 100) -
        corpTotal,
    );
    const key = team?.id ?? sub.id;
    let card = cardMap.get(key);
    if (!card) {
      card = team
        ? {
            key,
            label: teamLabel(team.members),
            isTeam: true,
            members: team.members,
            projectBreakdown: [],
            totalOwed: 0,
            totalPaid: 0,
          }
        : {
            key,
            label: sub.name,
            isTeam: false,
            members: [{ id: sub.id, name: sub.name }],
            projectBreakdown: [],
            totalOwed: 0,
            totalPaid: 0,
          };
      cardMap.set(key, card);
    }
    card.projectBreakdown.push({
      reportId: report.id,
      projectId: report.project.id,
      projectName: report.project.name,
      clientId: report.project.client.id,
      clientName: report.project.client.name,
      owed,
      subId: sub.id,
    });
    card.totalOwed += owed;
  }

  // Every recorded instalment of the month, tagged with who received it.
  const allPayments = monthlyPayments.flatMap((mp) =>
    mp.payments.map((payment) => ({
      ...payment,
      subcontractorId: mp.subcontractor.id,
    })),
  );
  const paidByMember = new Map(
    monthlyPayments.map((mp) => [mp.subcontractor.id, mp.amountPaid]),
  );

  for (const card of cardMap.values()) {
    card.totalPaid = card.members.reduce(
      (sum, m) => sum + (paidByMember.get(m.id) ?? 0),
      0,
    );
  }

  /** A project's instalments, counting only those to the member who took it. */
  function paymentsFor(projectId: string, subId: string) {
    return allPayments.filter(
      (p) => p.projectId === projectId && p.subcontractorId === subId,
    );
  }

  function paidFor(projectId: string, subId: string): number {
    return paymentsFor(projectId, subId).reduce((s, p) => s + p.amount, 0);
  }

  function cardStatusOf(card: SubCard): PaymentStatus {
    const statuses = card.projectBreakdown.map((pb) =>
      projectStatus(paidFor(pb.projectId, pb.subId), pb.owed),
    );
    if (statuses.every((s) => s === "Paid")) return "Paid";
    if (statuses.every((s) => s === "Unpaid")) return "Unpaid";
    return "Partial";
  }

  // Who still needs paying comes first; fully paid cards sink to the bottom,
  // each half in name order.
  const cards = Array.from(cardMap.values())
    .map((card) => ({ card, settled: cardStatusOf(card) === "Paid" }))
    .sort(
      (a, b) =>
        Number(a.settled) - Number(b.settled) ||
        a.card.label.localeCompare(b.card.label),
    )
    .map(({ card }) => card);

  const selectedCard = cards.find((c) => c.key === selectedKey) ?? null;

  // A card matches by its subcontractor (or any team member) or by any of its
  // projects or their clients. The open card stays open while filtering.
  const query = search.trim().toLowerCase();
  const visibleCards = query
    ? cards.filter((card) =>
        [
          card.label,
          ...card.members.map((m) => m.name),
          ...card.projectBreakdown.flatMap((pb) => [
            pb.projectName,
            pb.clientName,
          ]),
        ].some((text) => text.toLowerCase().includes(query)),
      )
    : cards;

  /** Owed and paid for each member of a card, for the per-member totals. */
  function memberTotals(card: SubCard) {
    return card.members.map((m) => ({
      ...m,
      owed: card.projectBreakdown
        .filter((pb) => pb.subId === m.id)
        .reduce((s, pb) => s + pb.owed, 0),
      paid: paidByMember.get(m.id) ?? 0,
    }));
  }

  /**
   * Hand a team project to another member for this month. Next month's
   * report inherits the choice; the server refuses once instalments exist.
   */
  async function handleChangeMember(reportId: string, subcontractorId: string) {
    await changeReportSubcontractor({ id: reportId, subcontractorId });
  }

  async function handleSetUnpaid(projectId: string, subId: string) {
    const toDelete = paymentsFor(projectId, subId);
    if (toDelete.length === 0) return;
    setPendingProject((prev) => ({ ...prev, [projectId]: true }));
    let failed = false;
    for (const p of toDelete) {
      if ("error" in (await deletePayment(p.id))) {
        failed = true;
        break;
      }
    }
    setPendingProject((prev) => ({ ...prev, [projectId]: false }));
    if (!failed) closeEntry(projectId);
  }

  /**
   * Open the instalment row. Both the green ✓ and the yellow 〜 land here: the
   * only difference is the amount they suggest — the whole outstanding balance
   * for ✓, nothing for 〜. Neither writes anything until a date is confirmed,
   * because the day the money moved is the user's to state, never today by
   * default.
   */
  function openEntry(projectId: string, amount: string) {
    setEntryAmounts((prev) => ({ ...prev, [projectId]: amount }));
    setEntryOpen((prev) => ({ ...prev, [projectId]: true }));
  }

  function closeEntry(projectId: string) {
    setEntryOpen((prev) => ({ ...prev, [projectId]: false }));
    setEntryAmounts((prev) => ({ ...prev, [projectId]: "" }));
    setEntryDescriptions((prev) => ({ ...prev, [projectId]: "" }));
  }

  /**
   * Record one instalment. Existing instalments are left alone — a month
   * settled in three transfers is three rows, each with its own date, not one
   * row rewritten three times.
   */
  async function handleAddPayment(projectId: string, subId: string) {
    const raw = entryAmounts[projectId] ?? "";
    const amount = parseFloat(raw);
    if (
      !checkFields([
        [
          t("amountILS"),
          raw.trim() === ""
            ? "missing"
            : (isNaN(amount) || amount <= 0) && "invalid",
        ],
      ])
    )
      return;
    setPendingProject((prev) => ({ ...prev, [projectId]: true }));
    const result = await createPayment({
      subcontractorId: subId,
      projectId,
      // serviceDate is the month being settled; paymentDate is the day the
      // money moved. They are deliberately different things.
      serviceDate: month + "-01",
      amount,
      paymentDate: paymentDateFor(projectId),
      description: entryDescriptions[projectId]?.trim() || undefined,
    });
    setPendingProject((prev) => ({ ...prev, [projectId]: false }));
    // A rejected payment (e.g. over the amount owed) has already toasted its
    // reason — keep the row open with what the user typed.
    if ("error" in result) return;
    closeEntry(projectId);
  }

  async function handleDeletePayment(projectId: string, paymentId: string) {
    setPendingProject((prev) => ({ ...prev, [projectId]: true }));
    await deletePayment(paymentId);
    setPendingProject((prev) => ({ ...prev, [projectId]: false }));
  }

  /**
   * Correct the date on an instalment already recorded. The input stays open
   * until it loses focus — a date picker reports a half-typed value as empty,
   * so closing on the first change would snatch the field away mid-entry.
   */
  async function handleChangePaymentDate(paymentId: string, date: string) {
    if (!date) return;
    await updatePayment({ id: paymentId, paymentDate: date });
  }

  function openDescriptionEditor(paymentId: string, current: string | null) {
    setDescriptionDrafts((prev) => ({ ...prev, [paymentId]: current ?? "" }));
  }

  function closeDescriptionEditor(paymentId: string) {
    setDescriptionDrafts((prev) => {
      const next = { ...prev };
      delete next[paymentId];
      return next;
    });
  }

  /**
   * Save the draft description. Only the Save button (or Enter) commits it —
   * leaving the field does not, so a stray click never saves a half-typed
   * note. An emptied draft clears the description; an unchanged one sends
   * nothing.
   */
  async function handleSaveDescription(
    paymentId: string,
    previous: string | null,
  ) {
    const trimmed = (descriptionDrafts[paymentId] ?? "").trim();
    if (trimmed !== (previous ?? "")) {
      const result = await updatePayment({
        id: paymentId,
        description: trimmed,
      });
      if ("error" in result) return;
    }
    closeDescriptionEditor(paymentId);
  }

  async function handleDeleteDescription(paymentId: string) {
    await updatePayment({ id: paymentId, description: "" });
  }

  const aggregateStatus: PaymentStatus = selectedCard
    ? cardStatusOf(selectedCard)
    : "Unpaid";

  const colCount = selectedCard?.isTeam ? 5 : 4;

  const totalAmountClass =
    aggregateStatus === "Paid"
      ? "text-success"
      : aggregateStatus === "Partial"
        ? "text-warning"
        : "text-danger";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("subcontractorPayments")}
        subtitle={formatYM(month, lang)}
        actions={
          <>
            {cards.length > 0 && (
              <SearchInput
                placeholder={t("search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            )}
            <ButtonGhost onClick={() => setTeamsOpen(true)}>
              {t("teams")}
            </ButtonGhost>
          </>
        }
      />

      <TeamsModal open={teamsOpen} onClose={() => setTeamsOpen(false)} />

      {cards.length === 0 ? (
        <EmptyState
          icon={<Icon name="subcontractors" size={22} />}
          title={t("noSubcontractorReports")}
          description={t("subcontractorsNote")}
        />
      ) : (
        <>
          <div className="flex gap-5 max-[768px]:flex-col">
            {/* Sidebar */}
            <div className="flex flex-col gap-2 w-72 shrink-0 max-[768px]:w-full">
              {visibleCards.length === 0 && (
                <p className="rounded-lg border border-border bg-surface p-4 shadow-(--shadow-card) text-sm text-text-muted">
                  {t("noResults")}
                </p>
              )}
              {visibleCards.map((card) => {
                const cardStatus = cardStatusOf(card);
                const isActive = selectedKey === card.key;
                return (
                  <button
                    key={card.key}
                    onClick={() => {
                      setSelectedKey(card.key);
                    }}
                    className={`text-left p-4 rounded-lg border shadow-(--shadow-card) transition-colors ${
                      isActive
                        ? "bg-beet-tint border-beet"
                        : "bg-surface border-border hover:border-border-strong"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-medium text-text text-sm">
                        {card.label}
                      </span>
                      <Badge variant={STATUS_VARIANT[cardStatus]}>
                        {t(
                          cardStatus.toLowerCase() as
                            | "paid"
                            | "partial"
                            | "unpaid",
                        )}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-text-muted mb-1">
                      {card.projectBreakdown.length}{" "}
                      {card.projectBreakdown.length === 1
                        ? t("project")
                        : t("projects")}
                    </p>
                    <p className="tnum text-sm font-semibold text-danger">
                      {t("owed")}: {formatILS(card.totalOwed)}
                    </p>
                    <p className="tnum text-sm font-semibold text-success">
                      {t("paid")}: {formatILS(card.totalPaid)}
                    </p>
                    {/* The balance is the number actually acted on, so it
                      is styled to stand out and coloured like the statuses:
                      settled at zero, outstanding above it. */}
                    <p
                      className={`tnum text-sm font-bold ${
                        card.totalOwed - card.totalPaid <= 0
                          ? "text-success"
                          : "text-warning"
                      }`}
                    >
                      {t("balance")}:{" "}
                      {formatILS(card.totalOwed - card.totalPaid)}
                    </p>
                    {card.isTeam && (
                      <ul className="mt-2 flex flex-col gap-0.5 border-t border-border pt-2 text-[11px] text-text-muted">
                        {memberTotals(card).map((m) => (
                          <li
                            key={m.id}
                            className="tnum flex justify-between gap-2"
                          >
                            <span>{m.name}</span>
                            <span>
                              {formatILS(m.paid)} / {formatILS(m.owed)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Main panel */}
            {selectedCard ? (
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display text-xl text-text">
                    {selectedCard.label}
                  </h2>
                </div>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-label font-semibold text-text-muted rtl:text-right">
                        {t("project")}
                      </th>
                      {selectedCard.isTeam && (
                        <th className="text-left py-2 px-3 text-label font-semibold text-text-muted rtl:text-right">
                          {t("takenBy")}
                        </th>
                      )}
                      <th className="text-right py-2 px-3 text-label font-semibold text-text-muted rtl:text-left">
                        {t("amountOwed")}
                      </th>
                      <th className="text-right py-2 px-3 text-label font-semibold text-text-muted rtl:text-left">
                        {t("amountPaid")}
                      </th>
                      <th className="py-2 px-3 text-label font-semibold text-text-muted text-center">
                        {t("paid")}?
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCard.projectBreakdown.map((pb) => {
                      const projectPayments = paymentsFor(
                        pb.projectId,
                        pb.subId,
                      );
                      const paid = projectPayments.reduce(
                        (s, p) => s + p.amount,
                        0,
                      );
                      const status = projectStatus(paid, pb.owed);
                      const remaining = roundToAgorot(pb.owed - paid);
                      const isPending = pendingProject[pb.projectId] ?? false;
                      const isEntryOpen = entryOpen[pb.projectId] ?? false;

                      return (
                        <>
                          <tr
                            key={pb.projectId}
                            className="border-b border-border"
                          >
                            <td className="py-3 px-3 text-text">
                              <div>{pb.projectName}</div>
                              {status === "Partial" && (
                                <div
                                  className="text-[11px] mt-0.5"
                                  style={{ color: "var(--warning)" }}
                                >
                                  {t("remaining")}: {formatILS(remaining)}
                                </div>
                              )}
                            </td>
                            {selectedCard.isTeam && (
                              <td className="py-3 px-3">
                                {/* Who took the project this month. Locked once
                                  instalments are recorded to that member. */}
                                <Select
                                  aria-label={`${t("takenBy")} — ${pb.projectName}`}
                                  value={pb.subId}
                                  disabled={projectPayments.length > 0}
                                  title={
                                    projectPayments.length > 0
                                      ? t("changeMemberBlocked")
                                      : undefined
                                  }
                                  onChange={(e) =>
                                    void handleChangeMember(
                                      pb.reportId,
                                      e.target.value,
                                    )
                                  }
                                >
                                  {selectedCard.members.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.name}
                                    </option>
                                  ))}
                                </Select>
                              </td>
                            )}
                            <td className="py-3 px-3 text-right font-medium rtl:text-left">
                              <span
                                style={{
                                  color:
                                    status === "Paid"
                                      ? "var(--success)"
                                      : status === "Partial"
                                        ? "var(--warning)"
                                        : "var(--danger)",
                                }}
                              >
                                {formatILS(pb.owed)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-success rtl:text-left">
                              {formatILS(paid)}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Red X — Unpaid */}
                                <button
                                  disabled={isPending}
                                  onClick={() =>
                                    void handleSetUnpaid(pb.projectId, pb.subId)
                                  }
                                  title={t("unpaid")}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:opacity-50"
                                  style={
                                    status === "Unpaid"
                                      ? {
                                          background: "var(--danger)",
                                          borderColor: "var(--danger)",
                                          color: "white",
                                        }
                                      : {
                                          background: "transparent",
                                          borderColor: "var(--border)",
                                          color: "var(--text-muted)",
                                        }
                                  }
                                >
                                  <Icon name="close" size={14} />
                                </button>

                                {/* Green V — Paid in full: opens the row with the
                                  outstanding balance filled in, so the day it
                                  was paid is still stated before it is saved. */}
                                <button
                                  disabled={isPending || remaining <= 0}
                                  onClick={() =>
                                    openEntry(pb.projectId, String(remaining))
                                  }
                                  title={t("paid")}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:opacity-50"
                                  style={
                                    status === "Paid"
                                      ? {
                                          background: "var(--success)",
                                          borderColor: "var(--success)",
                                          color: "white",
                                        }
                                      : {
                                          background: "transparent",
                                          borderColor: "var(--border)",
                                          color: "var(--text-muted)",
                                        }
                                  }
                                >
                                  <Icon name="check" size={14} />
                                </button>

                                {/* Yellow ~ — Partial: one instalment, amount
                                  and date both typed by the user. */}
                                <button
                                  disabled={isPending}
                                  onClick={() =>
                                    isEntryOpen
                                      ? closeEntry(pb.projectId)
                                      : openEntry(pb.projectId, "")
                                  }
                                  title={t("partial")}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:opacity-50"
                                  style={
                                    status === "Partial"
                                      ? {
                                          background: "var(--warning)",
                                          borderColor: "var(--warning)",
                                          color: "white",
                                        }
                                      : {
                                          background: "transparent",
                                          borderColor: "var(--border)",
                                          color: "var(--text-muted)",
                                        }
                                  }
                                >
                                  <Icon name="wave" size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Each recorded payment as its own line: the
                            day the money moved on one side, the amount on the
                            other. A month settled in three instalments shows
                            three dated lines, each removable and each with its
                            own date, correctable by clicking it. */}
                          {projectPayments.length > 0 && (
                            <tr
                              key={`${pb.projectId}-payments`}
                              className="border-b border-border"
                            >
                              <td colSpan={colCount} className="px-3 py-1">
                                <ul className="flex flex-col gap-0.5">
                                  {projectPayments.map((payment) => (
                                    <li
                                      key={payment.id}
                                      className="flex items-center justify-between gap-2 text-xs text-text-muted"
                                    >
                                      {editingDate[payment.id] ? (
                                        <input
                                          type="date"
                                          autoFocus
                                          aria-label={t("paymentDate")}
                                          className="px-1.5 py-0.5 rounded-sm border border-border bg-surface text-text text-xs outline-hidden focus:border-beet"
                                          defaultValue={
                                            payment.paymentDate?.slice(0, 10) ??
                                            todayISO()
                                          }
                                          onChange={(e) =>
                                            void handleChangePaymentDate(
                                              payment.id,
                                              e.target.value,
                                            )
                                          }
                                          onBlur={() =>
                                            setEditingDate((prev) => ({
                                              ...prev,
                                              [payment.id]: false,
                                            }))
                                          }
                                        />
                                      ) : (
                                        <button
                                          onClick={() =>
                                            setEditingDate((prev) => ({
                                              ...prev,
                                              [payment.id]: true,
                                            }))
                                          }
                                          title={t("paymentDate")}
                                          className="underline decoration-dotted underline-offset-2 hover:text-text transition-colors"
                                        >
                                          {payment.paymentDate
                                            ? formatISODate(
                                                payment.paymentDate,
                                                lang,
                                                {
                                                  day: "numeric",
                                                  month: "short",
                                                  year: "numeric",
                                                },
                                              )
                                            : t("noDateRecorded")}
                                        </button>
                                      )}
                                      {descriptionDrafts[payment.id] !==
                                      undefined ? (
                                        <span className="flex min-w-0 flex-1 items-center gap-1.5">
                                          <input
                                            type="text"
                                            autoFocus
                                            maxLength={500}
                                            aria-label={t("description")}
                                            placeholder={t("description")}
                                            className="min-w-0 flex-1 px-1.5 py-0.5 rounded-sm border border-border bg-surface text-text text-xs outline-hidden focus:border-beet"
                                            value={
                                              descriptionDrafts[payment.id]
                                            }
                                            onChange={(e) =>
                                              setDescriptionDrafts((prev) => ({
                                                ...prev,
                                                [payment.id]: e.target.value,
                                              }))
                                            }
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter")
                                                void handleSaveDescription(
                                                  payment.id,
                                                  payment.description,
                                                );
                                              if (e.key === "Escape")
                                                closeDescriptionEditor(
                                                  payment.id,
                                                );
                                            }}
                                          />
                                          <button
                                            onClick={() =>
                                              void handleSaveDescription(
                                                payment.id,
                                                payment.description,
                                              )
                                            }
                                            className="inline-flex h-6 items-center gap-1 rounded-full border border-beet bg-beet px-2 font-semibold text-white transition-opacity hover:opacity-90"
                                          >
                                            <Icon name="check" size={12} />
                                            {t("save")}
                                          </button>
                                          <button
                                            onClick={() =>
                                              closeDescriptionEditor(payment.id)
                                            }
                                            className="inline-flex h-6 items-center rounded-full border border-border px-2 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
                                          >
                                            {t("cancel")}
                                          </button>
                                        </span>
                                      ) : (
                                        <span className="flex min-w-0 flex-1 items-center gap-1.5">
                                          {payment.description && (
                                            <span
                                              className="min-w-0 truncate text-text"
                                              title={payment.description}
                                            >
                                              {payment.description}
                                            </span>
                                          )}
                                          <button
                                            disabled={isPending}
                                            onClick={() =>
                                              openDescriptionEditor(
                                                payment.id,
                                                payment.description,
                                              )
                                            }
                                            title={
                                              payment.description
                                                ? t("editDescription")
                                                : t("addDescription")
                                            }
                                            aria-label={
                                              payment.description
                                                ? t("editDescription")
                                                : t("addDescription")
                                            }
                                            className="inline-flex h-6 shrink-0 items-center justify-center gap-1 rounded-sm border border-border px-1.5 text-text-dim transition-colors hover:border-beet hover:text-beet disabled:opacity-40"
                                          >
                                            <Icon
                                              name={
                                                payment.description
                                                  ? "edit"
                                                  : "plus"
                                              }
                                              size={12}
                                            />
                                            {!payment.description &&
                                              t("addDescription")}
                                          </button>
                                          {payment.description && (
                                            <button
                                              disabled={isPending}
                                              onClick={() =>
                                                void handleDeleteDescription(
                                                  payment.id,
                                                )
                                              }
                                              title={t("deleteDescription")}
                                              aria-label={t(
                                                "deleteDescription",
                                              )}
                                              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-border text-text-dim transition-colors hover:border-danger hover:text-danger disabled:opacity-40"
                                            >
                                              <Icon name="trash" size={12} />
                                            </button>
                                          )}
                                        </span>
                                      )}
                                      <span className="flex items-center gap-2">
                                        <span className="text-text font-medium">
                                          {formatILS(payment.amount)}
                                        </span>
                                        <button
                                          disabled={isPending}
                                          onClick={() =>
                                            void handleDeletePayment(
                                              pb.projectId,
                                              payment.id,
                                            )
                                          }
                                          title={t("delete")}
                                          className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-border text-text-dim transition-colors hover:border-danger hover:text-danger disabled:opacity-40"
                                        >
                                          <Icon name="close" size={14} />
                                        </button>
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          )}

                          {/* Instalment entry row — amount, the day it moved and
                            an optional description */}
                          {isEntryOpen && (
                            <tr
                              key={`${pb.projectId}-partial`}
                              className="border-b border-border bg-surface"
                            >
                              <td colSpan={colCount} className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-40">
                                    <Input
                                      id={`partial-${pb.projectId}`}
                                      label=""
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      max={remaining}
                                      value={entryAmounts[pb.projectId] ?? ""}
                                      onChange={(e) =>
                                        setEntryAmounts((prev) => ({
                                          ...prev,
                                          [pb.projectId]: e.target.value,
                                        }))
                                      }
                                      placeholder={`0 – ${remaining}`}
                                    />
                                  </div>
                                  <div className="w-44">
                                    <Input
                                      id={`payment-date-${pb.projectId}`}
                                      label=""
                                      type="date"
                                      aria-label={t("paymentDate")}
                                      value={paymentDateFor(pb.projectId)}
                                      onChange={(e) =>
                                        setPaymentDates((prev) => ({
                                          ...prev,
                                          [pb.projectId]: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <Input
                                      id={`payment-description-${pb.projectId}`}
                                      label=""
                                      type="text"
                                      maxLength={500}
                                      aria-label={t("description")}
                                      placeholder={t("descriptionOptional")}
                                      value={
                                        entryDescriptions[pb.projectId] ?? ""
                                      }
                                      onChange={(e) =>
                                        setEntryDescriptions((prev) => ({
                                          ...prev,
                                          [pb.projectId]: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                  <button
                                    disabled={
                                      isPending ||
                                      !(
                                        parseFloat(
                                          entryAmounts[pb.projectId] ?? "",
                                        ) > 0
                                      )
                                    }
                                    onClick={() =>
                                      void handleAddPayment(
                                        pb.projectId,
                                        pb.subId,
                                      )
                                    }
                                    title={t("save")}
                                    className="inline-flex h-8 items-center justify-center rounded bg-beet px-3 text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                                  >
                                    <Icon name="check" size={14} />
                                  </button>
                                  <button
                                    onClick={() => closeEntry(pb.projectId)}
                                    title={t("cancel")}
                                    className="inline-flex h-8 items-center justify-center rounded-full border border-border px-2.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
                                  >
                                    <Icon name="close" size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    {selectedCard.isTeam &&
                      memberTotals(selectedCard).map((m, i) => (
                        <tr
                          key={m.id}
                          className={
                            i === 0 ? "border-t-2 border-border" : undefined
                          }
                        >
                          <td className="py-1.5 px-3 text-text-muted">
                            {i === 0 && (
                              <span className="block text-label">
                                {t("memberTotals")}
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-3 text-text">{m.name}</td>
                          <td className="py-1.5 px-3 text-right font-medium text-text rtl:text-left">
                            {formatILS(m.owed)}
                          </td>
                          <td className="py-1.5 px-3 text-right font-medium text-success rtl:text-left">
                            {formatILS(m.paid)}
                          </td>
                          <td />
                        </tr>
                      ))}
                    <tr className="border-t-2 border-border">
                      <td
                        colSpan={selectedCard.isTeam ? 2 : 1}
                        className="py-2 px-3 font-semibold text-text"
                      >
                        {selectedCard.isTeam ? t("teamTotal") : t("totalOwed")}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-bold rtl:text-left ${totalAmountClass}`}
                      >
                        {formatILS(selectedCard.totalOwed)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-success rtl:text-left">
                        {formatILS(selectedCard.totalPaid)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-text-dim">
                    <Icon name="subcontractors" size={22} />
                  </div>
                  <p className="max-w-[32ch] text-sm text-text-muted">
                    {t("selectSubcontractor")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
