import { CheckCircle2, Circle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export interface CompletenessField {
  key: string;
  labelEn: string;
  labelRu: string;
  filled: boolean;
}

export interface CompletenessSection {
  key: string;
  labelEn: string;
  labelRu: string;
  fields: CompletenessField[];
}

export function computeProfileCompleteness(user: any | null | undefined): {
  percent: number;
  filled: number;
  total: number;
  sections: CompletenessSection[];
} {
  const has = (v: any) => typeof v === "string" ? v.trim().length > 0 : Boolean(v);
  const isFU = user?.organizationType === "financial_university";

  const sections: CompletenessSection[] = [
    {
      key: "identity",
      labelEn: "Identity",
      labelRu: "Личность",
      fields: [
        { key: "firstName", labelEn: "First name", labelRu: "Имя", filled: has(user?.firstName) },
        { key: "lastName", labelEn: "Last name", labelRu: "Фамилия", filled: has(user?.lastName) },
        { key: "profileImageUrl", labelEn: "Profile photo", labelRu: "Фото профиля", filled: has(user?.profileImageUrl) },
      ],
    },
    {
      key: "organization",
      labelEn: "Organization",
      labelRu: "Организация",
      fields: [
        { key: "organizationType", labelEn: "Organization type", labelRu: "Тип организации", filled: has(user?.organizationType) },
        isFU
          ? { key: "faculty", labelEn: "Faculty", labelRu: "Факультет", filled: has(user?.faculty) }
          : { key: "organizationName", labelEn: "Organization name", labelRu: "Название организации", filled: has(user?.organizationName) },
      ],
    },
    {
      key: "work",
      labelEn: "Work",
      labelRu: "Работа",
      fields: [
        { key: "city", labelEn: "City", labelRu: "Город", filled: has(user?.city) },
        { key: "company", labelEn: "Company", labelRu: "Компания", filled: has(user?.company) },
        { key: "category", labelEn: "Category", labelRu: "Категория", filled: has(user?.category) },
        { key: "position", labelEn: "Position", labelRu: "Должность", filled: has(user?.position) },
      ],
    },
    {
      key: "about",
      labelEn: "About",
      labelRu: "О вас",
      fields: [
        { key: "interests", labelEn: "Interests", labelRu: "Интересы", filled: has(user?.interests) },
        { key: "aboutMe", labelEn: "About me", labelRu: "О себе", filled: has(user?.aboutMe) },
      ],
    },
  ];

  const allFields = sections.flatMap((s) => s.fields);
  const filled = allFields.filter((f) => f.filled).length;
  const total = allFields.length;
  const percent = total === 0 ? 0 : Math.round((filled / total) * 100);

  return { percent, filled, total, sections };
}

interface RingProps {
  percent: number;
  size?: number;
  stroke?: number;
  className?: string;
  trackClassName?: string;
  indicatorClassName?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  percent,
  size = 140,
  stroke = 12,
  className,
  trackClassName = "stroke-muted",
  indicatorClassName = "stroke-primary",
  children,
}: RingProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={trackClassName}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-[stroke-dashoffset] duration-700 ease-out", indicatorClassName)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

interface StatRingCardProps {
  label: string;
  value: string;
  subtitle?: string;
  percent: number;
  highlight?: boolean;
  indicatorClassName?: string;
  testId?: string;
}

export function StatRingCard({
  label,
  value,
  subtitle,
  percent,
  highlight,
  indicatorClassName,
  testId,
}: StatRingCardProps) {
  return (
    <div
      className={cn(
        "rounded-md border bg-card p-4 flex flex-col items-center justify-center gap-2 min-h-[180px]",
        highlight && "bg-primary/5 border-primary/30"
      )}
      data-testid={testId}
    >
      <span className="text-xs font-medium text-muted-foreground text-center">{label}</span>
      <ProgressRing
        percent={percent}
        size={104}
        stroke={9}
        indicatorClassName={indicatorClassName ?? "stroke-primary"}
      >
        <div className="flex flex-col items-center leading-none">
          <span className="text-xl font-bold tabular-nums">{value}</span>
          {subtitle && <span className="text-[10px] text-muted-foreground mt-1">{subtitle}</span>}
        </div>
      </ProgressRing>
    </div>
  );
}

interface CompletenessChecklistProps {
  sections: CompletenessSection[];
  language: "en" | "ru";
}

export function CompletenessChecklist({ sections, language }: CompletenessChecklistProps) {
  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const sectionFilled = section.fields.filter((f) => f.filled).length;
        const sectionTotal = section.fields.length;
        return (
          <div key={section.key} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">
                {language === "ru" ? section.labelRu : section.labelEn}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {sectionFilled}/{sectionTotal}
              </span>
            </div>
            <ul className="space-y-1.5">
              {section.fields.map((field) => (
                <li
                  key={field.key}
                  className="flex items-center gap-2 text-sm"
                  data-testid={`completeness-field-${field.key}`}
                >
                  {field.filled ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  )}
                  <span className={cn("truncate", field.filled ? "text-foreground" : "text-muted-foreground")}>
                    {language === "ru" ? field.labelRu : field.labelEn}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
