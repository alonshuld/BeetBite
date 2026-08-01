import { baseApi } from "@/api/baseApi";

export interface VatRate {
  id: string;
  effectiveMonth: string;
  percentage: number;
  createdAt: string;
}

export interface UpsertVatRateDto {
  month: string;
  percentage: number;
}

export interface ResolvedVatRate {
  percentage: number | null;
}

export const vatRatesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getVatRateHistory: build.query<VatRate[], void>({
      query: () => "/vat-rates",
      providesTags: ["VatRates"],
    }),
    getResolvedVatRate: build.query<ResolvedVatRate, string>({
      query: (month) => `/vat-rates/resolve?month=${month}-01`,
      providesTags: ["VatRates"],
    }),
    upsertVatRate: build.mutation<VatRate, UpsertVatRateDto>({
      query: (body) => ({ url: "/vat-rates", method: "PUT", body }),
      invalidatesTags: ["VatRates"],
    }),
  }),
});

export const {
  useGetVatRateHistoryQuery,
  useGetResolvedVatRateQuery,
  useUpsertVatRateMutation,
} = vatRatesApi;
