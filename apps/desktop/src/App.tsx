import { useState } from "react";
import { PlaceholderScreen } from "./components/PlaceholderScreen";
import { Sidebar } from "./components/Sidebar";
import { AddScreen } from "./screens/AddScreen";
import { RecordScreen } from "./screens/RecordScreen";
import type { Route, Screen } from "./screens";
import { useTheme } from "./theme/useTheme";
import "./App.css";

function App() {
  useTheme();
  const [route, setRoute] = useState<Route>({ screen: "home" });
  const [collapsed, setCollapsed] = useState(false);
  // Changing a component's `key` makes React start it fresh: pressing Add always restarts the flow.
  const [addFlowKey, setAddFlowKey] = useState(0);

  function navigate(screen: Screen) {
    if (screen === "add") setAddFlowKey((k) => k + 1);
    setRoute({ screen });
  }

  function renderContent() {
    switch (route.screen) {
      case "add":
        return (
          <AddScreen
            key={addFlowKey}
            onSaved={(record) => setRoute({ screen: "record", id: record.id })}
            onCancel={() => navigate("home")}
          />
        );
      case "record":
        return <RecordScreen id={route.id} />;
      default:
        return <PlaceholderScreen screen={route.screen} />;
    }
  }

  return (
    <div className="app">
      <Sidebar
        current={route.screen === "record" ? null : route.screen}
        collapsed={collapsed}
        onNavigate={navigate}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
      />
      <main className="app-content">{renderContent()}</main>
    </div>
  );
}

export default App;
