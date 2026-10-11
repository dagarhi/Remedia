import { useState } from "react";
import { HomeScreen } from "./home/HomeScreen";
import { Sidebar } from "./components/Sidebar";
import type { MediaRecord } from "@remedia/core";
import { AddScreen } from "./screens/AddScreen";
import { LibrariesScreen } from "./screens/LibrariesScreen";
import { LibraryScreen } from "./screens/LibraryScreen";
import { RecordScreen } from "./screens/RecordScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { sidebarScreenFor, type Route, type Screen } from "./screens";
import "./App.css";

function App() {
  const [route, setRoute] = useState<Route>({ screen: "home" });
  const [collapsed, setCollapsed] = useState(false);
  // Changing a component's `key` makes React start it fresh: pressing Add always restarts the flow.
  const [addFlowKey, setAddFlowKey] = useState(0);

  function navigate(screen: Screen) {
    if (screen === "add") setAddFlowKey((k) => k + 1);
    setRoute({ screen });
  }

  const openRecord = (record: MediaRecord) => setRoute({ screen: "record", id: record.id });

  function renderContent() {
    switch (route.screen) {
      case "add":
        return (
          <AddScreen
            key={addFlowKey}
            onSaved={openRecord}
            onCancel={() => navigate("home")}
            onOpenRecord={(id) => setRoute({ screen: "record", id })}
            onOpenSettings={() => navigate("settings")}
          />
        );
      case "libraries":
        return (
          <LibrariesScreen
            onOpenRecord={openRecord}
            onSeeAll={(status) => setRoute({ screen: "library", status })}
          />
        );
      case "library":
        return (
          <LibraryScreen status={route.status} onOpenRecord={openRecord} onBack={() => navigate("libraries")} />
        );
      case "record":
        return (
          <RecordScreen
            key={route.id}
            id={route.id}
            onBack={() => navigate("libraries")}
            onDeleted={() => navigate("libraries")}
            onOpenRecord={(id) => setRoute({ screen: "record", id })}
          />
        );
      case "settings":
        return <SettingsScreen />;
      case "home":
        return (
          <HomeScreen
            onAdd={() => navigate("add")}
            onOpenRecord={(id) => setRoute({ screen: "record", id })}
            onOpenLibrary={(status) => setRoute({ screen: "library", status })}
          />
        );
    }
  }

  return (
    <div className="app">
      <Sidebar
        current={sidebarScreenFor(route)}
        collapsed={collapsed}
        onNavigate={navigate}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
      />
      <main className="app-content">{renderContent()}</main>
    </div>
  );
}

export default App;
