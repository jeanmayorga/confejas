export type DashboardSidebarPanel = {
  title: string;
  width: string;
  flushContent?: boolean;
};

// Pages opt in to a secondary sidebar; the icon rail is always available.
const panels: Record<string, DashboardSidebarPanel> = {
  "/dashboard/companies": {
    title: "Compañías",
    width: "21rem",
    flushContent: true,
  },
};

export function getDashboardSidebarPanel(pathname: string) {
  return panels[pathname] ?? null;
}
