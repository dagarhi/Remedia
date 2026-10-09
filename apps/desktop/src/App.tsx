import { useState } from "react";
import { PlaceholderScreen } from "./components/PlaceholderScreen";
import { Sidebar } from "./components/Sidebar";
import type { Screen } from "./screens";
import { useTheme } from "./theme/useTheme";
import "./App.css";

function App() {
  useTheme();
  const [screen, setScreen] = useState<Screen>("home");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app">
      <Sidebar
        current={screen}
        collapsed={collapsed}
        onNavigate={setScreen}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
      />
      <main className="app-content">
        <PlaceholderScreen screen={screen} />
      </main>
    </div>
  );
}

export default App;
