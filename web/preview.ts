import { serve } from "@hono/node-server";
import { webRoutes } from "../server/web";

const port = Number(process.env.COMMET_WEB_PORT || 8888);
serve({ fetch: webRoutes().fetch, hostname: "127.0.0.1", port }, () => {
  console.log(`Commet Web preview: http://127.0.0.1:${port}`);
});
