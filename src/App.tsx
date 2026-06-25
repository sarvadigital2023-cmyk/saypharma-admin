import { useState } from "react";
import { CurrencyProvider } from "@/lib/CurrencyContext";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import Warehouse from "@/pages/Warehouse";
import Orders from "@/pages/Orders";
import Reports from "@/pages/Reports";
import BottomNav, { type Tab } from "@/components/BottomNav";
import "./index.css";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

export default function App() {
  const [tab, setTab] = useState<Tab>("settings");

  return (
    <CurrencyProvider>
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <div className="flex-1 overflow-y-auto pb-20">
          {tab === "settings"  && <Dashboard />}
          {tab === "products"  && <Products />}
          {tab === "warehouse" && <Warehouse />}
          {tab === "orders"    && <Orders />}
          {tab === "reports"   && <Reports />}
        </div>
        <BottomNav active={tab} onChange={setTab} />
      </div>
    </CurrencyProvider>
  );
}
