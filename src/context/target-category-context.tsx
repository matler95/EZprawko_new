import { createContext, useContext } from "react";
import type { DrivingCategory } from "@/domain/driving-categories";
export const TargetCategoryContext = createContext<{
  category: DrivingCategory;
  changing: boolean;
  error: string | null;
  setCategory: (value: DrivingCategory) => Promise<boolean>;
} | null>(null);
export function useTargetCategory() {
  const context = useContext(TargetCategoryContext);
  if (!context) throw new Error("Missing global target category provider");
  return context;
}
