import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Home,
  Calendar,
  GraduationCap,
  Video,
  Mail,
  User,
  Menu,
} from "lucide-react";
import { useNavigation, MainSection } from "@/contexts/NavigationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface MenuItem {
  id: MainSection;
  icon: typeof Home;
  labelKey: string;
  defaultRoute: string;
}

const menuItems: MenuItem[] = [
  { id: "dashboard", icon: Home, labelKey: "dashboard", defaultRoute: "/" },
  { id: "events", icon: Calendar, labelKey: "events", defaultRoute: "/events" },
  { id: "courses", icon: GraduationCap, labelKey: "courses", defaultRoute: "/courses" },
  { id: "videos", icon: Video, labelKey: "videoLibrary", defaultRoute: "/videos" },
  { id: "messages", icon: Mail, labelKey: "messages", defaultRoute: "/messages" },
  { id: "profile", icon: User, labelKey: "profile", defaultRoute: "/profile" },
];

const RADIUS = 110;

function getItemPosition(index: number, total: number) {
  const angleStep = (2 * Math.PI) / total;
  const startAngle = -Math.PI / 2;
  const angle = startAngle + index * angleStep;
  return {
    x: Math.cos(angle) * RADIUS,
    y: Math.sin(angle) * RADIUS,
  };
}

export function RadialMenu() {
  const { isMenuOpen, setIsMenuOpen, setActiveSection, activeSection } = useNavigation();
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();

  const handleItemClick = (item: MenuItem) => {
    setActiveSection(item.id);
    setIsMenuOpen(false);
    setLocation(item.defaultRoute);
  };

  const handleClose = () => {
    setIsMenuOpen(false);
  };

  return (
    <AnimatePresence>
      {isMenuOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-label={language === "ru" ? "Главное меню" : "Main menu"}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-background/95 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          <div className="relative">
            {/* Center close button */}
            <motion.button
              className="relative z-10 w-20 h-20 rounded-full bg-card border border-border shadow-xl flex items-center justify-center"
              onClick={handleClose}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              aria-label={language === "ru" ? "Закрыть меню" : "Close menu"}
              data-testid="button-radial-close"
            >
              <X className="w-7 h-7 text-foreground" strokeWidth={2.25} />
            </motion.button>

            {/* Section title under close */}
            <motion.div
              className="absolute left-1/2 -translate-x-1/2 top-full mt-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {language === "ru" ? "Меню" : "Menu"}
            </motion.div>

            {menuItems.map((item, index) => {
              const pos = getItemPosition(index, menuItems.length);
              const Icon = item.icon;
              const isActive = item.id === activeSection;
              return (
                <motion.button
                  key={item.id}
                  className={cn(
                    "absolute w-16 h-16 rounded-full flex items-center justify-center group shadow-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground border border-primary"
                      : "bg-card border border-border hover:border-primary/60"
                  )}
                  style={{
                    left: "50%",
                    top: "50%",
                    marginLeft: -32,
                    marginTop: -32,
                  }}
                  initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                  animate={{
                    scale: 1,
                    x: pos.x,
                    y: pos.y,
                    opacity: 1,
                  }}
                  exit={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                    delay: index * 0.04,
                  }}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleItemClick(item)}
                  aria-label={t(item.labelKey as any)}
                  data-testid={`button-radial-${item.id}`}
                >
                  <Icon
                    className={cn(
                      "w-6 h-6",
                      isActive ? "text-primary-foreground" : "text-foreground"
                    )}
                    strokeWidth={1.75}
                  />
                  <span
                    className={cn(
                      "absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs font-medium whitespace-nowrap px-2 py-0.5 rounded-md transition-opacity",
                      isActive
                        ? "opacity-100 text-primary"
                        : "opacity-0 group-hover:opacity-100 text-foreground bg-card border border-border shadow"
                    )}
                  >
                    {t(item.labelKey as any)}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function MenuTrigger() {
  const { isMenuOpen, toggleMenu, activeSection } = useNavigation();
  const { t, language } = useLanguage();

  if (isMenuOpen) return null;

  const currentItem = menuItems.find((item) => item.id === activeSection);
  const Icon = currentItem?.icon || Menu;

  return (
    <motion.button
      className="fixed top-4 right-4 z-50 flex items-center gap-2 h-11 pl-3 pr-2 rounded-full bg-card border border-border shadow-lg text-foreground hover:border-primary/60 transition-colors"
      onClick={toggleMenu}
      initial={{ scale: 0, x: 100 }}
      animate={{ scale: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      aria-label={language === "ru" ? "Открыть меню" : "Open menu"}
      data-testid="button-menu-trigger"
    >
      <span className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </span>
      {currentItem && (
        <span className="text-sm font-medium hidden sm:inline">
          {t(currentItem.labelKey as any)}
        </span>
      )}
      <span className="h-7 w-7 rounded-full bg-muted/60 flex items-center justify-center">
        <Menu className="w-4 h-4" />
      </span>
    </motion.button>
  );
}
