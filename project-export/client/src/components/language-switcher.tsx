import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ru" : "en");
  };

  const switchTitle = language === "en" ? t("switchToRussian") : t("switchToEnglish");

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      data-testid="button-language-toggle"
      title={switchTitle}
    >
      <Globe className="h-5 w-5" />
      <span className="ml-1 text-xs font-medium">
        {language === "en" ? t("languageCodeRu") : t("languageCodeEn")}
      </span>
    </Button>
  );
}
