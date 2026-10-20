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
const USER_AGENT = "SomELetra/0.2 (https://github.com/TFERRE21/SITELESTRASMUSICAS)";
let cachedCatalog = [];
let lastSearchAt = null;
let robotRunning = false;
let robotLastRunAt = null;
let robotLastError = null;
let robotQueryIndex = 0;
let robotNextAllowedAt = null;
let robotConsecutiveErrors = 0;
const ROBOT_INTERVAL_MS = 60_000;
const ROBOT_QUERIES = ["gospel", "sertanejo", "MPB", "pop brasileiro", "rock brasileiro", "rap brasileiro", "funk brasileiro", "pagode", "samba", "forró", "reggae", "música eletrônica", "indie brasileiro", "jazz", "música clássica", "bossa nova", "country", "metal", "música latina", "louvor", "hinos", "Chitãozinho Xororó", "Marília Mendonça", "Legião Urbana", "Anitta", "Roberto Carlos", "Gilberto Gil", "Djavan", "Gusttavo Lima", "Adele"];

const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(JSON.stringify(body));
};

async function readCatalog() {
  try {
    const parsed = JSON.parse(await readFile(catalogFile, "utf8"));
    cachedCatalog = Array.isArray(parsed.items) ? parsed.items : [];
    lastSearchAt = parsed.lastSearchAt || null;
  } catch { cachedCatalog = []; }
}

async function saveCatalog(items) {
  await mkdir(dataDir, { recursive: true });
  const merged = new Map(cachedCatalog.map((item) => [String(item.id), item]));
  for (const item of items) merged.set(String(item.id), item);
  cachedCatalog = [...merged.values()].slice(-5000);
  lastSearchAt = new Date().toISOString();
  await writeFile(catalogFile, JSON.stringify({ lastSearchAt, items: cachedCatalog }, null, 2), { mode: 0o600 });
}

async function lrclib(pathname, params = {}) {
  const url = new URL(`https://lrclib.net${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT, "Accept": "application/json" }, signal: AbortSignal.timeout(15000) });
  if (response.status === 429) {
    const error = new Error("A API LRCLIB limitou temporariamente as consultas. Aguarde antes de tentar novamente.");
    error.status = 429;
    error.retryAfter = response.headers.get("retry-after");
    throw error;
  }
  if (!response.ok) {
    const error = new Error(response.status === 404 ? "Nenhuma letra encontrada para esta faixa." : `LRCLIB respondeu HTTP ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function normalizeTrack(track) {
  return {
    id: String(track.id),
    title: track.trackName || track.name || "Faixa sem título",
    artist: track.artistName || "Artista desconhecido",
    album: track.albumName || "",
    genre: "",
    releaseDate: "",
    explicit: false,
    provider: "LRCLIB",
    providerUrl: `https://lrclib.net/api/get/${track.id}`,
    lyricsAvailable: Boolean(track.plainLyrics || track.syncedLyrics),
    duration: track.duration || null,
    instrumental: Boolean(track.instrumental),
    syncedLyricsAvailable: Boolean(track.syncedLyrics),
  };
}

const mime = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".svg":"image/svg+xml", ".png":"image/png", ".jpg":"image/jpeg", ".webp":"image/webp", ".ico":"image/x-icon", ".json":"application/json; charset=utf-8" };

async function serveStatic(req, res, pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return json(res, 400, { error: "Caminho inválido." }); }
  const safePath = path.normalize(decoded).replace(/^([.][.][/\\\\])+/, "");
  let filePath = path.join(dist, safePath === "/" ? "index.html" : safePath);
  if (!filePath.startsWith(dist)) return json(res, 403, { error: "Acesso negado." });
  if (!existsSync(filePath)) filePath = path.join(dist, "index.html");
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { "Content-Type": mime[path.extname(filePath)] || "application/octet-stream", "X-Content-Type-Options": "nosniff" });
    res.end(body);
  } catch { json(res, 503, { error: "A versão web não foi compilada. Execute npm run build." }); }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (req.method === "GET" && url.pathname === "/api/health") {
    return json(res, 200, { ok: true, provider: "LRCLIB", providerConfigured: true, apiKeyRequired: false, catalogItems: cachedCatalog.length, lastSearchAt });
  }
  if (req.method === "GET" && url.pathname === "/api/catalog/sources") {
    const q = (url.searchParams.get("q") || "").trim().slice(0, 120);
    if (!q) return json(res, 400, { error: "Informe o nome da música ou artista no parâmetro q." });
    const encoded = encodeURIComponent(q);
    return json(res, 200, {
      query: q,
      sources: [
        { name: "Letras.mus.br", type: "external-search", url: "https://www.letras.mus.br/?q=" + encoded, lyricsCopied: false },
        { name: "LRCLIB", type: "internal-provider", url: "/api/catalog?q=" + encoded, lyricsCopied: false }
      ],
      note: "Letras.mus.br é aberto como busca externa. Este endpoint não raspa nem copia letras; qualquer integração automatizada deve usar API ou autorização oficial da fonte."
    });
  }
  if (req.method === "GET" && url.pathname === "/api/catalog/status") {
    return json(res, 200, { robot: "Som & Letra", running: robotRunning, cachedItems: cachedCatalog.length, lastSearchAt, robotLastRunAt, robotLastError, nextAttemptAt: robotNextAllowedAt, consecutiveErrors: robotConsecutiveErrors, intervalSeconds: ROBOT_INTERVAL_MS / 1000, source: "LRCLIB" });
  }
  if (req.method === "GET" && url.pathname === "/api/catalog") {
    const q = (url.searchParams.get("q") || "").trim().slice(0, 120);
    if (!q) {
      const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
      const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "60", 10) || 60));
      const start = (page - 1) * limit;
      return json(res, 200, { items: cachedCatalog.slice(start, start + limit), total: cachedCatalog.length, page, limit, hasMore: start + limit < cachedCatalog.length, source: "cache", lastSearchAt, provider: "LRCLIB", apiKeyRequired: false, robotRunning });
    }
    try {
      const results = await lrclib("/api/search", { q });
      const items = Array.isArray(results) ? results.map(normalizeTrack) : [];
      // Cache only metadata; lyrics are fetched on demand and are not persisted here.
      await saveCatalog(items);
      return json(res, 200, { items, source: "LRCLIB", provider: "LRCLIB", apiKeyRequired: false });
    } catch (error) {
      return json(res, error.status === 429 ? 429 : 502, { error: error.message || "Não foi possível consultar LRCLIB.", items: [], provider: "LRCLIB", retryAfter: error.retryAfter || null });
    }
  }
  if (req.method === "GET" && url.pathname.startsWith("/api/lyrics/")) {
    const id = url.pathname.split("/").pop();
    if (!/^\d+$/.test(id)) return json(res, 400, { error: "Identificador de faixa inválido." });
    try {
      const track = await lrclib(`/api/get/${id}`);
      const lyrics = track.syncedLyrics || track.plainLyrics || "";
      if (!lyrics) return json(res, 404, { error: "Letra não disponível para esta faixa." });
      return json(res, 200, { lyrics, copyright: "", provider: "LRCLIB", trackName: track.trackName, artistName: track.artistName, instrumental: Boolean(track.instrumental) });
    } catch (error) {
      return json(res, error.status === 429 ? 429 : (error.status === 404 ? 404 : 502), { error: error.message || "Não foi possível consultar a letra.", retryAfter: error.retryAfter || null });
    }
  }
  if (req.method === "GET" && !url.pathname.startsWith("/api/")) return serveStatic(req, res, url.pathname);
  return json(res, 404, { error: "Não encontrado." });
});

