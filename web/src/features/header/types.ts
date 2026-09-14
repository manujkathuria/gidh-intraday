export type AppMode = "LIVE" | "REPLAY";

export interface NavItem {
  href: string;
  label: string;
  iconName: "radar" | "sectors" | "chart" | "brain" | "positions";
  badge?: string;
}
