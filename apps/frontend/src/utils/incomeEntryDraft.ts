/** An income row as the report forms hold it: every field still typed text. */
export interface IncomeEntryDraftFields {
  amount: string;
  incomeDate: string;
  tag: string;
}

/** A row the user left completely empty — nothing to save. */
export function isBlankIncomeDraft(entry: IncomeEntryDraftFields): boolean {
  return entry.amount === "" && entry.incomeDate === "" && !entry.tag.trim();
}

/** Income is optional: an amount left empty is saved as 0. */
export function draftIncomeAmount(amount: string): number {
  return amount === "" ? 0 : Number(amount);
}
