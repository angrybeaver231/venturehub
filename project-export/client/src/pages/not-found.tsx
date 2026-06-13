import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowRight, Home } from "lucide-react";
import { useEffect, useState, useMemo } from "react";

const STAR_COUNT = 60;

export default function NotFound() {
  const [, navigate] = useLocation();
  const { language } = useLanguage();
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  const stars = useMemo(
    () =>
      Array.from({ length: STAR_COUNT }).map((_, i) => ({
        key: i,
        width: Math.random() * 2 + 1,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        opacity: Math.random() * 0.6 + 0.2,
        duration: Math.random() * 3 + 2,
      })),
    [],
  );

  const padTime = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-black text-white">
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {stars.map((s) => (
          <div
            key={s.key}
            className="absolute rounded-full bg-white"
            style={{
              width: `${s.width}px`,
              height: `${s.width}px`,
              top: s.top,
              left: s.left,
              opacity: s.opacity,
            }}
          />
        ))}
        <div
          className="absolute w-px opacity-60"
          style={{
            height: "200%",
            top: "-50%",
            left: "15%",
            transform: "rotate(25deg)",
            background: "linear-gradient(to right, transparent, hsl(0 70% 50% / 0.5), transparent)",
          }}
        />
        <div
          className="absolute w-px opacity-30"
          style={{
            height: "150%",
            top: "-25%",
            right: "25%",
            transform: "rotate(-15deg)",
            background: "linear-gradient(to right, transparent, hsl(25 80% 55% / 0.4), transparent)",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
        <p
          className="text-xs tracking-[0.4em] uppercase text-white/40"
          data-testid="text-404-subtitle"
        >
          {language === "ru" ? "СТРАНИЦА НЕ НАЙДЕНА" : "DESTINATION NOT FOUND"}
        </p>

        <h1
          className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight"
          style={{ letterSpacing: "-0.02em" }}
          data-testid="text-404-title"
        >
          404
        </h1>

        <p
          className="max-w-md text-sm sm:text-base text-white/50 leading-relaxed"
          data-testid="text-404-description"
        >
          {language === "ru"
            ? "Вы зашли слишком далеко. Эта страница не существует или была перемещена."
            : "You've drifted too far. This page doesn't exist or has been moved."}
        </p>

        <div className="flex flex-col items-center gap-2 mt-4" role="timer" aria-live="polite">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/30">
            {language === "ru" ? "ВОЗВРАТ ЧЕРЕЗ" : "RETURNING IN"}
          </p>
          <p
            className="text-lg font-mono tracking-[0.2em] text-white/70 tabular-nums"
            data-testid="text-404-countdown"
            aria-label={`${language === "ru" ? "Возврат через" : "Returning in"} ${countdown} ${language === "ru" ? "секунд" : "seconds"}`}
          >
            00:00:{padTime(countdown)}
          </p>
        </div>

        <Button
          variant="outline"
          className="mt-4 border-white/20 bg-white/5 text-white gap-2"
          onClick={() => navigate("/")}
          data-testid="button-go-home"
        >
          <Home className="h-4 w-4" />
          {language === "ru" ? "На главную" : "Go Home"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="absolute bottom-8 left-0 right-0 text-center px-4">
        <p
          className="text-[10px] tracking-[0.15em] uppercase text-white/20 max-w-2xl mx-auto leading-relaxed"
          data-testid="text-404-branding"
        >
          Ventorix Platform
        </p>
      </div>
    </div>
  );
}
