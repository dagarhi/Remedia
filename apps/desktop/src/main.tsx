import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n";
import { SettingsProvider } from "./settings/SettingsContext";
import "./styles/fonts.css";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {/* Everything inside can read the settings with useSettings(). */}
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </React.StrictMode>,
);
