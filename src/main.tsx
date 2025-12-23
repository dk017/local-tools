import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import "./lib/i18n";
import App from "./App";
import "./App.css";

import { ErrorBoundary } from "./components/ErrorBoundary";

// DEBUG CHECK
console.log("DEBUG: main.tsx is executing...");

const rootElement = document.getElementById("root");
console.log("DEBUG: Root element found:", rootElement);

if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    console.log("DEBUG: Root created, attempting render...");

    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <HelmetProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </HelmetProvider>
        </ErrorBoundary>
      </React.StrictMode>,
    );
    console.log("DEBUG: Render called successfully.");
  } catch (e) {
    console.error("DEBUG: CRITICAL RENDER ERROR:", e);
  }
} else {
  console.error("DEBUG: ROOT ELEMENT NOT FOUND!");
}
