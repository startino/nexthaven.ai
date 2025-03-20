import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { GoogleAnalytics } from "./components/GoogleAnalytics";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

// Initialize URL parameters if none exist
const urlParams = new URLSearchParams(window.location.search);
if (!urlParams.has("page")) {
  // Set default page to 'home' if not specified
  const newUrl = `${window.location.pathname}?page=home`;
  window.history.replaceState({}, "", newUrl);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <GoogleAnalytics />
      <App />
    </AuthProvider>
  </StrictMode>
);
