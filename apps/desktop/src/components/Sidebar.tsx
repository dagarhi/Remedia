import { useTranslation } from "react-i18next";
import { House, Library, PanelLeftClose, PanelLeftOpen, Plus, Settings, type LucideIcon } from "lucide-react";
import type { Screen } from "../screens";
import "./Sidebar.css";

interface NavItem {
  screen: Screen;
  icon: LucideIcon;
}

const MAIN_ITEMS: NavItem[] = [
  { screen: "home", icon: House },
  { screen: "libraries", icon: Library },
];

interface SidebarProps {
  /** Highlighted entry; null when the content is not a sidebar screen (e.g. a record page). */
  current: Screen | null;
  collapsed: boolean;
  onNavigate: (screen: Screen) => void;
  onToggleCollapsed: () => void;
}

export function Sidebar({ current, collapsed, onNavigate, onToggleCollapsed }: SidebarProps) {
  const { t } = useTranslation();

  const item = ({ screen, icon: Icon }: NavItem, className = "sidebar-item") => (
    <button
      key={screen}
      type="button"
      className={className}
      aria-current={current === screen ? "page" : undefined}
      title={collapsed ? t(`nav.${screen}`) : undefined}
      onClick={() => onNavigate(screen)}
    >
      <Icon size={20} aria-hidden />
      {!collapsed && <span>{t(`nav.${screen}`)}</span>}
    </button>
  );

  return (
    <nav className={collapsed ? "sidebar sidebar--collapsed" : "sidebar"}>
      <div className="sidebar-header">
        {!collapsed && <span className="sidebar-logo">{t("app.name")}</span>}
        <button
          type="button"
          className="sidebar-toggle"
          aria-label={t(collapsed ? "nav.expand" : "nav.collapse")}
          title={t(collapsed ? "nav.expand" : "nav.collapse")}
          onClick={onToggleCollapsed}
        >
          {collapsed ? <PanelLeftOpen size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
        </button>
      </div>

      {item({ screen: "add", icon: Plus }, "sidebar-item sidebar-add")}

      <div className="sidebar-main">{MAIN_ITEMS.map((i) => item(i))}</div>

      <div className="sidebar-bottom">{item({ screen: "settings", icon: Settings })}</div>
    </nav>
  );
}
