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
const ROBOT_QUERIES = [
  // Gêneros brasileiros
  "gospel", "louvor", "hinos", "adoração", "sertanejo", "sertanejo universitário", "MPB", "pop brasileiro",
  "rock brasileiro", "rap brasileiro", "hip hop brasileiro", "funk brasileiro", "pagode", "samba", "forró",
  "piseiro", "arrocha", "brega", "axé", "reggae brasileiro", "música eletrônica brasileira", "indie brasileiro",
  "jazz brasileiro", "música clássica brasileira", "bossa nova", "música infantil", "música regional brasileira",
  // Gêneros internacionais
  "pop", "rock", "alternative rock", "indie pop", "indie rock", "hip hop", "rap", "R&B", "soul", "funk music",
  "country", "folk", "blues", "jazz", "classical", "metal", "heavy metal", "punk rock", "reggae", "ska",
  "electronic", "EDM", "house", "techno", "trance", "disco", "dance", "latin", "reggaeton", "salsa",
  "bachata", "merengue", "tango", "K-pop", "J-pop", "Afrobeats", "gospel music", "soundtrack", "musical theatre",
  // Artistas brasileiros
  "Chitãozinho Xororó", "Zezé Di Camargo Luciano", "Jorge Mateus", "Henrique Juliano", "Maiara Maraisa",
  "Marília Mendonça", "Gusttavo Lima", "Luan Santana", "Ana Castela", "Zé Neto Cristiano", "João Gomes",
  "Wesley Safadão", "Luísa Sonza", "Anitta", "Ludmilla", "Ivete Sangalo", "Claudia Leitte", "Roberto Carlos",
  "Erasmo Carlos", "Gilberto Gil", "Caetano Veloso", "Chico Buarque", "Djavan", "Marisa Monte", "Gal Costa",
  "Elis Regina", "Tim Maia", "Raul Seixas", "Legião Urbana", "Capital Inicial", "Charlie Brown Jr",
  "Skank", "Titãs", "Paralamas do Sucesso", "Racionais MC's", "Emicida", "Criolo", "Seu Jorge", "Alcione",
  "Zeca Pagodinho", "Beth Carvalho", "Alok", "Padre Marcelo Rossi", "Aline Barros", "Fernandinho",
  "Gabriela Rocha", "Anderson Freire", "Diante do Trono", "Isadora Pompeo",
  // Artistas internacionais
  "The Beatles", "Taylor Swift", "The Weeknd", "Drake", "Billie Eilish", "Adele", "Ed Sheeran", "Dua Lipa",
  "Beyonce", "Rihanna", "Lady Gaga", "Bruno Mars", "Michael Jackson", "Elvis Presley", "Queen", "Coldplay",
  "Imagine Dragons", "Eminem", "Kendrick Lamar", "Kanye West", "SZA", "Ariana Grande", "Justin Bieber",
  "Madonna", "Whitney Houston", "Mariah Carey", "ABBA", "Bob Marley", "Metallica", "Nirvana", "Linkin Park",
  "Pink Floyd", "The Rolling Stones", "David Bowie", "Frank Sinatra", "Lana Del Rey", "Olivia Rodrigo",
  "Sabrina Carpenter", "Chappell Roan", "Post Malone", "Shakira", "Bad Bunny", "BTS", "BLACKPINK"
];

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
  cachedCatalog = [...merged.values()].slice(-50000);
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
  if (req.method === "GET" && url.pathname === "/api/music-search") {
    const q = (url.searchParams.get("q") || "").trim().slice(0, 120);
    if (q.length < 2) return json(res, 400, { error: "Digite pelo menos duas letras para pesquisar." });
    try {
      const lookup = new URL("https://itunes.apple.com/search");
      lookup.searchParams.set("term", q);
      lookup.searchParams.set("entity", "song");
      const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
      lookup.searchParams.set("limit", "50");
      lookup.searchParams.set("offset", String((page - 1) * 50));
      lookup.searchParams.set("country", "BR");
      const response = await fetch(lookup, { headers: { "User-Agent": USER_AGENT, "Accept": "application/json" }, signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error(`Pesquisa musical respondeu HTTP ${response.status}.`);
      const payload = await response.json();
      let items = (payload.results || []).map((track) => ({
        id: `itunes-${track.trackId}`,
        title: track.trackName || "Faixa sem título",
        artist: track.artistName || "Artista desconhecido",
        album: track.collectionName || "",
        genre: track.primaryGenreName || "",
        releaseDate: track.releaseDate || "",
        provider: "iTunes",
        artworkUrl: (track.artworkUrl100 || "").replace("100x100bb", "300x300bb"),
        providerUrl: track.trackViewUrl || "",
        previewUrl: track.previewUrl || "",
        lyricsAvailable: false,
        duration: track.trackTimeMillis ? Math.round(track.trackTimeMillis / 1000) : null
      }));
      // If Apple's catalog returns no matching tracks, search MusicBrainz for recordings.
      let source = "Apple/iTunes";
      if (!items.length && page === 1) {
        const mbUrl = new URL("https://musicbrainz.org/ws/2/recording");
        mbUrl.searchParams.set("query", q);
        mbUrl.searchParams.set("fmt", "json");
        mbUrl.searchParams.set("limit", "50");
        mbUrl.searchParams.set("offset", "0");
        const mbResponse = await fetch(mbUrl, { headers: { "User-Agent": "SomELetra/1.0 (music catalog search)", "Accept": "application/json" }, signal: AbortSignal.timeout(12000) });
        if (mbResponse.ok) {
          const mb = await mbResponse.json();
          items = (mb.recordings || []).map((recording) => ({
            id: `mb-${recording.id}`,
            title: recording.title || "Faixa sem título",
            artist: (recording["artist-credit"] || []).map((credit) => typeof credit === "string" ? credit : credit.name || credit.artist?.name || "").join(""),
            album: (recording.releases || [])[0]?.title || "",
            genre: (recording.tags || []).slice(0, 2).map((tag) => tag.name).join(", "),
            releaseDate: recording["first-release-date"] || "",
            provider: "MusicBrainz",
            artworkUrl: "",
            providerUrl: `https://musicbrainz.org/recording/${recording.id}`,
            previewUrl: "",
            lyricsAvailable: false,
            duration: recording.length ? Math.round(recording.length / 1000) : null
          }));
          source = "MusicBrainz";
        }
      }
      const total = payload.resultCount || items.length;
      return json(res, 200, { items, total, page, limit: 50, hasMore: items.length === 50, source: items.length && items[0].provider === "MusicBrainz" ? "MusicBrainz" : source, query: q });
    } catch (error) {
      return json(res, 502, { error: error.message || "Não foi possível pesquisar o catálogo musical.", items: [] });
    }
  }
  if (req.method === "GET" && url.pathname === "/api/artwork") {
    const q = (url.searchParams.get("q") || "").trim().slice(0, 180);
    if (!q) return json(res, 400, { error: "Informe o nome da música ou artista." });
    try {
      const lookup = new URL("https://itunes.apple.com/search");
      lookup.searchParams.set("term", q);
      lookup.searchParams.set("entity", "song");
      lookup.searchParams.set("limit", "1");
      lookup.searchParams.set("country", "BR");
      const response = await fetch(lookup, { headers: { "User-Agent": USER_AGENT, "Accept": "application/json" }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`Serviço de capas respondeu HTTP ${response.status}.`);
      const payload = await response.json();
      const match = payload.results?.[0];
      return json(res, 200, { artworkUrl: match?.artworkUrl100?.replace("100x100bb", "300x300bb") || "", title: match?.trackName || "", artist: match?.artistName || "", source: "iTunes Search API" });
    } catch (error) {
      return json(res, 502, { error: error.message || "Não foi possível buscar a capa." , artworkUrl: "" });
    }
  }
  if (req.method === "GET" && url.pathname === "/api/charts") {
    const country = (url.searchParams.get("country") || "br").toLowerCase();
    const storefront = country === "international" || country === "us" ? "us" : "br";
    try {
      const response = await fetch(`https://rss.applemarketingtools.com/api/v2/${storefront}/music/most-played/20/songs.json`, {
        headers: { "User-Agent": USER_AGENT, "Accept": "application/json" },
        signal: AbortSignal.timeout(12000)
      });
      if (!response.ok) throw new Error(`Apple Music charts respondeu HTTP ${response.status}.`);
      const payload = await response.json();
      const items = (payload.feed?.results || []).slice(0, 20).map((track, index) => ({
        id: track.id || track.url,
        rank: index + 1,
        title: track.name || "Faixa sem título",
        artist: track.artistName || "Artista desconhecido",
        album: track.albumName || "",
        genre: track.genres?.[0]?.name || "Outros",
        genres: (track.genres || []).map((genre) => genre.name),
        artworkUrl: track.artworkUrl100 || "",
        url: track.url || "",
        country: storefront === "br" ? "Nacional" : "Internacional",
        source: "Apple Music Top Songs",
        updatedAt: payload.feed?.updated || new Date().toISOString()
      }));
      return json(res, 200, { country: storefront, items, total: items.length, updatedAt: payload.feed?.updated || new Date().toISOString(), source: "Apple Music Top Songs" });
    } catch (error) {
      return json(res, 502, { error: error.message || "Não foi possível carregar o ranking musical.", items: [], source: "Apple Music Top Songs" });
    }
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
  if (req.method === "GET" && url.pathname === "/api/lyrics/search") {
    const title = (url.searchParams.get("title") || "").trim().slice(0, 120);
    const artist = (url.searchParams.get("artist") || "").trim().slice(0, 120);
    if (!title && !artist) return json(res, 400, { error: "Informe o título ou o artista." });
    try {
      const q = [title, artist].filter(Boolean).join(" ");
      const results = await lrclib("/api/search", { q });
      if (!Array.isArray(results) || !results.length) return json(res, 404, { error: "Não encontramos letra disponível para esta música." });
      const norm = (value) => String(value || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\\s+/g, " ").trim();
      const exact = results.find((item) => norm(item.trackName) === norm(title) && (!artist || norm(item.artistName).includes(norm(artist)) || norm(artist).includes(norm(item.artistName))));
      const match = exact || results.find((item) => norm(item.trackName).includes(norm(title)) && (!artist || norm(item.artistName).includes(norm(artist)))) || results[0];
      const detail = await lrclib("/api/get/" + encodeURIComponent(match.id));
      const lyrics = detail.plainLyrics || detail.syncedLyrics || "";
      if (!lyrics) return json(res, 404, { error: "Encontramos a faixa, mas a fonte não disponibiliza a letra." });
      return json(res, 200, { lyrics, provider: "LRCLIB", trackName: detail.trackName || match.trackName, artistName: detail.artistName || match.artistName, instrumental: Boolean(detail.instrumental) });
    } catch (error) {
      return json(res, error.status === 429 ? 429 : 502, { error: error.message || "Não foi possível consultar a letra agora.", retryAfter: error.retryAfter || null });
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
