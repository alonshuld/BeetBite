import { useCallback, useState } from "react";
import { ConfirmModal } from "@/components/organisms/Modal";
import { useLang } from "@/contexts/useLang";

/**
 * A save guard for supplier payments that outrun a report's income.
 *
 * `confirmOverIncome(projectNames, save)` runs `save` straight away when the
 * list is empty; otherwise it asks first, naming the projects, and runs it
 * only on "Save anyway". Render `overIncomeModal` after the form it guards,
 * so the question sits on top of it.
 *
 *   confirmOverIncome(
 *     goesOverIncome(before, after) ? [projectName] : [],
 *     () => void save(),
 *   );
 */
export function useOverIncomeConfirm() {
  const { t } = useLang();
  const [pending, setPending] = useState<{
    projectNames: string[];
    proceed: () => void;
  } | null>(null);

  const confirmOverIncome = useCallback(
    (projectNames: string[], proceed: () => void) => {
      if (projectNames.length === 0) {
        proceed();
        return;
      }
      setPending({ projectNames, proceed });
    },
    [],
  );

  const overIncomeModal = (
    <ConfirmModal
      open={pending !== null}
      onClose={() => setPending(null)}
      onConfirm={() => {
        const proceed = pending?.proceed;
        setPending(null);
        proceed?.();
      }}
      title={t("paymentsExceedIncomeTitle")}
      message={
        pending
          ? `${t("paymentsExceedIncome")} ${pending.projectNames.join(", ")}. ${t("paymentsExceedIncomeConsequence")}`
          : ""
      }
      confirmLabel={t("saveAnyway")}
      tone="primary"
    />
  );

  return { confirmOverIncome, overIncomeModal };
}
