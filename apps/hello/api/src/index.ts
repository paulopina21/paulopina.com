export interface Env {
  DB: D1Database;
  APP_NAME: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (url.pathname === "/" || url.pathname === "/health") {
      return Response.json(
        { ok: true, app: env.APP_NAME, message: "Hello from paulopina.com!" },
        { headers: corsHeaders }
      );
    }

    // List notes
    if (url.pathname === "/notes" && req.method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT id, content, created_at FROM notes ORDER BY id DESC LIMIT 50"
      ).all();
      return Response.json({ results }, { headers: corsHeaders });
    }

    // Create note
    if (url.pathname === "/notes" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const content = String((body as any)?.content ?? "").trim();
      if (!content) {
        return new Response("content required", { status: 400, headers: corsHeaders });
      }

      await env.DB.prepare("INSERT INTO notes (content) VALUES (?)")
        .bind(content)
        .run();

      return new Response(null, { status: 204, headers: corsHeaders });
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};
