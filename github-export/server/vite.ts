import type { Express } from "express";
import express from "express";
import type { Server } from "http";
import fs from "fs";
import path from "path";

/**
 * In development we attach Vite as middleware so the client is served with HMR.
 * In production we serve the pre-built static files from dist/public.
 */
export async function setupVite(app: Express, server: Server) {
  const { createServer: createViteServer } = await import("vite");
  const root = path.resolve(import.meta.dirname, "..", "client");
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: { server } },
    appType: "custom",
    root,
    resolve: {
      alias: {
        "@": path.resolve(root, "src"),
        "@shared": path.resolve(import.meta.dirname, "..", "shared"),
      },
    },
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    try {
      const templatePath = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );
      let template = await fs.promises.readFile(templatePath, "utf-8");
      template = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (err) {
      vite.ssrFixStacktrace(err as Error);
      next(err);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Build output not found at ${distPath}. Run "npm run build" first.`,
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
