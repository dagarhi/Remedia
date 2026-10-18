import { useEffect, useState } from "react";
import { HomeScreen } from "./home/HomeScreen";
import { Sidebar } from "./components/Sidebar";
import { listRecords, type MediaRecord } from "@remedia/core";
import { data } from "./db/database";
import { AddScreen } from "./screens/AddScreen";
import { LibrariesScreen } from "./screens/LibrariesScreen";
import { LibraryScreen } from "./screens/LibraryScreen";
import { RecordScreen } from "./screens/RecordScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { useSettings } from "./settings/SettingsContext";
import { GuidedTour } from "./tour/GuidedTour";
import { sidebarScreenFor, type Route, type Screen } from "./screens";
import "./App.css";

function App() {
  const { settings, update } = useSettings();
  const [route, setRoute] = useState<Route>({ screen: "home" });

  // First run (UI Design): only for someone starting from nothing. A profile name or any
  // record means the app was already in use, so the welcome is marked done silently.
  const onboarded = settings["onboarding.done"];
  const [checkingFirstRun, setCheckingFirstRun] = useState(!onboarded);
  useEffect(() => {
    if (onboarded) return;
    (async () => {
      const inUse = settings["profile.name"].trim() !== "" || (await listRecords(data)).length > 0;
      if (inUse) update("onboarding.done", true);
      setCheckingFirstRun(false);
    })();
  }, []);

  const [collapsed, setCollapsed] = useState(false);
  const [touring, setTouring] = useState(false);

  /** The tour explains the sidebar from Home, whatever screen it was started from. */
  function startTour() {
    setRoute({ screen: "home" });
    setTouring(true);
  }
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
        return <SettingsScreen onStartTour={startTour} />;
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

  if (!onboarded) return checkingFirstRun ? null : <WelcomeScreen onStartTour={startTour} />;

  return (
    <div className="app">
      <Sidebar
        current={sidebarScreenFor(route)}
        collapsed={collapsed}
        onNavigate={navigate}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
      />
      <main className="app-content">{renderContent()}</main>
      {touring && <GuidedTour onClose={() => setTouring(false)} />}
    </div>
  );
}

export default App;
