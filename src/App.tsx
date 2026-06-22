import { createRoot } from "react-dom/client";
import Dashboard from "@/pages/Dashboard";
import "./index.css";

function registerSW() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
}

registerSW();

export default function App() {
  return <Dashboard />;
}
