import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker, initPWAInstallPrompt } from "./lib/pwa";

// Register PWA service worker
registerServiceWorker();

// Initialize PWA install prompt
initPWAInstallPrompt();

createRoot(document.getElementById("root")!).render(<App />);
