import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowRight, Newspaper, Calendar as CalIcon } from "lucide-react";
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

export default function NewsPage() {
  const { language, setLanguage } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const { data: articles = [], isLoading } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news"],
  });

  const ru = language === "ru";

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const a of articles) {
      if (a.category) set.add(a.category);
    }
    return ["all", ...Array.from(set)];
  }, [articles]);

  const filtered = useMemo(() => {
    if (activeCategory === "all") return articles;
    return articles.filter((a) => a.category === activeCategory);
  }, [articles, activeCategory]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  useEffect(() => {
    document.title = ru ? "Новости — Предпринимательский Клуб" : "News — Entrepreneurship Club";
  }, [ru]);

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
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(245,158,11,0.18),transparent_60%)]" />
          <div className="relative px-6 lg:px-12 xl:px-20 max-w-7xl mx-auto pt-20 pb-12 lg:pt-28 lg:pb-16">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold tracking-[0.2em] uppercase mb-4">
              <Newspaper className="h-4 w-4" />
              {ru ? "Хроника клуба" : "Club Chronicle"}
            </div>
            <h1
              className="font-['Inter'] font-black italic tracking-[-0.04em] leading-[0.9] text-white text-[44px] sm:text-[68px] md:text-[96px] lg:text-[120px]"
              data-testid="text-news-title"
            >
              {ru ? (
                <>
                  НОВОСТИ
                  <br />
                  <span className="text-amber-400">КЛУБА</span>
                </>
              ) : (
                <>
                  CLUB
                  <br />
                  <span className="text-amber-400">NEWS</span>
                </>
              )}
            </h1>
            <p className="mt-6 max-w-2xl text-white/70 text-base lg:text-lg">
              {ru
                ? "События, истории участников, объявления и репортажи из жизни клуба."
                : "Events, member stories, announcements, and dispatches from the club."}
            </p>

            {categories.length > 1 && (
              <div className="mt-8 flex flex-wrap gap-2" data-testid="filter-categories">
                {categories.map((cat) => {
                  const active = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      data-testid={`button-cat-${cat}`}
                      className={
                        "px-4 h-9 rounded-md text-xs font-bold uppercase tracking-wider transition-colors " +
                        (active
                          ? "bg-amber-400 text-zinc-950"
                          : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10")
                      }
                    >
                      {cat === "all" ? (ru ? "Все" : "All") : cat}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Articles */}
        <section className="px-6 lg:px-12 xl:px-20 max-w-7xl mx-auto py-12 lg:py-16">
          {isLoading ? (
            <div className="text-white/60 text-sm">{ru ? "Загрузка..." : "Loading..."}</div>
          ) : filtered.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-md p-12 text-center text-white/60">
              <Newspaper className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                {ru ? "Пока нет новостей в этой категории." : "No news in this category yet."}
              </p>
            </div>
          ) : (
            <>
              {/* Featured */}
              {featured && (
                <Link href={`/news/${featured.id}`}>
                  <div
                    className="group cursor-pointer grid lg:grid-cols-12 gap-6 mb-12 hover-elevate rounded-md overflow-hidden"
                    data-testid={`card-featured-${featured.id}`}
                  >
                    <div className="lg:col-span-7 relative aspect-[16/10] lg:aspect-auto bg-zinc-900 overflow-hidden">
                      {featured.coverImage ? (
                        <img
                          src={featured.coverImage}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-zinc-900 to-zinc-950" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
                      {featured.category && (
                        <span className="absolute top-4 left-4 px-3 h-7 inline-flex items-center rounded-md bg-amber-400 text-zinc-950 text-[10px] font-bold uppercase tracking-wider">
                          {featured.category}
                        </span>
                      )}
                    </div>
                    <div className="lg:col-span-5 flex flex-col justify-center px-2 lg:px-0 lg:pr-4 py-4">
                      <div className="flex items-center gap-2 text-xs text-white/50 mb-3">
                        <CalIcon className="h-3.5 w-3.5" />
                        {formatDate(featured.publishedAt ?? featured.createdAt, language)}
                      </div>
                      <h2 className="font-bold text-2xl md:text-3xl lg:text-4xl leading-tight tracking-tight text-white mb-4 group-hover:text-amber-400 transition-colors">
                        {featured.title}
                      </h2>
                      {featured.excerpt && (
                        <p className="text-white/70 text-base leading-relaxed mb-6">
                          {featured.excerpt}
                        </p>
                      )}
                      <div className="inline-flex items-center gap-2 text-amber-400 text-sm font-bold uppercase tracking-wider">
                        {ru ? "Читать" : "Read"} <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* Grid */}
              {rest.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="grid-news">
                  {rest.map((article) => (
                    <Link key={article.id} href={`/news/${article.id}`}>
                      <article
                        className="group cursor-pointer flex flex-col h-full rounded-md overflow-hidden border border-white/5 bg-zinc-900/40 hover-elevate"
                        data-testid={`card-news-${article.id}`}
                      >
                        <div className="relative aspect-[16/10] bg-zinc-900 overflow-hidden">
                          {article.coverImage ? (
                            <img
                              src={article.coverImage}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-zinc-900 to-zinc-950" />
                          )}
                          {article.category && (
                            <span className="absolute top-3 left-3 px-2.5 h-6 inline-flex items-center rounded-md bg-amber-400 text-zinc-950 text-[10px] font-bold uppercase tracking-wider">
                              {article.category}
                            </span>
                          )}
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                          <div className="flex items-center gap-2 text-[11px] text-white/50 mb-2">
                            <CalIcon className="h-3 w-3" />
                            {formatDate(article.publishedAt ?? article.createdAt, language)}
                          </div>
                          <h3 className="font-bold text-lg leading-snug tracking-tight text-white mb-3 group-hover:text-amber-400 transition-colors line-clamp-3">
                            {article.title}
                          </h3>
                          {article.excerpt && (
                            <p className="text-sm text-white/60 leading-relaxed line-clamp-3 mb-4">
                              {article.excerpt}
                            </p>
                          )}
                          <div className="mt-auto inline-flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
                            {ru ? "Подробнее" : "Read more"} <ArrowRight className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* Footer back link */}
        <div className="px-6 lg:px-12 xl:px-20 max-w-7xl mx-auto pb-16">
          <Button
            asChild
            variant="outline"
            className="bg-transparent border-white/15 text-white hover:bg-white/5"
            data-testid="link-back-home"
          >
            <Link href="/">{ru ? "← На главную" : "← Back home"}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
