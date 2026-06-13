export type LandingFontKey = "sans" | "serif" | "display";

export interface LandingTheme {
  primary: string;
  bg: string;
  text: string;
  accent: string;
  font: LandingFontKey;
}

export const DEFAULT_THEME: LandingTheme = {
  primary: "#f59e0b",
  bg: "#0a0a0a",
  text: "#ffffff",
  accent: "#fbbf24",
  font: "display",
};

export type SectionType =
  | "hero"
  | "richText"
  | "stats"
  | "features"
  | "speakers"
  | "schedule"
  | "gallery"
  | "partners"
  | "faq"
  | "cta"
  | "video"
  | "footer";

export interface LandingSection {
  id: string;
  type: SectionType;
  data: Record<string, any>;
}

export interface SectionMeta {
  type: SectionType;
  labelEn: string;
  labelRu: string;
  defaults: Record<string, any>;
}

export const SECTION_LIBRARY: SectionMeta[] = [
  {
    type: "hero",
    labelEn: "Hero",
    labelRu: "Заголовок",
    defaults: {
      eyebrow: "",
      title: "Your Event Title",
      subtitle: "Short description that hooks the reader.",
      bgImage: "",
      ctaText: "Register",
      ctaUrl: "#register",
      date: "",
      location: "",
    },
  },
  {
    type: "richText",
    labelEn: "Text block",
    labelRu: "Текстовый блок",
    defaults: {
      heading: "About",
      body: "<p>Tell the story.</p>",
    },
  },
  {
    type: "stats",
    labelEn: "Stats",
    labelRu: "Цифры",
    defaults: {
      heading: "By the numbers",
      items: [
        { value: "500+", label: "Participants" },
        { value: "30+", label: "Speakers" },
        { value: "20+", label: "Sessions" },
        { value: "2", label: "Days" },
      ],
    },
  },
  {
    type: "features",
    labelEn: "Highlights",
    labelRu: "Преимущества",
    defaults: {
      heading: "Why attend",
      items: [
        { title: "Top speakers", description: "Industry leaders share insight." },
        { title: "Real networking", description: "Meet peers and partners." },
        { title: "Hands-on labs", description: "Build skills, not slides." },
      ],
    },
  },
  {
    type: "speakers",
    labelEn: "Speakers",
    labelRu: "Спикеры",
    defaults: {
      heading: "Speakers",
      items: [
        { name: "Speaker name", role: "Role, Company", bio: "Short bio.", photo: "" },
      ],
    },
  },
  {
    type: "schedule",
    labelEn: "Schedule",
    labelRu: "Программа",
    defaults: {
      heading: "Programme",
      items: [
        { time: "10:00", title: "Opening", description: "", speaker: "" },
        { time: "10:30", title: "Keynote", description: "", speaker: "" },
      ],
    },
  },
  {
    type: "gallery",
    labelEn: "Gallery",
    labelRu: "Галерея",
    defaults: {
      heading: "Gallery",
      images: [],
    },
  },
  {
    type: "partners",
    labelEn: "Partners",
    labelRu: "Партнёры",
    defaults: {
      heading: "Partners",
      logos: [{ name: "Partner", image: "", url: "" }],
    },
  },
  {
    type: "faq",
    labelEn: "FAQ",
    labelRu: "Вопросы",
    defaults: {
      heading: "FAQ",
      items: [{ question: "Question?", answer: "Answer." }],
    },
  },
  {
    type: "cta",
    labelEn: "Call to action",
    labelRu: "Призыв",
    defaults: {
      eyebrow: "",
      title: "Join us",
      ctaText: "Register now",
      ctaUrl: "#",
      bgImage: "",
    },
  },
  {
    type: "video",
    labelEn: "Video",
    labelRu: "Видео",
    defaults: {
      heading: "",
      url: "",
    },
  },
  {
    type: "footer",
    labelEn: "Footer",
    labelRu: "Подвал",
    defaults: {
      text: "© Your event",
      links: [{ label: "Contact", url: "mailto:hello@example.com" }],
    },
  },
];

export function getSectionMeta(type: string): SectionMeta | undefined {
  return SECTION_LIBRARY.find((s) => s.type === type);
}

export function newSection(type: SectionType): LandingSection {
  const meta = getSectionMeta(type);
  return {
    id: `${type}-${Math.random().toString(36).slice(2, 10)}`,
    type,
    data: JSON.parse(JSON.stringify(meta?.defaults ?? {})),
  };
}

export const FONT_FAMILY_MAP: Record<LandingFontKey, string> = {
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  serif: "'Playfair Display', Georgia, serif",
  display: "'Inter', system-ui, sans-serif",
};
