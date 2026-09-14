/* Cloudflare Worker per Hertavernello: static assets + API Bug/Consigli (solo D1, incluse le immagini). */
const STATI = new Set(["nuova", "da_valutare", "accettata", "risolta", "scartata"]);
const TIPI = new Set(["bug", "consiglio"]);
const MAX_IMAGES = 5;
// D1 limita BLOB/righe a 2.000.000 byte. Manteniamo margine per metadati e serializzazione.
const MAX_IMAGE_BYTES = 1_700_000;
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

function safeFilename(value, fallback = "immagine.jpg") {
  const name = String(value || fallback)
    .replace(/[\\/\0\r\n\t\"<>:|?*]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return name || fallback;
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
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS feedback_images (
        feedback_id TEXT NOT NULL,
        image_index INTEGER NOT NULL,
        filename TEXT NOT NULL,
        content_type TEXT NOT NULL,
        byte_size INTEGER NOT NULL,
        data BLOB NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (feedback_id, image_index)
      )`),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_feedback_images_feedback ON feedback_images(feedback_id, image_index)"),
    ]).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

async function handleCreate(request, env) {
  await ensureSchema(env);
  let form;
  try { form = await request.formData(); }
  catch (_) { return json({ error: "Dati della segnalazione non validi." }, 400); }

  // Honeypot anti-spam: i bot che lo compilano ricevono una risposta neutra, senza scrivere nel DB.
  if (clean(form.get("website"), 120)) return json({ ok: true, id: "ricevuto" });

  const tipo = clean(form.get("tipo"), 20).toLowerCase();
  const nome = clean(form.get("nome"), 80);
  const descrizione = clean(form.get("descrizione"), 5000);
  if (!TIPI.has(tipo)) return json({ error: "Scegli Bug oppure Consiglio." }, 400);
  if (nome.length < 2) return json({ error: "Inserisci il nome." }, 400);
  if (descrizione.length < 8) return json({ error: "Descrizione troppo breve." }, 400);

  const files = form.getAll("images").filter((item) => item instanceof File && item.size > 0);
  if (files.length > MAX_IMAGES) return json({ error: `Puoi allegare al massimo ${MAX_IMAGES} immagini.` }, 400);
  if (files.some((file) => !file.type.startsWith("image/") || file.size > MAX_IMAGE_BYTES)) {
    return json({ error: "Una delle immagini non è valida o è troppo grande dopo la compressione." }, 400);
  }

  const id = `fb_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  try {
    const statements = [
      env.DB.prepare(`INSERT INTO feedback
        (id, tipo, nome, descrizione, pagina, release, user_agent, platform, screen, status, image_keys, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'nuova', '[]', ?, ?)`)
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
          now,
          now,
        ),
    ];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const bytes = await file.arrayBuffer();
      statements.push(
        env.DB.prepare(`INSERT INTO feedback_images
          (feedback_id, image_index, filename, content_type, byte_size, data, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .bind(
            id,
            i,
            safeFilename(file.name, `immagine-${i + 1}.jpg`),
            clean(file.type || "image/jpeg", 100),
            file.size,
            bytes,
            now,
          ),
      );
    }

    // D1 batch è transazionale: se un allegato fallisce, non resta una segnalazione parziale.
    await env.DB.batch(statements);
    return json({ ok: true, id }, 201);
  } catch (error) {
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
  const baseSelect = `SELECT f.*,
    (SELECT COUNT(*) FROM feedback_images fi WHERE fi.feedback_id = f.id) AS image_count
    FROM feedback f`;
  let result;
  if (status && status !== "tutte" && STATI.has(status)) {
    result = await env.DB.prepare(`${baseSelect} WHERE f.status = ? ORDER BY f.created_at DESC LIMIT 250`).bind(status).all();
  } else {
    result = await env.DB.prepare(`${baseSelect} ORDER BY f.created_at DESC LIMIT 250`).all();
  }
  const items = (result.results || []).map((row) => ({
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
    imageCount: Number(row.image_count || 0),
  }));
  return json({ items });
}

async function getReport(env, id) {
  await ensureSchema(env);
  return env.DB.prepare("SELECT * FROM feedback WHERE id = ?").bind(id).first();
}

async function handleAdminImage(request, env, id, indexText) {
  await ensureSchema(env);
  if (!(await verifyAdmin(request, env))) return json({ error: "Accesso Admin non autorizzato." }, 403);
  const report = await getReport(env, id);
  if (!report) return json({ error: "Segnalazione non trovata." }, 404);

  const index = Number(indexText);
  if (!Number.isInteger(index) || index < 0 || index >= MAX_IMAGES) return json({ error: "Immagine non trovata." }, 404);

  const row = await env.DB.prepare(`SELECT filename, content_type, byte_size, data
    FROM feedback_images WHERE feedback_id = ? AND image_index = ?`)
    .bind(id, index).first();
  if (!row || !row.data) return json({ error: "Immagine non trovata." }, 404);

  const body = row.data instanceof ArrayBuffer ? row.data : new Uint8Array(row.data);
  return new Response(body, {
    headers: {
      "Content-Type": clean(row.content_type, 100) || "image/jpeg",
      "Content-Length": String(Number(row.byte_size || body.byteLength || 0)),
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${safeFilename(row.filename, `${id}-${index + 1}.jpg`)}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function handleAdminPatch(request, env, id) {
  await ensureSchema(env);
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
