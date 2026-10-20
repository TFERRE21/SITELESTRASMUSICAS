import http from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");
const dataDir = process.env.DATA_DIR || path.join(root, "data");
const catalogFile = path.join(dataDir, "catalog.json");
const PORT = Number(process.env.PORT || 4173);
const MUSIXMATCH_API_KEY = process.env.MUSIXMATCH_API_KEY || "";
const LYRICS_ENABLED = process.env.MUSIXMATCH_LYRICS_ENABLED === "true";
const SYNC_TOKEN = process.env.CATALOG_SYNC_TOKEN || "";
const SYNC_INTERVAL = 24 * 60 * 60 * 1000;
const USER_AGENT = "SomELetra/0.1 (music catalog integration)";

let cachedCatalog = [];
let lastSyncAt = null;
let syncInProgress = false;

const json = (res, status, body) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(body));
};

async function readCatalog() {
  try {
    const parsed = JSON.parse(await readFile(catalogFile, "utf8"));
    cachedCatalog = Array.isArray(parsed.items) ? parsed.items : [];
    lastSyncAt = parsed.lastSyncAt || null;
  } catch {
    cachedCatalog = [];
  }
}

async function saveCatalog(items) {
  await mkdir(dataDir, { recursive: true });
  const merged = new Map(cachedCatalog.map((item) => [item.id, item]));
  for (const item of items) merged.set(item.id, item);
  cachedCatalog = [...merged.values()].slice(0, 1000);
  lastSyncAt = new Date().toISOString();
  await writeFile(catalogFile, JSON.stringify({ lastSyncAt, items: cachedCatalog }, null, 2), { mode: 0o600 });
}

async function musixmatch(endpoint, params = {}) {
  if (!MUSIXMATCH_API_KEY) {
    const error = new Error("Catálogo externo não configurado. Defina MUSIXMATCH_API_KEY no ambiente do VPS.");
    error.status = 503;
    throw error;
  }
  const url = new URL(`https://api.musixmatch.com/ws/1.1/${endpoint}`);
  url.searchParams.set("apikey", MUSIXMATCH_API_KEY);
  url.searchParams.set("format", "json");
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) {
    const error = new Error(`O provedor musical respondeu HTTP ${response.status}.`);
    error.status = response.status === 429 ? 429 : 502;
    throw error;
  }
  const payload = await response.json();
  if (payload.message?.header?.status_code !== 200) {
    const error = new Error("O provedor não autorizou a consulta. Confira a chave, a cota e o plano contratado.");
    error.status = payload.message?.header?.status_code === 401 ? 502 : 502;
    throw error;
  }
  return payload.message.body;
}

function normalizeTrack(track) {
  return {
    id: String(track.track_id),
    title: track.track_name || "Faixa sem título",
    artist: track.artist_name || "Artista desconhecido",
    album: track.album_name || "",
    genre: track.primary_genres?.music_genre_list?.[0]?.music_genre?.music_genre_name || "",
    releaseDate: track.first_release_date || "",
    explicit: Boolean(track.explicit),
    provider: "Musixmatch",
    providerUrl: track.track_share_url || "",
    lyricsAvailable: Boolean(track.has_lyrics),
  };
}

async function searchTracks(query, page = 1) {
  const body = await musixmatch("track.search", {
    q: query,
    page,
    page_size: 20,
    s_track_rating: "desc",
  });
  return (body.track_list || []).map((entry) => normalizeTrack(entry.track));
}

async function syncDailyCatalog() {
  if (!MUSIXMATCH_API_KEY || syncInProgress) return;
  syncInProgress = true;
  try {
    // Refresh selected international charts sequentially; never scrape third-party websites.
    const items = [];
    for (const country of ["br", "us", "gb", "pt"]) {
      try {
        const body = await musixmatch("chart.tracks.get", { country, page: 1, page_size: 100 });
        items.push(...(body.track_list || []).map((entry) => ({ ...normalizeTrack(entry.track), chartCountry: country.toUpperCase() })));
      } catch (error) {
        console.error(`[catalog] Falha ao sincronizar chart ${country.toUpperCase()}:`, error.message);
      }
    }
    if (items.length) {
      await saveCatalog(items);
      console.info(`[catalog] Sincronização diária concluída: ${items.length} faixas em ${new Set(items.map((item) => item.chartCountry)).size} mercados.`);
    }
  } catch (error) {
    console.error("[catalog] Sincronização diária falhou:", error.message);
  } finally {
    syncInProgress = false;
  }
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
};

