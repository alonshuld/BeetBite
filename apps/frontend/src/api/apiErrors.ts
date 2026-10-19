import type { Lang, TranslationKey } from "@/contexts/langContext";
import { formatYM } from "@/utils/formatMonth";
import { describeFieldProblems, fieldLabels } from "@/api/fieldLabels";

/**
 * An error as the backend's EntityExceptionFilter returns it, or a network
 * failure that never reached the server. `code` and `params` are present on
 * every domain error; `message` is always English.
 */
export interface ApiError {
  /** HTTP status, or RTK Query's "FETCH_ERROR" / "TIMEOUT_ERROR" etc. */
  status: number | string;
  message?: string | string[];
  code?: string;
  params?: Record<string, string | number>;
}

/**
 * Hebrew text for each backend error code. Kept in sync with the codes thrown
 * under the backend's `*\/errors/` directories (see common/errors/coded-error.ts).
 * English has no table: the server's own message is already English and more
 * specific than anything written here. `{name}`-style placeholders are filled
 * from the error's `params`.
 */
export const hebrewApiErrors: Record<string, string> = {
  // Request body failed validation. With field params it is described by
  // describeValidationError instead; this line is only the bare fallback.
  VALIDATION_FAILED: "חלק מהפרטים שהוזנו חסרים או אינם תקינים.",
  // Generic bases — a domain error whose subclass sets no code of its own
  NOT_FOUND: "הפריט המבוקש לא נמצא.",
  ALREADY_EXISTS: "רשומה כזו כבר קיימת.",
  ENTITY_ERROR: "לא ניתן לבצע את הפעולה.",
  HAS_RELATED_RECORDS:
    "לא ניתן למחוק את הפריט כי קיימות רשומות הקשורות אליו. יש להסיר אותן תחילה.",
  // Auth
  INVALID_CREDENTIALS: "שם משתמש או סיסמה שגויים.",
  USER_NOT_FOUND: "שם משתמש או סיסמה שגויים.",
  // Clients
  CLIENT_ALREADY_EXISTS: "לקוח בשם {name} כבר קיים.",
  CLIENT_NOT_FOUND: "הלקוח לא נמצא.",
  CLIENT_HAS_PROJECTS:
    "לא ניתן למחוק את הלקוח {name} כי יש לו פרויקטים ({projects}). יש להסיר אותם תחילה.",
  // Projects
  PROJECT_ALREADY_EXISTS: "פרויקט בשם {name} כבר קיים.",
  PROJECT_NOT_FOUND: "הפרויקט לא נמצא.",
  PROJECT_CLIENT_CHANGE_REQUIRES_TRANSFER:
    "לא ניתן לשנות את הלקוח של פרויקט בעריכה. יש להשתמש ב״העבר ללקוח אחר״ ולבחור מאיזה חודש השינוי חל.",
  PROJECT_HAS_RELATED_RECORDS:
    "לא ניתן למחוק את הפרויקט כי יש לו דוחות או תשלומים. יש להסיר אותם תחילה.",
  // Project-client assignments
  ASSIGNMENT_MONTH_TAKEN:
    "לפרויקט כבר קיימת החלפת לקוח החל מ-{month}. יש לערוך אותה במקום להוסיף שנייה.",
  ASSIGNMENT_NOT_FOUND: "שיוך הלקוח לפרויקט לא נמצא.",
  CANNOT_REMOVE_EARLIEST_ASSIGNMENT:
    "לא ניתן להסיר את שיוך הלקוח הראשון של הפרויקט — לכל פרויקט חייב להיות לקוח. יש לשנות את הלקוח במקום זאת.",
  // Initiators
  INITIATOR_ALREADY_EXISTS: "יזם בשם {name} כבר קיים.",
  INITIATOR_NOT_FOUND: "היזם לא נמצא.",
  // Project reports
  PROJECT_REPORT_ALREADY_EXISTS: "כבר קיים דוח לפרויקט זה בחודש {month}.",
  PROJECT_REPORT_NOT_FOUND: "דוח הפרויקט לא נמצא.",
  INITIATOR_INCOME_NOT_ALLOWED:
    "ניתן להגדיר הכנסה מיזם רק בדוח של פרויקט שמקושר אליו יזם.",
  INITIATOR_INCOME_TOO_LOW: "ההכנסה מיזם חייבת להיות גדולה מהכנסת הדוח עצמו.",
  // Subcontractors
  SUBCONTRACTOR_ALREADY_EXISTS: "קבלן משנה בשם {value} כבר קיים.",
  SUBCONTRACTOR_COMPANY_NUMBER_TAKEN:
    "קבלן משנה עם מספר חברה {value} כבר קיים.",
  SUBCONTRACTOR_NOT_FOUND: "קבלן המשנה לא נמצא.",
  SUBCONTRACTOR_ALREADY_IN_TEAM: "{name} כבר חבר/ה בצוות אחר.",
  SUBCONTRACTOR_TEAM_NOT_FOUND: "הצוות לא נמצא.",
  SUBCONTRACTOR_NOT_IN_TEAM: "אפשר להעביר את הפרויקט רק לחבר/ה באותו צוות.",
  PROJECT_REPORT_HAS_SUBCONTRACTOR_PAYMENTS:
    "כבר נרשמו תשלומים על הפרויקט החודש. יש למחוק אותם לפני החלפת חבר הצוות.",
  // Subcontractor payments
  SUBCONTRACTOR_PAYMENT_NOT_FOUND: "התשלום לקבלן המשנה לא נמצא.",
  SUBCONTRACTOR_PAYMENT_OVERPAYMENT:
    "תשלום של ₪{amount} יחרוג מהסכום לתשלום. לתשלום: ₪{owed}, שולם עד כה: ₪{paid}.",
  // Client payments (turnover summary)
  CLIENT_PAYMENT_NOT_FOUND: "התשלום מהלקוח לא נמצא.",
  CLIENT_PAYMENT_OVERPAYMENT:
    'תשלום של ₪{amount} יחרוג מההכנסה ללא מע"מ. הכנסה: ₪{owed}, שולם עד כה: ₪{paid}.',
  // Suppliers
  SUPPLIER_ALREADY_EXISTS: "ספק בשם {name} כבר קיים.",
  SUPPLIER_NOT_FOUND: "הספק לא נמצא.",
  SUPPLIER_PAYMENT_ALREADY_EXISTS: "כבר קיים תשלום לספק זה בחודש {month}.",
  SUPPLIER_PAYMENT_NOT_FOUND: "התשלום לספק לא נמצא.",
  // PDF export
  COMPANY_SETTINGS_INCOMPLETE:
    "יש להגדיר שם חברה ומספר חברה בהגדרות החברה לפני ייצוא PDF.",
  INITIATOR_INCOME_REQUIRED_FOR_EXPORT:
    "יש להגדיר הכנסה מיזם לדוח זה לפני ייצוא ה-PDF שלו — לפרויקט מקושר יזם.",
  NO_REPORTS_FOR_EXPORT: "לא נמצא דוח פרויקט לייצוא.",
  VAT_RATE_NOT_CONFIGURED: "לא הוגדר שיעור מע״מ לחודש {month} או לפניו.",
  PROJECT_NOT_IN_CLIENT_EXPORT:
    "אחד הפרויקטים בסימולציה אינו שייך ללקוח זה בחודש הנבחר.",
};

