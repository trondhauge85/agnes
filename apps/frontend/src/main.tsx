import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { configureLogging, createLogger } from "@agnes/shared";

configureLogging({
  level: import.meta.env.DEV ? "debug" : "info",
  context: { service: "frontend" }
});
const logger = createLogger("app");

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container missing in index.html");
}

logger.info("app.start");
createRoot(container).render(<App />);
