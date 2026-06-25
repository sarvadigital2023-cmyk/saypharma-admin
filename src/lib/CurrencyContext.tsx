import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getSettings, CURRENCY_SYMBOL, type Currency } from "@/lib/api";

interface CurrencyCtx {
  currency: Currency;
  sym: string;
}

const CurrencyContext = createContext<CurrencyCtx>({ currency: "EUR", sym: "€" });

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>("EUR");

  useEffect(() => {
    getSettings()
      .then(s => { if (s.currency) setCurrency(s.currency); })
      .catch(() => {});
  }, []);

  return (
    <CurrencyContext.Provider value={{ currency, sym: CURRENCY_SYMBOL[currency] }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
