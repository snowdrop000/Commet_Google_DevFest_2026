import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { resolve } from "node:path";

/** Static web experience; all existing /v1 routes retain their authentication. */
export function webRoutes(root = resolve("dist/web")) {
  const web = new Hono();
  const policy = [
    "default-src 'self'",
    "script-src 'self' https://apis.google.com",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: https://lh3.googleusercontent.com",
    "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://*.firebaseapp.com",
    "frame-src https://*.firebaseapp.com https://accounts.google.com https://apis.google.com https://www.youtube-nocookie.com",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self' https://accounts.google.com",
  ].join("; ");
  for (const path of ["/", "/web/*"])
    web.use(path, async (c, next) => {
      c.header("Content-Security-Policy", policy);
      c.header("X-Content-Type-Options", "nosniff");
      c.header("Referrer-Policy", "strict-origin-when-cross-origin");
      c.header("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
      await next();
    });
  web.get("/", serveStatic({ path: resolve(root, "index.html"), precompressed: true }));
  web.get("/web/*", async (c, next) => {
    const path = c.req.path;
    if (
      !/^\/web\/(?:favicon\.svg|assets\/[\w.-]+\.(?:js|css)|characters\/[\w-]+\.png|fonts\/(?:[\w-]+\.woff2|OFL\.txt))$/.test(
        path,
      )
    )
      return c.notFound();
    return serveStatic({ root, precompressed: true, rewriteRequestPath: (path) => path.slice(4) })(
      c,
      next,
    );
  });
  return web;
}
