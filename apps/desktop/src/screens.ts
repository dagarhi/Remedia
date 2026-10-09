/** Screens reachable from the sidebar. Navigation is plain React state: no router needed yet. */
export const SCREENS = ["add", "home", "libraries", "settings"] as const;

export type Screen = (typeof SCREENS)[number];
