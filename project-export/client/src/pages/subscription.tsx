import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Zap, Star, Mail, MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageSEO } from "@/hooks/usePageSEO";

export default function Subscription() {
  const { t } = useLanguage();

  usePageSEO({
    title: "Subscription Plans",
    description: "Club subscription plans - coming soon",
  });

  const plans = [
    {
      name: "Basic",
      tier: "basic",
      features: [
        "Club page with members",
        "Events visible on club page only",
        "Basic member management",
        "Up to 50 members",
      ],
      featuresRu: [
        "Страница клуба с участниками",
        "Мероприятия видны только на странице клуба",
        "Базовое управление участниками",
        "До 50 участников",
      ],
      icon: Star,
      color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    },
    {
      name: "Pro",
      tier: "pro",
      features: [
        "All Basic features",
        "Events visible in main events tab",
        "Filter events by club",
        "Up to 200 members",
        "Custom event registration forms",
      ],
      featuresRu: [
        "Все функции Basic",
        "Мероприятия видны в основной вкладке",
        "Фильтрация мероприятий по клубу",
        "До 200 участников",
        "Кастомные формы регистрации",
      ],
      icon: Zap,
      color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    },
    {
      name: "Pro+",
      tier: "pro_plus",
      features: [
        "All Pro features",
        "Highlighted events",
        "Featured event on dashboard",
        "Unlimited members",
        "Priority support",
        "Advanced analytics",
      ],
      featuresRu: [
        "Все функции Pro",
        "Выделенные мероприятия",
        "Избранное мероприятие на главной",
        "Безлимитные участники",
        "Приоритетная поддержка",
        "Расширенная аналитика",
      ],
      icon: Crown,
      color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    },
  ];

  const isRu = t("language") === "ru";

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold" data-testid="text-subscription-title">
          {isRu ? "Тарифные планы для клубов" : "Club Subscription Plans"}
        </h1>
        <div className="inline-flex items-center gap-2">
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-sm px-3 py-1" data-testid="badge-coming-soon">
            {isRu ? "Скоро" : "Coming Soon"}
          </Badge>
        </div>
        <p className="text-muted-foreground max-w-xl mx-auto" data-testid="text-subscription-desc">
          {isRu
            ? "Мы работаем над системой подписок. Свяжитесь с нами для получения раннего доступа."
            : "We are working on the subscription system. Contact us for early access."}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.tier} className="relative" data-testid={`card-plan-${plan.tier}`}>
            {plan.tier === "pro_plus" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-amber-500 text-white border-amber-600">
                  {isRu ? "Рекомендуемый" : "Recommended"}
                </Badge>
              </div>
            )}
            <CardHeader className="text-center space-y-3">
              <div className="mx-auto">
                <plan.icon className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardTitle data-testid={`text-plan-name-${plan.tier}`}>{plan.name}</CardTitle>
              <Badge variant="outline" className={plan.color}>
                {isRu ? "Скоро" : "Coming Soon"}
              </Badge>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {(isRu ? plan.featuresRu : plan.features).map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Star className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/50" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card data-testid="card-contact">
        <CardContent className="text-center space-y-4 p-6">
          <h3 className="text-lg font-semibold" data-testid="text-contact-title">
            {isRu ? "Свяжитесь с нами" : "Contact Us"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isRu
              ? "Для получения раннего доступа или вопросов:"
              : "For early access or questions:"}
          </p>
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <a
              href="mailto:bfomichev@ecfinuni.com"
              className="flex items-center gap-2 text-sm hover:text-foreground transition-colors text-muted-foreground"
              data-testid="link-email"
            >
              <Mail className="h-4 w-4" />
              bfomichev@ecfinuni.com
            </a>
            <a
              href="https://t.me/bogdanfomichev"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:text-foreground transition-colors text-muted-foreground"
              data-testid="link-telegram"
            >
              <MessageCircle className="h-4 w-4" />
              @bogdanfomichev
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
