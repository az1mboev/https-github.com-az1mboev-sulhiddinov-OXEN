import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import { injectBrandMeta, registerServiceWorker } from "./lib/brand";
import "./index.css";

// Inject canonical PWA / Safari / OpenGraph meta before React mounts.
injectBrandMeta();
// Register the service worker for offline support + auto-updates.
registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
