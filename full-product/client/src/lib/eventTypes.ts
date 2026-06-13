import {
  Rocket,
  MonitorPlay,
  Handshake,
  Mic2,
  Users,
  Network,
  GraduationCap,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { EVENT_TYPES, STARTUP_SHOWCASE_EVENT_TYPES, type EventType } from "@shared/schema";

export interface EventTypeMeta {
  key: EventType;
  en: string;
  ru: string;
  icon: LucideIcon;
  /** Chip/badge classes (with dark variants) used for the type tag. */
  chip: string;
  /** Soft accent used for the card's top stripe / icon wells. */
  accent: string;
}

export const EVENT_TYPE_META: Record<EventType, EventTypeMeta> = {
  pitch_day: {
    key: "pitch_day",
    en: "Pitch Day",
    ru: "Питч-день",
    icon: Rocket,
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    accent: "bg-amber-500",
  },
  demo_day: {
    key: "demo_day",
    en: "Demo Day",
    ru: "Демо-день",
    icon: MonitorPlay,
    chip: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    accent: "bg-violet-500",
  },
  business_meeting: {
    key: "business_meeting",
    en: "Business Meeting",
    ru: "Деловая встреча",
    icon: Handshake,
    chip: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    accent: "bg-blue-500",
  },
  conference: {
    key: "conference",
    en: "Conference",
    ru: "Конференция",
    icon: Mic2,
    chip: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    accent: "bg-rose-500",
  },
  forum: {
    key: "forum",
    en: "Forum",
    ru: "Форум",
    icon: Users,
    chip: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
    accent: "bg-teal-500",
  },
  networking: {
    key: "networking",
    en: "Networking",
    ru: "Нетворкинг",
    icon: Network,
    chip: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
    accent: "bg-cyan-500",
  },
  workshop: {
    key: "workshop",
    en: "Workshop / Masterclass",
    ru: "Воркшоп / Мастер-класс",
    icon: GraduationCap,
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    accent: "bg-emerald-500",
  },
  lecture: {
    key: "lecture",
    en: "Lecture",
    ru: "Лекция",
    icon: BookOpen,
    chip: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
    accent: "bg-indigo-500",
  },
};

export const EVENT_TYPE_OPTIONS = EVENT_TYPES.map((k) => EVENT_TYPE_META[k]);

export function getEventTypeMeta(type?: string | null): EventTypeMeta | undefined {
  if (!type) return undefined;
  return EVENT_TYPE_META[type as EventType];
}

export function eventTypeLabel(type: string | null | undefined, language: string): string {
  const meta = getEventTypeMeta(type);
  if (!meta) return "";
  return language === "ru" ? meta.ru : meta.en;
}

export function isShowcaseEventType(type?: string | null): boolean {
  return !!type && STARTUP_SHOWCASE_EVENT_TYPES.includes(type as EventType);
}