async function serveStatic(req, res, pathname) {
  const safePath = path.normalize(decodeURIComponent(pathname)).replace(/^([.][.][/\\])+/, "");
  let filePath = path.join(dist, safePath === "/" ? "index.html" : safePath);
  if (!filePath.startsWith(dist)) return json(res, 403, { error: "Acesso negado." });
  if (!existsSync(filePath)) filePath = path.join(dist, "index.html");
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { "Content-Type": mime[path.extname(filePath)] || "application/octet-stream", "X-Content-Type-Options": "nosniff" });
    res.end(body);
  } catch {
    json(res, 503, { error: "A versão web não foi compilada. Execute npm run build." });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (req.method === "GET" && url.pathname === "/api/health") {
    return json(res, 200, { ok: true, providerConfigured: Boolean(MUSIXMATCH_API_KEY), lyricsEnabled: LYRICS_ENABLED, catalogItems: cachedCatalog.length, lastSyncAt });
  }
  if (req.method === "GET" && url.pathname === "/api/catalog") {
    const q = (url.searchParams.get("q") || "").trim().slice(0, 120);
    const page = Math.max(1, Math.min(100, Number(url.searchParams.get("page") || 1)));
    if (!q) return json(res, 200, { items: cachedCatalog.slice((page - 1) * 20, page * 20), source: "cache", lastSyncAt, providerConfigured: Boolean(MUSIXMATCH_API_KEY) });
    try {
      const items = await searchTracks(q, page);
      return json(res, 200, { items, source: "Musixmatch", providerConfigured: true });
    } catch (error) {
      return json(res, error.status || 502, { error: error.message, items: [], providerConfigured: Boolean(MUSIXMATCH_API_KEY) });
    }
  }
  if (req.method === "GET" && url.pathname.startsWith("/api/lyrics/")) {
    if (!LYRICS_ENABLED) return json(res, 403, { error: "A exibição de letras está desativada até confirmar que o plano e a licença autorizam a publicação neste site." });
    const id = url.pathname.split("/").pop();
    if (!/^\d+$/.test(id)) return json(res, 400, { error: "Identificador de faixa inválido." });
    try {
      const body = await musixmatch("track.lyrics.get", { track_id: id });
      const lyrics = body.lyrics;
      if (!lyrics?.lyrics_body) return json(res, 404, { error: "Letra não disponível para esta faixa." });
      return json(res, 200, { lyrics: lyrics.lyrics_body, copyright: lyrics.lyrics_copyright || "", provider: "Musixmatch" });
    } catch (error) {
      return json(res, error.status || 502, { error: error.message });
    }
  }
  if (req.method === "POST" && url.pathname === "/api/admin/sync") {
    if (!SYNC_TOKEN || req.headers.authorization !== `Bearer ${SYNC_TOKEN}`) return json(res, 401, { error: "Não autorizado." });
    await syncDailyCatalog();
    return json(res, 200, { ok: true, catalogItems: cachedCatalog.length, lastSyncAt });
  }
  if (req.method === "GET" && !url.pathname.startsWith("/api/")) return serveStatic(req, res, url.pathname);
  return json(res, 404, { error: "Não encontrado." });
});

await readCatalog();
server.listen(PORT, "0.0.0.0", () => {
  console.info(`[server] Som & Letra ouvindo na porta ${PORT}`);
  if (MUSIXMATCH_API_KEY) {
    syncDailyCatalog();
    setInterval(syncDailyCatalog, SYNC_INTERVAL).unref();
  } else {
    console.warn("[catalog] MUSIXMATCH_API_KEY ausente; busca e sincronização externa estão desativadas.");
  }
});
