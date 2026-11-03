// Zara's Little Library — first-stage, read-only database connectivity check.
// No reader data is written, and no database contents are returned to visitors.
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  }
});

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/health") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      try {
        await env.DB.prepare("SELECT 1 AS ok").first();
        return json({ status: "ok", database: "connected" });
      } catch (_) {
        return json({ status: "unavailable", database: "not connected" }, 503);
      }
    }
    if (pathname.startsWith("/api/")) {
      return json({ error: "API endpoint not enabled yet" }, 404);
    }
    return env.ASSETS.fetch(request);
  }
};
