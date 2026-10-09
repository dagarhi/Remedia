import type { RecordStatus, Uuid } from "@remedia/core";

/** Screens reachable from the sidebar. Navigation is plain React state: no router needed yet. */
export const SCREENS = ["add", "home", "libraries", "settings"] as const;

export type Screen = (typeof SCREENS)[number];

/** Where the app is: a sidebar screen, one library ("See all") or one record's page. */
export type Route =
  | { screen: Screen }
  | { screen: "library"; status: RecordStatus }
  | { screen: "record"; id: Uuid };

/** Sidebar entry to highlight for a route; null when none applies. */
export function sidebarScreenFor(route: Route): Screen | null {
  if (route.screen === "library") return "libraries";
  if (route.screen === "record") return null;
  return route.screen;
}