async function robotCollectOneQuery() {
  if (robotRunning) return;
  if (robotNextAllowedAt && Date.now() < Date.parse(robotNextAllowedAt)) return;
  robotRunning = true;
  const q = ROBOT_QUERIES[robotQueryIndex % ROBOT_QUERIES.length];
  try {
    const results = await lrclib("/api/search", { q });
    const items = Array.isArray(results) ? results.map(normalizeTrack) : [];
    await saveCatalog(items);
    robotLastRunAt = new Date().toISOString();
    robotLastError = null;
    robotConsecutiveErrors = 0;
    robotNextAllowedAt = null;
    robotQueryIndex += 1;
    console.info("[catalog-robot] consulta " + q + ": " + items.length + " resultados; total local " + cachedCatalog.length + ".");
  } catch (error) {
    robotLastRunAt = new Date().toISOString();
    robotLastError = error.message || "Falha na coleta automática.";
    robotConsecutiveErrors += 1;
    const retryHeader = Number.parseInt(error.retryAfter || "", 10);
    const delayMs = error.status === 429 && Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader * 1000 : Math.min(30 * 60_000, 5 * 60_000 * robotConsecutiveErrors);
    robotNextAllowedAt = new Date(Date.now() + delayMs).toISOString();
    console.warn("[catalog-robot] " + robotLastError + "; nova tentativa em " + Math.round(delayMs / 60000) + " minuto(s).");
  } finally { robotRunning = false; }
}

await readCatalog();
server.listen(PORT, "0.0.0.0", () => {
  console.info(`[server] Som & Letra ouvindo na porta ${PORT}; provedor LRCLIB sem chave de API.`);
  setTimeout(() => {
    robotCollectOneQuery().catch((error) => console.warn("[catalog-robot]", error));
    setInterval(() => robotCollectOneQuery().catch((error) => console.warn("[catalog-robot]", error)), ROBOT_INTERVAL_MS);
  }, 10_000);
});
