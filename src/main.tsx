import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./app/ErrorBoundary";
import { Providers } from "./app/providers";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Providers>
        <App />
      </Providers>
    </ErrorBoundary>
  </React.StrictMode>,
);
