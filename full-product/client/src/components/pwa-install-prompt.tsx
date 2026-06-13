import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X } from "lucide-react";
import { showInstallPrompt, isRunningAsPWA } from "@/lib/pwa";
import { useLanguage } from "@/contexts/LanguageContext";

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    // Don't show if already installed or dismissed
    if (isRunningAsPWA() || isDismissed) {
      return;
    }

    // Check if user has previously dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Listen for install availability
    const handleInstallAvailable = () => {
      setShowPrompt(true);
    };

    const handleInstalled = () => {
      setShowPrompt(false);
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-installed', handleInstalled);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, [isDismissed]);

  const handleInstall = async () => {
    const accepted = await showInstallPrompt();
    if (accepted) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-in slide-in-from-bottom-5">
      <Card className="border-primary/20 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Download className="h-5 w-5 text-primary" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold mb-1">
                {t('pwa.installTitle')}
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                {t('pwa.installDescription')}
              </p>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="flex-1"
                  data-testid="button-install-pwa"
                >
                  {t('pwa.install')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  data-testid="button-dismiss-pwa"
                >
                  {t('pwa.notNow')}
                </Button>
              </div>
            </div>
            
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
              data-testid="button-close-pwa"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
