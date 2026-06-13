import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Home as HomeIcon,
  Trophy,
  Ticket,
  Sparkles,
  Newspaper,
  Megaphone,
  GraduationCap,
  Briefcase,
  Users,
  Globe,
  LogIn,
} from "lucide-react";

export type PublicNavItem = {
  id: string;
  icon: typeof HomeIcon;
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
};

export function buildPublicNavItems(language: "en" | "ru", scrollTo: (id: string) => void): PublicNavItem[] {
  return [
    { id: "home", icon: HomeIcon, label: language === "ru" ? "Главная" : "Home", href: "/" },
    { id: "about", icon: Sparkles, label: language === "ru" ? "О нас" : "About", onClick: () => scrollTo("about") },
    { id: "events", icon: Trophy, label: language === "ru" ? "События" : "Events", onClick: () => scrollTo("events") },
    { id: "programs", icon: GraduationCap, label: language === "ru" ? "Программы" : "Programs", onClick: () => scrollTo("programs") },
    { id: "tickets", icon: Ticket, label: language === "ru" ? "Курсы" : "Courses", onClick: () => scrollTo("programs") },
    { id: "members", icon: Users, label: language === "ru" ? "Сообщество" : "Community", onClick: () => scrollTo("about") },
    { id: "careers", icon: Briefcase, label: language === "ru" ? "Карьера" : "Careers", href: "/careers" },
    { id: "news", icon: Newspaper, label: language === "ru" ? "Новости" : "News", onClick: () => { window.location.href = "/news"; } },
    { id: "press", icon: Megaphone, label: language === "ru" ? "Контакты" : "Contact", onClick: () => scrollTo("contact") },
    { id: "login", icon: LogIn, label: language === "ru" ? "Войти" : "Sign in", href: "/login" },
  ];
}

export function PublicSidebar({
  items,
  language,
  onLanguageToggle,
  activeId,
}: {
  items: PublicNavItem[];
  language: "en" | "ru";
  onLanguageToggle: () => void;
  activeId?: string;
}) {
  return (
    <aside
      className="hidden lg:flex fixed top-0 left-0 z-50 w-[110px] h-screen flex-col items-stretch bg-zinc-950 text-white border-r border-white/5 shadow-[4px_0_24px_rgba(0,0,0,0.25)]"
      data-testid="public-sidenav"
    >
      <Link
        href="/"
        className="h-[64px] flex items-center justify-center border-b border-white/5 hover-elevate"
        data-testid="link-sidenav-logo"
      >
        <div className="font-['Inter'] font-black text-[22px] tracking-tighter text-white leading-none">
          {language === "ru" ? "ПК" : "EC"}
          <span className="text-amber-400">.</span>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto py-4">
        {items.map((item) => {
          const isActive = activeId === item.id;
          const Inner = (
            <div
              className={`group h-[64px] flex flex-col items-center justify-center gap-1 px-2 hover-elevate ${
                isActive ? "bg-white/[0.06]" : ""
              }`}
              data-testid={`sidenav-${item.id}`}
            >
              <item.icon
                className={`h-[22px] w-[22px] transition-colors ${
                  isActive ? "text-amber-400" : "text-white/70 group-hover:text-amber-400"
                }`}
                strokeWidth={1.75}
              />
              <span
                className={`text-[9px] font-['Inter'] font-bold uppercase tracking-[0.05em] text-center leading-tight ${
                  isActive ? "text-white" : "text-white/60 group-hover:text-white"
                }`}
              >
                {item.label}
              </span>
            </div>
          );
          return item.href ? (
            <Link key={item.id} href={item.href}>
              {Inner}
            </Link>
          ) : (
            <button key={item.id} type="button" onClick={item.onClick} className="block w-full">
              {Inner}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/5 py-3 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onLanguageToggle}
          className="h-9 w-9 rounded-md flex items-center justify-center hover-elevate"
          data-testid="button-sidenav-language"
        >
          <Globe className="h-4 w-4 text-white/70" strokeWidth={1.75} />
        </button>
        <span className="text-[9px] font-['Inter'] font-bold uppercase tracking-[0.1em] text-white/50">
          {language.toUpperCase()}
        </span>
      </div>
    </aside>
  );
}

export function PublicMobileTopBar({
  language,
  onLanguageToggle,
}: {
  language: "en" | "ru";
  onLanguageToggle: () => void;
}) {
  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-[56px] bg-zinc-950 border-b border-white/5 flex items-center justify-between px-4">
      <Link href="/" className="font-['Inter'] font-black text-lg tracking-tighter text-white" data-testid="link-mobile-logo">
        {language === "ru" ? "ПК" : "EC"}
        <span className="text-amber-400">.</span>
      </Link>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onLanguageToggle}
          className="h-9 px-3 rounded-md flex items-center gap-1.5 text-white/80 hover-elevate"
          data-testid="button-mobile-language"
        >
          <Globe className="h-3.5 w-3.5" />
          <span className="text-[11px] font-bold uppercase">{language.toUpperCase()}</span>
        </button>
        <Button
          asChild
          size="sm"
          className="rounded-md bg-amber-400 text-zinc-950 hover:bg-amber-300 font-bold text-[11px] uppercase tracking-wider border-0"
        >
          <Link href="/login" data-testid="link-mobile-login">
            <LogIn className="h-3.5 w-3.5 mr-1" />
            {language === "ru" ? "Войти" : "Sign in"}
          </Link>
        </Button>
      </div>
    </header>
  );
}
