import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type MainSection = "dashboard" | "events" | "courses" | "videos" | "messages" | "profile";

interface NavigationContextType {
  activeSection: MainSection | null;
  setActiveSection: (section: MainSection | null) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  toggleMenu: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

const validSections: MainSection[] = ["dashboard", "events", "courses", "videos", "messages", "profile"];

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [activeSection, setActiveSection] = useState<MainSection | null>(() => {
    const saved = localStorage.getItem("activeSection");
    if (saved && validSections.includes(saved as MainSection)) {
      return saved as MainSection;
    }
    return "dashboard"; // Default to dashboard if no valid section saved
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Start closed so content is visible

  useEffect(() => {
    if (activeSection) {
      localStorage.setItem("activeSection", activeSection);
    }
  }, [activeSection]);

  const toggleMenu = () => setIsMenuOpen(prev => !prev);

  return (
    <NavigationContext.Provider value={{
      activeSection,
      setActiveSection,
      isMenuOpen,
      setIsMenuOpen,
      toggleMenu
    }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }
  return context;
}
