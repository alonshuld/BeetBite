import { baseApi } from "@/api/baseApi";

/** Ids of the fonts the backend can embed in exported PDFs. */
export type PdfFont =
  | "noto-sans-hebrew"
  | "heebo"
  | "rubik"
  | "assistant"
  | "frank-ruhl-libre"
  | "david-libre";

export interface CompanySettings {
  id: string;
  name: string | null;
  description: string | null;
  companyNumber: string | null;
  phone: string | null;
  email: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  logo: string | null;
  signature: string | null;
  pdfPrimaryColor: string;
  pdfSecondaryColor: string;
  pdfFont: PdfFont;
  updatedAt: string;
}

export interface UpsertCompanySettingsDto {
  name?: string | null;
  description?: string | null;
  companyNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  logo?: string | null;
  signature?: string | null;
  pdfPrimaryColor?: string;
  pdfSecondaryColor?: string;
  pdfFont?: PdfFont;
}

export const companySettingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCompanySettings: build.query<CompanySettings | null, void>({
      query: () => ({ url: "/company-settings" }),
      providesTags: ["CompanySettings"],
    }),
    upsertCompanySettings: build.mutation<
      CompanySettings,
      UpsertCompanySettingsDto
    >({
      query: (body) => ({ url: "/company-settings", method: "PUT", body }),
      invalidatesTags: ["CompanySettings"],
    }),
  }),
});

export const { useGetCompanySettingsQuery, useUpsertCompanySettingsMutation } =
  companySettingsApi;