function formatParam(key: string, value: string | number, lang: Lang): string {
  if (
    key === "month" &&
    typeof value === "string" &&
    /^\d{4}-\d{2}/.test(value)
  ) {
    return formatYM(value.slice(0, 7), lang);
  }
  if (typeof value === "number") return value.toLocaleString("he-IL");
  return value;
}

function interpolate(
  template: string,
  params: ApiError["params"],
  lang: Lang,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params?.[key];
    return value === undefined ? match : formatParam(key, value, lang);
  });
}

function statusFallback(status: ApiError["status"]): TranslationKey {
  if (status === "FETCH_ERROR" || status === "TIMEOUT_ERROR") {
    return "errorNetwork";
  }
  if (status === 400 || status === 422) return "errorInvalidRequest";
  if (status === 404) return "errorNotFound";
  if (status === 409) return "errorConflict";
  return "errorUnexpected";
}

/**
 * "Fill in the required fields: Description, Location" — the fields named
 * with their form labels, in either language. Null when the error carries no
 * field names.
 */
function describeValidationError(
  error: ApiError,
  t: (key: TranslationKey) => string,
): string | null {
  return describeFieldProblems(
    fieldLabels(error.params?.missing, t),
    fieldLabels(error.params?.invalid, t),
    t,
  );
}

/**
 * The text to show the user for a failed request, in their language.
 *
 * Hebrew: the error's code, translated; failing that, a generic line for
 * its HTTP status — never the server's English. English: the server's own
 * message; failing that, the same generic line.
 */
export function describeApiError(
  error: ApiError,
  lang: Lang,
  t: (key: TranslationKey) => string,
): string {
  if (error.code === "VALIDATION_FAILED") {
    const text = describeValidationError(error, t);
    if (text) return text;
  }
  if (lang === "he") {
    const template = error.code ? hebrewApiErrors[error.code] : undefined;
    if (template) return interpolate(template, error.params, lang);
  } else if (error.status !== "FETCH_ERROR") {
    const message = Array.isArray(error.message)
      ? error.message.join(", ")
      : error.message;
    if (message) return message;
  }
  return t(statusFallback(error.status));
}

/**
 * Normalises whatever RTK Query rejected with (a FetchBaseQueryError, or the
 * `.unwrap()` rejection of one) into an ApiError.
 */
export function toApiError(err: unknown): ApiError {
  if (!err || typeof err !== "object") return { status: "UNKNOWN" };
  const { status, data } = err as { status?: unknown; data?: unknown };
  const body =
    data && typeof data === "object" ? (data as Omit<ApiError, "status">) : {};
  return {
    status:
      typeof status === "number" || typeof status === "string"
        ? status
        : "UNKNOWN",
    message: body.message,
    code: body.code,
    params: body.params,
  };
}
