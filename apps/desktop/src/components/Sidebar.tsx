import { useTranslation } from "react-i18next";
import { House, Library, PanelLeftClose, PanelLeftOpen, Plus, type LucideIcon } from "lucide-react";
import type { Screen } from "../screens";
import { useSettings } from "../settings/SettingsContext";
import { Avatar } from "./Avatar";
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
  const { settings } = useSettings();
  const name = settings["profile.name"].trim();

  const item = ({ screen, icon: Icon }: NavItem, className = "sidebar-item") => (
    <button
      key={screen}
      type="button"
      className={className}
      aria-current={current === screen ? "page" : undefined}
      title={collapsed ? t(`nav.${screen}`) : undefined}
      data-tour={screen}
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

      {/* The profile picture takes the place of the Settings gear (it opens Settings). */}
      <div className="sidebar-bottom">
        <button
          type="button"
          className="sidebar-item sidebar-profile"
          data-tour="profile"
          aria-current={current === "settings" ? "page" : undefined}
          aria-label={t("nav.settings")}
          title={t("nav.settings")}
          onClick={() => onNavigate("settings")}
        >
          <Avatar value={settings["profile.avatar"]} size={collapsed ? 28 : 32} />
          {!collapsed && <span className="sidebar-profile-name">{name || t("nav.settings")}</span>}
        </button>
      </div>
    </nav>
  );
}
