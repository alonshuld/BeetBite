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
import { toApiError } from "@/api/apiErrors";

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
      // Translated at display time, where the user's language is known.
      emitApiError(toApiError(result.error));
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
    "Suppliers",
    "Initiators",
    "Projects",
    "ProjectReports",
    "SupplierPayments",
    "SubcontractorPayments",
    "Incomes",
    "CompanySettings",
    "VatRates",
    "ProjectClientAssignments",
  ],
  endpoints: () => ({}),
});
