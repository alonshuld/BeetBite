import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles/globals.css";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import { store } from "@/app/store";
import { router } from "./router";
import { LangProvider } from "@/contexts/LangContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <LangProvider>
        <RouterProvider router={router} />
      </LangProvider>
    </Provider>
  </StrictMode>,
);
