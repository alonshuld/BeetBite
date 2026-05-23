import { ReactElement, ReactNode } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "@/api/baseApi";
import authReducer from "@/features/auth/authSlice";
import { LangProvider } from "@/contexts/LangContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/contexts/ToastContext";
import type { RootState } from "@/app/store";

interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  preloadedState?: Partial<RootState>;
  initialEntries?: string[];
}

export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      auth: authReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
    preloadedState: preloadedState as RootState | undefined,
  });
}

export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState,
    initialEntries = ["/"],
    ...renderOptions
  }: RenderWithProvidersOptions = {},
) {
  const store = makeStore(preloadedState);

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={initialEntries}>
          <LangProvider>
            <ThemeProvider>
              <ToastProvider>{children}</ToastProvider>
            </ThemeProvider>
          </LangProvider>
        </MemoryRouter>
      </Provider>
    );
  }

  return {
    store,
    ...render(ui, {
      wrapper: Wrapper as React.ComponentType,
      ...renderOptions,
    }),
  };
}
