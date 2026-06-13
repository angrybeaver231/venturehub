import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { LandingRenderer } from "@/components/landing/section-renderer";
import { DEFAULT_THEME } from "@/lib/landing-blocks";
import type { LandingPage } from "@shared/schema";

export default function LandingRenderPage({ slugOverride }: { slugOverride?: string }) {
  const [, params] = useRoute<{ slug: string }>("/p/:slug");
  const slug = slugOverride || params?.slug;

  const { data, isLoading, isError } = useQuery<LandingPage>({
    queryKey: ["/api/landing/by-slug", slug],
    enabled: !!slug,
  });

  useEffect(() => {
    if (data) {
      document.title = data.seoTitle || data.title;
      const descMeta = document.querySelector('meta[name="description"]');
      if (data.seoDescription) {
        if (descMeta) descMeta.setAttribute("content", data.seoDescription);
        else {
          const m = document.createElement("meta");
          m.name = "description";
          m.content = data.seoDescription;
          document.head.appendChild(m);
        }
      }
    }
  }, [data]);

  if (!slug) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white/60 text-sm">
        Loading...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white">
        <div className="text-6xl font-black mb-4 opacity-30">404</div>
        <div className="text-sm opacity-60">Landing page not found.</div>
      </div>
    );
  }

  return (
    <>
      {data.customCss && <style dangerouslySetInnerHTML={{ __html: data.customCss }} />}
      <LandingRenderer sections={(data.sections as any) || []} theme={(data.theme as any) || DEFAULT_THEME} />
    </>
  );
}
