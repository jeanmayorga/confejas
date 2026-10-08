export type DashboardSidebarPanel = {
  title: string;
  width: string;
};

// Pages opt in to a secondary sidebar; the icon rail is always available.
const panels: Record<string, DashboardSidebarPanel> = {
  "/dashboard/companies": {
    title: "Participantes sin compañía",
    width: "23rem",
  },
};

export function getDashboardSidebarPanel(pathname: string) {
  return panels[pathname] ?? null;
}
