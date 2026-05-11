import { serve } from "bun";
import { join } from "path";
import { readFileSync, existsSync } from "fs";

const PORT = 3001;

const server = serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    let filePath = join(import.meta.dir, url.pathname === "/" ? "index.html" : url.pathname);

    if (!existsSync(filePath)) {
      return new Response("Not Found", { status: 404 });
    }

    try {
      const fileContent = readFileSync(filePath);
      let contentType = "text/html";

      if (filePath.endsWith(".css")) contentType = "text/css";
      else if (filePath.endsWith(".js")) contentType = "application/javascript";
      else if (filePath.endsWith(".png")) contentType = "image/png";

      return new Response(fileContent, {
        headers: { "Content-Type": contentType },
      });
    } catch (err) {
      return new Response("Internal Server Error", { status: 500 });
    }
  },
});

console.log(`Mock SIS server running at http://localhost:${server.port}`);
