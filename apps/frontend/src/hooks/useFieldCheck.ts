import { useCallback } from "react";
import { describeFieldProblems } from "@/api/fieldLabels";
import { useLang } from "@/contexts/useLang";
import { useToast } from "@/contexts/useToast";

/** What is wrong with a field, or `false` when it is fine. */
export type FieldProblem = "missing" | "invalid" | false;

/**
 * A save guard that never refuses silently: given each field's label and its
 * problem, it toasts which fields need attention and returns false, or
 * returns true when the form can be sent.
 *
 *   if (!checkFields([[t("name"), !name.trim() && "missing"]])) return;
 */
export function useFieldCheck() {
  const { t } = useLang();
  const { toast } = useToast();
  return useCallback(
    (fields: [label: string, problem: FieldProblem][]): boolean => {
      const labelsWith = (problem: FieldProblem) =>
        fields.filter(([, p]) => p === problem).map(([label]) => label);
      const message = describeFieldProblems(
        labelsWith("missing"),
        labelsWith("invalid"),
        t,
      );
      if (message) toast(message, "error");
      return message === null;
    },
    [t, toast],
  );
}
