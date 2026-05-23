import { useContext } from "react";
import { LangContext, type LangContextValue } from "./langContext";

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}
