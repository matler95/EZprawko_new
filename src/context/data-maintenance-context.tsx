import { createContext, useContext } from "react";
export const DataMaintenanceContext = createContext<((operation: () => Promise<string>) => void) | null>(null);
export function useDataMaintenance() {
  const run = useContext(DataMaintenanceContext);
  if (!run) throw new Error("Missing data maintenance provider");
  return run;
}
