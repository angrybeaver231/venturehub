import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/lib/translations";
import { 
  Home, Calendar, GraduationCap, Video, Mail, User, 
  ChevronLeft, ChevronRight, X, Sparkles, Menu,
  MousePointerClick, ArrowUp, ArrowRight as ArrowRightIcon
} from "lucide-react";

interface TourStep {
  id: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: typeof Home;
  targetSelector?: string;
  highlightPadding?: number;
  arrowDirection?: "up" | "down" | "left" | "right";
  cardPosition?: "below" | "above" | "center";
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    titleKey: "tourWelcomeTitle",
    descriptionKey: "tourWelcomeDescription",
    icon: Sparkles,
    cardPosition: "center",
  },
  {
    id: "menu",
    titleKey: "tourMenuTitle",
    descriptionKey: "tourMenuDescription",
    icon: Menu,
    targetSelector: '[data-testid="teamhub-sidebar"], [data-testid="button-sidebar-toggle"]',
    highlightPadding: 8,
    arrowDirection: "up",
    cardPosition: "center",
  },
  {
    id: "dashboard",
    titleKey: "tourDashboardTitle",
    descriptionKey: "tourDashboardDescription",
    icon: Home,
    cardPosition: "center",
  },
  {
    id: "events",
    titleKey: "tourEventsTitle",
    descriptionKey: "tourEventsDescription",
    icon: Calendar,
    cardPosition: "center",
  },
  {
    id: "courses",
    titleKey: "tourCoursesTitle",
    descriptionKey: "tourCoursesDescription",
    icon: GraduationCap,
    cardPosition: "center",
  },
  {
    id: "videos",
    titleKey: "tourVideosTitle",
    descriptionKey: "tourVideosDescription",
    icon: Video,
    cardPosition: "center",
  },
  {
    id: "messages",
    titleKey: "tourMessagesTitle",
    descriptionKey: "tourMessagesDescription",
    icon: Mail,
    cardPosition: "center",
  },
  {
    id: "profile",
    titleKey: "tourProfileTitle",
    descriptionKey: "tourProfileDescription",
    icon: User,
    cardPosition: "center",
  },
];

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function OnboardingTour({ isOpen, onClose, onComplete }: OnboardingTourProps) {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  const step = tourSteps[currentStep];

  const updateTargetRect = useCallback(() => {
    if (!step?.targetSelector) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      const pad = step.highlightPadding || 0;
      setTargetRect({
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      });
    } else {
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setTargetRect(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    updateTargetRect();
    const handleResize = () => updateTargetRect();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    const interval = setInterval(updateTargetRect, 500);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
      clearInterval(interval);
    };
  }, [isOpen, currentStep, updateTargetRect]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const Icon = step.icon;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;

  const isCentered = step.cardPosition === "center" || !targetRect;

  const getCardPositionStyle = (): React.CSSProperties => {
    if (isCentered) {
      return {};
    }

    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    const cardWidth = Math.min(viewW - 32, 400);

    if (step.cardPosition === "below") {
      let leftPos = targetRect!.left + targetRect!.width / 2 - cardWidth / 2;
      if (leftPos < 16) leftPos = 16;
      if (leftPos + cardWidth > viewW - 16) leftPos = viewW - 16 - cardWidth;
      const topPos = Math.min(targetRect!.top + targetRect!.height + 16, viewH - 300);
      return {
        position: "fixed",
        top: `${topPos}px`,
        left: `${leftPos}px`,
        width: `${cardWidth}px`,
      };
    }

    if (step.cardPosition === "above") {
      let leftPos = targetRect!.left + targetRect!.width / 2 - cardWidth / 2;
      if (leftPos < 16) leftPos = 16;
      if (leftPos + cardWidth > viewW - 16) leftPos = viewW - 16 - cardWidth;
      return {
        position: "fixed",
        bottom: `${viewH - targetRect!.top + 16}px`,
        left: `${leftPos}px`,
        width: `${cardWidth}px`,
      };
    }

    return {};
  };

  const renderOverlay = () => {
    if (!targetRect) {
      return (
        <motion.div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleSkip}
        />
      );
    }

    return (
      <motion.div
        className="fixed inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleSkip}
      >
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
          <defs>
            <mask id="tour-spotlight">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="12"
                ry="12"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.75)"
            mask="url(#tour-spotlight)"
            style={{ pointerEvents: "all" }}
            onClick={handleSkip}
          />
        </svg>
        <div
          className="absolute border-2 border-primary rounded-xl pointer-events-none"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow: "0 0 0 4px rgba(0,212,255,0.2), 0 0 20px rgba(0,212,255,0.15)",
          }}
        />
      </motion.div>
    );
  };

  const renderArrow = () => {
    if (!targetRect || !step.arrowDirection) return null;

    const arrowMap: Record<string, { icon: typeof ArrowUp; style: React.CSSProperties }> = {
      up: {
        icon: ArrowUp,
        style: {
          position: "fixed",
          top: targetRect.top + targetRect.height + 2,
          left: targetRect.left + targetRect.width / 2 - 12,
        },
      },
      down: {
        icon: ArrowUp,
        style: {
          position: "fixed",
          top: targetRect.top - 30,
          left: targetRect.left + targetRect.width / 2 - 12,
          transform: "rotate(180deg)",
        },
      },
      right: {
        icon: ArrowRightIcon,
        style: {
          position: "fixed",
          top: targetRect.top + targetRect.height / 2 - 12,
          left: targetRect.left - 30,
        },
      },
      left: {
        icon: ArrowRightIcon,
        style: {
          position: "fixed",
          top: targetRect.top + targetRect.height / 2 - 12,
          left: targetRect.left + targetRect.width + 6,
          transform: "rotate(180deg)",
        },
      },
    };

    const arrow = arrowMap[step.arrowDirection];
    if (!arrow) return null;
    const ArrowIcon = arrow.icon;

    return (
      <motion.div
        className="z-[10002] text-primary pointer-events-none"
        style={arrow.style as any}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      >
        <ArrowIcon className="w-6 h-6" />
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999]" style={{ isolation: "isolate" }}>
          {renderOverlay()}

          {renderArrow()}

          {isCentered ? (
            <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                className="w-full max-w-sm pointer-events-auto"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                key={step.id}
              >
                <Card className="border-2 border-primary/20 shadow-2xl bg-card">
                  <CardHeader className="relative pb-2 pr-10">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={handleSkip}
                      data-testid="button-tour-close"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-3 min-w-0">
                      <motion.div
                        className="p-2 rounded-full bg-primary/10 shrink-0"
                        initial={{ rotate: -180, scale: 0 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                      >
                        <Icon className="h-5 w-5 text-primary" />
                      </motion.div>
                      <CardTitle className="text-base sm:text-lg leading-tight truncate">{t(step.titleKey)}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <motion.p
                      className="text-sm text-muted-foreground"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                    >
                      {t(step.descriptionKey)}
                    </motion.p>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between gap-2 pt-4 border-t flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {tourSteps.map((_, index) => (
                        <motion.div
                          key={index}
                          className={`h-2 rounded-full transition-colors ${
                            index === currentStep
                              ? "bg-primary w-4"
                              : index < currentStep
                              ? "bg-primary/50 w-2"
                              : "bg-muted w-2"
                          }`}
                          layout
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      {isFirstStep && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSkip}
                          data-testid="button-tour-skip"
                        >
                          {t("skip")}
                        </Button>
                      )}
                      {!isFirstStep && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePrev}
                          data-testid="button-tour-prev"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          {t("back")}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={handleNext}
                        data-testid="button-tour-next"
                      >
                        {isLastStep ? t("getStarted") : t("next")}
                        {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </motion.div>
            </div>
          ) : (
            <motion.div
              className="z-[10001]"
              style={{ ...getCardPositionStyle(), maxWidth: "calc(100vw - 32px)" }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              key={step.id}
            >
              <Card className="border-2 border-primary/20 shadow-2xl bg-card">
                <CardHeader className="relative pb-2 pr-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleSkip}
                    data-testid="button-tour-close"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-3 min-w-0">
                    <motion.div
                      className="p-2 rounded-full bg-primary/10 shrink-0"
                      initial={{ rotate: -180, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                    >
                      <Icon className="h-5 w-5 text-primary" />
                    </motion.div>
                    <CardTitle className="text-base sm:text-lg leading-tight truncate">{t(step.titleKey)}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <motion.p
                    className="text-sm text-muted-foreground"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    {t(step.descriptionKey)}
                  </motion.p>
                  {step.targetSelector && (
                    <motion.div
                      className="flex items-center gap-2 mt-3 text-xs text-primary/70"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <MousePointerClick className="w-4 h-4 shrink-0" />
                      <span>{t("tourTapHighlighted" as TranslationKey)}</span>
                    </motion.div>
                  )}
                </CardContent>
                <CardFooter className="flex items-center justify-between gap-2 pt-4 border-t flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {tourSteps.map((_, index) => (
                      <motion.div
                        key={index}
                        className={`h-2 rounded-full transition-colors ${
                          index === currentStep
                            ? "bg-primary w-4"
                            : index < currentStep
                            ? "bg-primary/50 w-2"
                            : "bg-muted w-2"
                        }`}
                        layout
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isFirstStep && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrev}
                        data-testid="button-tour-prev"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        {t("back")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={handleNext}
                      data-testid="button-tour-next"
                    >
                      {isLastStep ? t("getStarted") : t("next")}
                      {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
