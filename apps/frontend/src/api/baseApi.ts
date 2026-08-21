import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { logout } from "@/features/auth/authSlice";
import type { RootState } from "@/app/store";
import { emitApiError } from "@/api/errorEmitter";

const baseQuery = fetchBaseQuery({
  baseUrl: "/api/v1",
  prepareHeaders(headers, { getState }) {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);
  if (result.error) {
    if (result.error.status === 401) {
      api.dispatch(logout());
    } else {
      let message: string;
      if (result.error.status === "FETCH_ERROR") {
        message = "Network error. Check your connection.";
      } else {
        message =
          (result.error.data as { message?: string } | undefined)?.message ??
          "An unexpected error occurred.";
      }
      emitApiError(message);
    }
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Clients",
    "Subcontractors",
    "Corporations",
    "Projects",
    "ProjectReports",
    "CorporationPayments",
    "SubcontractorPayments",
    "Incomes",
    "CompanySettings",
    "VatRates",
  ],
  endpoints: () => ({}),
});
