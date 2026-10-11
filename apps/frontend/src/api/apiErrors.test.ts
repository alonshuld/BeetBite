import { describe, it, expect } from "vite-plus/test";
import { describeApiError, hebrewApiErrors, toApiError } from "./apiErrors";
import { translations, type TranslationKey } from "@/contexts/langContext";

const tFor = (lang: "en" | "he") => (key: TranslationKey) =>
  translations[lang][key];

describe("describeApiError", () => {
  it("names missing fields by their Hebrew form labels", () => {
    expect(
      describeApiError(
        {
          status: 400,
          code: "VALIDATION_FAILED",
          message: ["description should not be empty"],
          params: { missing: "description,clientId" },
        },
        "he",
        tFor("he"),
      ),
    ).toBe("יש למלא את שדות החובה: תיאור, לקוח");
  });

  it("separates missing fields from bad values, naming nested ones once", () => {
    expect(
      describeApiError(
        {
          status: 400,
          code: "VALIDATION_FAILED",
          params: {
            missing: "openingBalance.subcontractorId",
            invalid: "payments.0.amount,payments.1.amount",
          },
        },
        "en",
        tFor("en"),
      ),
    ).toBe(
      "Fill in the required fields: Subcontractor. Check the values in: Amount (₪)",
    );
  });

  it("falls back to a generic line when no fields are named", () => {
    expect(
      describeApiError(
        { status: 400, code: "VALIDATION_FAILED" },
        "he",
        tFor("he"),
      ),
    ).toBe(hebrewApiErrors.VALIDATION_FAILED);
  });

  it("translates a coded error into Hebrew", () => {
    expect(
      describeApiError(
        {
          status: 400,
          code: "INITIATOR_INCOME_TOO_LOW",
          message:
            "Initiator income must be greater than the report's own income",
        },
        "he",
        tFor("he"),
      ),
    ).toBe(hebrewApiErrors.INITIATOR_INCOME_TOO_LOW);
  });

  it("interpolates params into the Hebrew message", () => {
    expect(
      describeApiError(
        {
          status: 409,
          code: "CLIENT_ALREADY_EXISTS",
          params: { name: "Acme" },
        },
        "he",
        tFor("he"),
      ),
    ).toBe("לקוח בשם Acme כבר קיים.");
  });

  it("formats numeric params as amounts", () => {
    const text = describeApiError(
      {
        status: 400,
        code: "SUBCONTRACTOR_PAYMENT_OVERPAYMENT",
        params: { amount: 50000, owed: 12000, paid: 2000 },
      },
      "he",
      tFor("he"),
    );
    expect(text).toContain("₪50,000");
    expect(text).toContain("₪12,000");
    expect(text).toContain("₪2,000");
  });

  it("never shows the server's English in Hebrew when the code is unknown", () => {
    expect(
      describeApiError(
        { status: 400, message: "amount must not be less than 0" },
        "he",
        tFor("he"),
      ),
    ).toBe(translations.he.errorInvalidRequest);
  });

  it("uses the server's message in English", () => {
    expect(
      describeApiError(
        {
          status: 409,
          code: "CLIENT_ALREADY_EXISTS",
          message: "A client with the name Acme already exists",
        },
        "en",
        tFor("en"),
      ),
    ).toBe("A client with the name Acme already exists");
  });

  it("joins validation message arrays in English", () => {
    expect(
      describeApiError(
        { status: 400, message: ["a is bad", "b is bad"] },
        "en",
        tFor("en"),
      ),
    ).toBe("a is bad, b is bad");
  });

  it.each(["en", "he"] as const)("reports network failures in %s", (lang) => {
    expect(describeApiError({ status: "FETCH_ERROR" }, lang, tFor(lang))).toBe(
      translations[lang].errorNetwork,
    );
  });

  it("falls back to a generic message when there is nothing to show", () => {
    expect(describeApiError({ status: 500 }, "en", tFor("en"))).toBe(
      translations.en.errorUnexpected,
    );
  });
});

describe("toApiError", () => {
  it("lifts code, params and message out of the response body", () => {
    expect(
      toApiError({
        status: 409,
        data: { message: "m", code: "C", params: { name: "x" } },
      }),
    ).toEqual({ status: 409, message: "m", code: "C", params: { name: "x" } });
  });

  it("tolerates a missing body", () => {
    expect(toApiError({ status: "FETCH_ERROR", error: "x" })).toEqual({
      status: "FETCH_ERROR",
      message: undefined,
      code: undefined,
      params: undefined,
    });
  });
});
