/* Cloudflare Worker per Hertavernello: static assets + API Bug/Consigli (D1 + R2). */
const STATI = new Set(["nuova", "da_valutare", "accettata", "risolta", "scartata"]);
const TIPI = new Set(["bug", "consiglio"]);
let schemaReady = null;
let configCache = null;
const githubVerificationCache = new Map();

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extraHeaders },
  });
}

function clean(value, max = 5000) {
  return String(value ?? "").trim().slice(0, max);
}

async function ensureSchema(env) {
  if (!schemaReady) {
    schemaReady = env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS feedback (
        id TEXT PRIMARY KEY,
        tipo TEXT NOT NULL,
        nome TEXT NOT NULL,
        descrizione TEXT NOT NULL,
        pagina TEXT,
        release TEXT,
        user_agent TEXT,
        platform TEXT,
        screen TEXT,
        status TEXT NOT NULL DEFAULT 'nuova',
        image_keys TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_feedback_status_created ON feedback(status, created_at DESC)"),
    ]).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

function extFor(type) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

async function handleCreate(request, env) {
  await ensureSchema(env);
  let form;
  try { form = await request.formData(); }
  catch (_) { return json({ error: "Dati della segnalazione non validi." }, 400); }

  if (clean(form.get("website"), 120)) return json({ ok: true, id: "ricevuto" });

  const tipo = clean(form.get("tipo"), 20).toLowerCase();
  const nome = clean(form.get("nome"), 80);
  const descrizione = clean(form.get("descrizione"), 5000);
  if (!TIPI.has(tipo)) return json({ error: "Scegli Bug oppure Consiglio." }, 400);
  if (nome.length < 2) return json({ error: "Inserisci il nome." }, 400);
  if (descrizione.length < 8) return json({ error: "Descrizione troppo breve." }, 400);

  const files = form.getAll("images").filter((item) => item instanceof File && item.size > 0);
  if (files.length > 5) return json({ error: "Puoi allegare al massimo 5 immagini." }, 400);
  if (files.some((file) => !file.type.startsWith("image/") || file.size > 2 * 1024 * 1024)) {
    return json({ error: "Una delle immagini non è valida o supera 2 MB dopo la compressione." }, 400);
  }

  const id = `fb_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;
  const imageKeys = [];
  try {
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const key = `feedback/${id}/${String(i + 1).padStart(2, "0")}-${crypto.randomUUID()}.${extFor(file.type)}`;
      await env.FEEDBACK_IMAGES.put(key, file.stream(), {
        httpMetadata: { contentType: file.type || "image/jpeg", cacheControl: "private, no-store" },
        customMetadata: { reportId: id, index: String(i) },
      });
      imageKeys.push(key);
    }

    const now = new Date().toISOString();
    await env.DB.prepare(`INSERT INTO feedback
      (id, tipo, nome, descrizione, pagina, release, user_agent, platform, screen, status, image_keys, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'nuova', ?, ?, ?)`)
      .bind(
        id,
        tipo,
        nome,
        descrizione,
        clean(form.get("pagina"), 300),
        clean(form.get("release"), 120),
        clean(form.get("userAgent"), 600),
        clean(form.get("platform"), 160),
        clean(form.get("screen"), 160),
        JSON.stringify(imageKeys),
        now,
        now,
      ).run();
    return json({ ok: true, id }, 201);
  } catch (error) {
    await Promise.allSettled(imageKeys.map((key) => env.FEEDBACK_IMAGES.delete(key)));
    console.error("feedback create", error);
    return json({ error: "Non riesco a salvare la segnalazione in questo momento." }, 500);
  }
}

async function loadConfig(request, env) {
  if (configCache && Date.now() - configCache.time < 5 * 60 * 1000) return configCache.data;
  const url = new URL("/data/config.json", request.url);
  const res = await env.ASSETS.fetch(new Request(url.toString(), { method: "GET" }));
  if (!res.ok) throw new Error("config.json non disponibile");
  const data = await res.json();
  configCache = { time: Date.now(), data };
  return data;
}

async function tokenHash(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyAdmin(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return false;

  const hash = await tokenHash(token);
  const cached = githubVerificationCache.get(hash);
  if (cached && cached.until > Date.now()) return cached.ok;

  try {
    const cfg = await loadConfig(request, env);
    const owner = cfg?.lega?.githubOwner;
    const repo = cfg?.lega?.githubRepo;
    if (!owner || !repo) return false;
    const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Hertavernello-Feedback-Worker",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!res.ok) {
      githubVerificationCache.set(hash, { ok: false, until: Date.now() + 60_000 });
      return false;
    }
    const repoData = await res.json();
    const ok = Boolean(repoData?.permissions?.push || repoData?.permissions?.admin || repoData?.permissions?.maintain);
    githubVerificationCache.set(hash, { ok, until: Date.now() + 5 * 60_000 });
    return ok;
  } catch (_) {
    return false;
  }
}

async function handleCount(env) {
  await ensureSchema(env);
  const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM feedback WHERE status = 'nuova'").first();
  return json({ count: Number(row?.count || 0) });
}

async function handleAdminList(request, env) {
  await ensureSchema(env);
  if (!(await verifyAdmin(request, env))) return json({ error: "Accesso Admin non autorizzato." }, 403);
  const status = clean(new URL(request.url).searchParams.get("status"), 30);
  let result;
  if (status && status !== "tutte" && STATI.has(status)) {
    result = await env.DB.prepare("SELECT * FROM feedback WHERE status = ? ORDER BY created_at DESC LIMIT 250").bind(status).all();
  } else {
    result = await env.DB.prepare("SELECT * FROM feedback ORDER BY created_at DESC LIMIT 250").all();
  }
  const items = (result.results || []).map((row) => {
    let keys = [];
    try { keys = JSON.parse(row.image_keys || "[]"); } catch (_) {}
    return {
      id: row.id,
      tipo: row.tipo,
      nome: row.nome,
      descrizione: row.descrizione,
      pagina: row.pagina,
      release: row.release,
      user_agent: row.user_agent,
      platform: row.platform,
      screen: row.screen,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      imageCount: keys.length,
    };
  });
  return json({ items });
}

async function getReport(env, id) {
  await ensureSchema(env);
  return env.DB.prepare("SELECT * FROM feedback WHERE id = ?").bind(id).first();
}

async function handleAdminImage(request, env, id, indexText) {
  if (!(await verifyAdmin(request, env))) return json({ error: "Accesso Admin non autorizzato." }, 403);
  const row = await getReport(env, id);
  if (!row) return json({ error: "Segnalazione non trovata." }, 404);
  let keys = [];
  try { keys = JSON.parse(row.image_keys || "[]"); } catch (_) {}
  const index = Number(indexText);
  if (!Number.isInteger(index) || index < 0 || index >= keys.length) return json({ error: "Immagine non trovata." }, 404);
  const object = await env.FEEDBACK_IMAGES.get(keys[index]);
  if (!object) return json({ error: "Immagine non trovata." }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("Content-Disposition", `inline; filename="${id}-${index + 1}.${extFor(headers.get("Content-Type") || "image/jpeg")}"`);
  return new Response(object.body, { headers });
}

async function handleAdminPatch(request, env, id) {
  if (!(await verifyAdmin(request, env))) return json({ error: "Accesso Admin non autorizzato." }, 403);
  const body = await request.json().catch(() => null);
  const status = clean(body?.status, 30);
  if (!STATI.has(status)) return json({ error: "Stato non valido." }, 400);
  const result = await env.DB.prepare("UPDATE feedback SET status = ?, updated_at = ? WHERE id = ?")
    .bind(status, new Date().toISOString(), id).run();
  if (!result.meta?.changes) return json({ error: "Segnalazione non trovata." }, 404);
  return json({ ok: true, status });
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (path === "/api/feedback" && request.method === "POST") return handleCreate(request, env);
  if (path === "/api/feedback/count" && request.method === "GET") return handleCount(env);
  if (path === "/api/feedback/admin" && request.method === "GET") return handleAdminList(request, env);

  const imageMatch = path.match(/^\/api\/feedback\/admin\/([^/]+)\/images\/(\d+)$/);
  if (imageMatch && request.method === "GET") return handleAdminImage(request, env, decodeURIComponent(imageMatch[1]), imageMatch[2]);

  const itemMatch = path.match(/^\/api\/feedback\/admin\/([^/]+)$/);
  if (itemMatch && request.method === "PATCH") return handleAdminPatch(request, env, decodeURIComponent(itemMatch[1]));

  return json({ error: "Endpoint non trovato." }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/")) return await handleApi(request, env);
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error("worker", error);
      if (url.pathname.startsWith("/api/")) return json({ error: "Errore interno del servizio." }, 500);
      return env.ASSETS.fetch(request);
    }
  },
};
