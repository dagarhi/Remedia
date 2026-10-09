import type { Uuid } from "@remedia/core";

/** Screens reachable from the sidebar. Navigation is plain React state: no router needed yet. */
export const SCREENS = ["add", "home", "libraries", "settings"] as const;

export type Screen = (typeof SCREENS)[number];

/** Where the app is: a sidebar screen, or one record's page. */
export type Route = { screen: Screen } | { screen: "record"; id: Uuid };
