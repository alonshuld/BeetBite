import { baseApi } from "@/api/baseApi";

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
