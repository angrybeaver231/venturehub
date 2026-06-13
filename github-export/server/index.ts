import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";

async function main() {
  const app = express();
  app.use(express.json());

  // Lightweight request logger for API calls.
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      const start = Date.now();
      res.on("finish", () => {
        console.log(
          `${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`,
        );
      });
    }
    next();
  });

  registerRoutes(app);

  const server = createServer(app);

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    await setupVite(app, server);
  }

  const port = Number(process.env.PORT) || 5000;
  server.listen(port, "0.0.0.0", () => {
    console.log(`Venture & Events Hub running on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
