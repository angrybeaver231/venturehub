import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useRoute } from "wouter";
import DOMPurify from "dompurify";
import { ArrowLeft, Calendar as CalIcon, Newspaper } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { PublicSidebar, PublicMobileTopBar, buildPublicNavItems } from "@/components/public-sidebar";
import { Button } from "@/components/ui/button";
import type { NewsArticle } from "@shared/schema";

function formatDate(value: string | Date | null | undefined, lang: "en" | "ru") {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function NewsDetailPage() {
  const [, params] = useRoute<{ id: string }>("/news/:id");
  const id = params?.id;
  const { language, setLanguage } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const ru = language === "ru";

  const { data: article, isLoading, isError } = useQuery<NewsArticle>({
    queryKey: ["/api/news", id],
    enabled: !!id,
  });

  useEffect(() => {
    if (article) {
      document.title = `${article.title} — ${ru ? "Новости" : "News"}`;
    }
  }, [article, ru]);

  const goAnchor = (id: string) => setLocation(`/#${id}`);
  const navItems = buildPublicNavItems(language, goAnchor);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {!isAuthenticated && (
        <>
          <PublicSidebar
            items={navItems}
            language={language}
            onLanguageToggle={() => setLanguage(ru ? "en" : "ru")}
            activeId="news"
          />
          <PublicMobileTopBar
            language={language}
            onLanguageToggle={() => setLanguage(ru ? "en" : "ru")}
          />
        </>
      )}

      <div className={!isAuthenticated ? "lg:pl-[110px]" : ""}>
        <div className="px-6 lg:px-12 xl:px-20 max-w-4xl mx-auto pt-16 lg:pt-20 pb-16">
          <Button
            asChild
            variant="ghost"
            className="text-white/70 hover:text-white mb-6 -ml-3"
            data-testid="link-back-news"
          >
            <Link href="/news">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {ru ? "Все новости" : "All news"}
            </Link>
          </Button>

          {isLoading && (
            <div className="text-white/60 text-sm">{ru ? "Загрузка..." : "Loading..."}</div>
          )}

          {isError && (
            <div className="border border-white/10 rounded-md p-10 text-center">
              <Newspaper className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-white/70">
                {ru ? "Новость не найдена." : "Article not found."}
              </p>
            </div>
          )}

          {article && (
            <article data-testid="article-news">
              {article.category && (
                <span className="inline-flex items-center px-3 h-7 rounded-md bg-amber-400 text-zinc-950 text-[10px] font-bold uppercase tracking-wider mb-5">
                  {article.category}
                </span>
              )}
              <h1
                className="font-bold text-3xl md:text-5xl leading-[1.05] tracking-tight mb-5"
                data-testid="text-article-title"
              >
                {article.title}
              </h1>
              <div className="flex items-center gap-2 text-sm text-white/55 mb-8">
                <CalIcon className="h-4 w-4" />
                {formatDate(article.publishedAt ?? article.createdAt, language)}
              </div>

              {article.coverImage && (
                <div className="aspect-[16/9] mb-10 overflow-hidden rounded-md bg-zinc-900">
                  <img
                    src={article.coverImage}
                    alt=""
                    className="w-full h-full object-cover"
                    data-testid="img-article-cover"
                  />
                </div>
              )}

              {article.excerpt && (
                <p className="text-lg md:text-xl text-white/80 leading-relaxed mb-8 border-l-2 border-amber-400 pl-5">
                  {article.excerpt}
                </p>
              )}

              <div
                className="prose prose-invert prose-amber max-w-none prose-headings:tracking-tight prose-img:rounded-md prose-a:text-amber-400 prose-strong:text-white"
                data-testid="text-article-body"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(article.body || "", {
                    ALLOWED_TAGS: [
                      "p", "br", "strong", "em", "u", "s", "ol", "ul", "li", "a",
                      "h1", "h2", "h3", "h4", "blockquote", "code", "pre",
                      "img", "figure", "figcaption", "hr", "span", "div",
                    ],
                    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "class"],
                  }),
                }}
              />
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
