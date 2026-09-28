import { createRoot } from "react-dom/client";
import { App } from "./App";
import { db } from "./db";
import "./styles/tokens.css";
import "./styles/app.css";

async function start() {
  await db.open();
  if ("serviceWorker" in navigator) await navigator.serviceWorker.register("/sw.js");
  createRoot(document.getElementById("root")!).render(<App />);
}

void start();
