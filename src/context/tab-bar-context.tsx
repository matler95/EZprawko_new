import { createContext } from "react";

export const TabBarContext = createContext<{
  isTabBarHidden: boolean;
  setIsTabBarHidden: (hidden: boolean) => void;
}>({
  isTabBarHidden: false,
  setIsTabBarHidden: () => undefined,
});
