import React from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "./Crash";
import App from "./App";
import { StoreProvider } from "./store";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StoreProvider>
      <ErrorBoundary onHome={() => location.reload()}>
        <App />
      </ErrorBoundary>
    </StoreProvider>
  </React.StrictMode>,
);
