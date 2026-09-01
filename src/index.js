// Worker principal do projeto Troubleshooting CT.
// Serve a página (index.html e demais arquivos estáticos) e, além disso,
// responde em /api/storage com uma API genérica de chave-valor (get/set/
// list/delete) sobre o KV (binding CT_KV) — usada pelo window.storage
// que o front-end já espera encontrar.

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/storage") {
      return handleStorageApi(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleStorageApi(request, env) {
  const url = new URL(request.url);
  const corsHeaders = { "content-type": "application/json" };

  if (request.method === "GET") {
    const action = url.searchParams.get("action");

    if (action === "list") {
      const prefix = url.searchParams.get("prefix") || "";
      try {
        const list = await env.CT_KV.list({ prefix });
        return new Response(JSON.stringify({ keys: list.keys.map((k) => k.name) }), {
          headers: corsHeaders
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Falha ao listar: " + err.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    const key = url.searchParams.get("key");
    if (!key) {
      return new Response(JSON.stringify({ error: "Parâmetro 'key' é obrigatório." }), {
        status: 400,
        headers: corsHeaders
      });
    }
    try {
      const value = await env.CT_KV.get(key);
      return new Response(JSON.stringify({ value }), { headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Falha ao ler: " + err.message }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }

  if (request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch (err) {
      return new Response(JSON.stringify({ error: "JSON inválido no corpo da requisição." }), {
        status: 400,
        headers: corsHeaders
      });
    }
    if (!body.key) {
      return new Response(JSON.stringify({ error: "Campo 'key' é obrigatório." }), {
        status: 400,
        headers: corsHeaders
      });
    }
    try {
      await env.CT_KV.put(body.key, String(body.value ?? ""));
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Falha ao salvar: " + err.message }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }

  if (request.method === "DELETE") {
    const key = url.searchParams.get("key");
    if (!key) {
      return new Response(JSON.stringify({ error: "Parâmetro 'key' é obrigatório." }), {
        status: 400,
        headers: corsHeaders
      });
    }
    try {
      await env.CT_KV.delete(key);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Falha ao excluir: " + err.message }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
}
