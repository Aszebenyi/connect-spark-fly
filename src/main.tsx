// Replace YOUR_SENTRY_DSN_HERE with your actual Sentry DSN
import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN_HERE",
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
});

createRoot(document.getElementById("root")!).render(<App />);
