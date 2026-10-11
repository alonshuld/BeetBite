import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "@/api/baseApi";
import authReducer from "@/features/auth/authSlice";

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // The PDF-export mutation returns a Blob (see project-report-exports.ts)
      // — an intentional, non-serializable RTK Query result. Scope the dev-only
      // serializability check to skip just that value instead of disabling it.
      // Setting ignoredActionPaths replaces RTK's defaults, so they are
      // repeated: `meta.baseQueryMeta` carries fetchBaseQuery's Request and
      // Response objects on every query action.
      serializableCheck: {
        ignoredActionPaths: ["meta.arg", "meta.baseQueryMeta", "payload"],
        ignoredPaths: [/^api\.mutations\..*\.data$/],
      },
    }).concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
