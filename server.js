import http from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");
const dataDir = process.env.DATA_DIR || path.join(root, "data");
const catalogFile = path.join(dataDir, "catalog.json");
const usersFile = path.join(dataDir, "users.json");
const sessionsFile = path.join(dataDir, "sessions.json");
const ticketsFile = path.join(dataDir, "support-tickets.json");
const commentsFile = path.join(dataDir, "song-comments.json");
const chordsFile = path.join(dataDir, "song-chords.json");
const PORT = Number(process.env.PORT || 3000);
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


async function readJsonFile(file, fallback) {
  try { return JSON.parse(await readFile(file, "utf8")); } catch { return fallback; }
}
async function writeJsonFile(file, value) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2), { mode: 0o600 });
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; if (raw.length > 100_000) { reject(new Error("Solicitação muito grande.")); req.destroy(); } });
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error("JSON inválido.")); } });
    req.on("error", reject);
  });
}
function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  return { salt, hash: scryptSync(password, salt, 64).toString("hex") };
}
function passwordMatches(password, user) {
  if (!user || typeof user.salt !== "string" || !user.salt) return false;
  const storedHash = typeof user.passwordHash === "string" ? user.passwordHash : user.hash;
  if (typeof storedHash !== "string" || !/^[a-f0-9]{128}$/i.test(storedHash)) return false;
  try {
    const actual = scryptSync(String(password), user.salt, 64);
    const expected = Buffer.from(storedHash, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}
async function currentUser(req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const sessions = await readJsonFile(sessionsFile, {});
  const session = sessions[token];
  if (!session || session.expiresAt < Date.now()) {
    if (session) { delete sessions[token]; await writeJsonFile(sessionsFile, sessions); }
    return null;
  }
  const users = await readJsonFile(usersFile, []);
  return users.find((user) => user.id === session.userId) || null;
}
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, favorites: user.favorites || [], createdAt: user.createdAt };
}

async function readCatalog() {
  try {
    const parsed = JSON.parse(await readFile(catalogFile, "utf8"));
    cachedCatalog = Array.isArray(parsed.items) ? parsed.items : [];
    lastSearchAt = parsed.lastSearchAt || null;
    // Preserve query rotation across VPS restarts so the collector does not restart at "gospel" every time.
    robotQueryIndex = Number.isInteger(parsed.robotQueryIndex) && parsed.robotQueryIndex >= 0
      ? parsed.robotQueryIndex % ROBOT_QUERIES.length
      : 0;
  } catch { cachedCatalog = []; }
}

async function saveCatalog(items) {
  await mkdir(dataDir, { recursive: true });
  const merged = new Map(cachedCatalog.map((item) => [String(item.id), item]));
  for (const item of items) merged.set(String(item.id), item);
  cachedCatalog = [...merged.values()].slice(-50000);
  lastSearchAt = new Date().toISOString();
  await writeFile(catalogFile, JSON.stringify({ lastSearchAt, robotQueryIndex, items: cachedCatalog }, null, 2), { mode: 0o600 });
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

async function lyricsOvh(title, artist) {
  if (!title || !artist) return null;
  const cleanTitle = (value) => String(value || "")
    .replace(/\s*\[(?:ao vivo|live|acoustic|acústico)[^\]]*\]/ig, "")
    .replace(/\s*\((?:ao vivo|live|acoustic|acústico)[^)]*\)/ig, "")
    .replace(/\s*\((?:feat\.?|ft\.?|part\.?|participação)[^)]*\)/ig, "")
    .replace(/\s*[-–—]\s*(?:ao vivo|live).*$/ig, "")
    .replace(/\s+/g, " ").trim();
  const cleanArtist = (value) => String(value || "")
    .replace(/\s*\[(?:feat\.?|ft\.?|part\.?)[^\]]*\]/ig, "")
    .replace(/\s*\((?:feat\.?|ft\.?|part\.?)[^)]*\)/ig, "").trim();
  const titles = [...new Set([String(title).trim(), cleanTitle(title)].filter(Boolean))];
  const artists = [...new Set([String(artist).trim(), cleanArtist(artist)].filter(Boolean))];
  // Also try featured artists parsed from the track title/artist metadata.
  const featured = String(title + " " + artist).match(/\b(?:feat\.?|ft\.?|part\.?|participação)\s+([^)\]]+)/i)?.[1]?.trim();
  if (featured) artists.push(featured);
  for (const candidateArtist of [...new Set(artists)]) {
    for (const candidateTitle of titles) {
      const url = "https://api.lyrics.ovh/v1/" + encodeURIComponent(candidateArtist) + "/" + encodeURIComponent(candidateTitle);
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": USER_AGENT, "Accept": "application/json" },
          signal: AbortSignal.timeout(8000)
        });
        if (!response.ok) continue;
        const payload = await response.json();
        const lyrics = typeof payload.lyrics === "string" ? payload.lyrics.trim() : "";
        if (lyrics) return { lyrics, provider: "Lyrics.ovh", providerUrl: url };
      } catch {
        // Try the next title/artist variation if this lookup fails.
      }
    }
  }
  return null;
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

function normalizeAppleTrack(track) {
  return {
    id: `apple-${track.trackId}`,
    title: track.trackName || "Faixa sem título",
    artist: track.artistName || "Artista desconhecido",
    album: track.collectionName || "",
    genre: track.primaryGenreName || "",
    releaseDate: track.releaseDate || "",
    explicit: false,
    provider: "Apple Search",
    providerUrl: track.trackViewUrl || "",
    artworkUrl: track.artworkUrl100 || "",
    lyricsAvailable: false,
    duration: Number.isFinite(track.trackTimeMillis) ? Math.round(track.trackTimeMillis / 1000) : null,
    instrumental: false,
    syncedLyricsAvailable: false,
  };
}

async function appleSearchTracks(query) {
  const endpoint = new URL("https://itunes.apple.com/search");
  endpoint.searchParams.set("term", query);
  endpoint.searchParams.set("entity", "song");
  endpoint.searchParams.set("limit", "50");
  const response = await fetch(endpoint, {
    headers: { "User-Agent": USER_AGENT, "Accept": "application/json" },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Apple Search respondeu HTTP ${response.status}.`);
  const payload = await response.json();
  return Array.isArray(payload.results) ? payload.results.map(normalizeAppleTrack).filter((item) =>
    item.title && item.artist && item.title !== "Faixa sem título" && item.artist !== "Artista desconhecido"
  ) : [];
}

const mime = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".svg":"image/svg+xml", ".png":"image/png", ".jpg":"image/jpeg", ".webp":"image/webp", ".ico":"image/x-icon", ".json":"application/json; charset=utf-8", ".xml":"application/xml; charset=utf-8", ".txt":"text/plain; charset=utf-8" };

async function serveStatic(req, res, pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return json(res, 400, { error: "Caminho inválido." }); }
  const safePath = path.normalize(decoded).replace(/^([.][.][/\\\\])+/, "");
  let filePath = path.join(dist, safePath === "/" ? "index.html" : safePath);
  if (!filePath.startsWith(dist)) return json(res, 403, { error: "Acesso negado." });
  if (!existsSync(filePath)) filePath = path.join(dist, "index.html");
  try {
    let body = await readFile(filePath, "utf8");
    // Deliver song-specific metadata in the initial HTML so crawlers can identify each song URL.
    if (decoded.startsWith("/musica/") && path.basename(filePath) === "index.html") {
      const slugifySeo = (value) => String(value || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "musica";
      const slug = decoded.slice("/musica/".length).replace(/\\/$/, "");
      const item = cachedCatalog.find((song) => slugifySeo(song.title) + "-por-" + slugifySeo(song.artist) === slug);
      if (item) {
        const escapeHtml = (value) => String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
        const title = String(item.title || "Música") + " — " + String(item.artist || "Artista") + " | Versos Musicais";
        const description = "Conheça " + String(item.title || "esta música") + ", de " + String(item.artist || "este artista") + ", no Versos Musicais. Consulte informações da faixa e verifique a disponibilidade da letra.";
        const canonical = "https://versosmusicais.com.br/musica/" + slug;
        body = body
          .replace(/<title>[^<]*<\\/title>/i, "<title>" + escapeHtml(title) + "</title>")
          .replace(/<meta name="description" content="[^"]*">/i, '<meta name="description" content="' + escapeHtml(description) + '">')
          .replace(/<link rel="canonical" href="[^"]*">/i, '<link rel="canonical" href="' + canonical + '">')
          .replace(/<meta property="og:title" content="[^"]*">/i, '<meta property="og:title" content="' + escapeHtml(title) + '">')
          .replace(/<meta property="og:description" content="[^"]*">/i, '<meta property="og:description" content="' + escapeHtml(description) + '">')
          .replace(/<meta property="og:type" content="[^"]*">/i, '<meta property="og:type" content="music.song">')
          .replace(/<meta property="og:url" content="[^"]*">/i, '<meta property="og:url" content="' + canonical + '">')
          .replace(/<meta name="twitter:title" content="[^"]*">/i, '<meta name="twitter:title" content="' + escapeHtml(title) + '">')
          .replace(/<meta name="twitter:description" content="[^"]*">/i, '<meta name="twitter:description" content="' + escapeHtml(description) + '">');
        const schema = JSON.stringify({
          "@context": "https://schema.org",
          "@type": "MusicRecording",
          name: String(item.title || ""),
          byArtist: { "@type": "MusicGroup", name: String(item.artist || "") },
          url: canonical,
          inLanguage: "pt-BR",
          mainEntityOfPage: canonical
        }).replace(/</g, "\\u003c");
        body = body.replace("</head>", '<script type="application/ld+json">' + schema + "</script>\\n</head>");
      }
    }
    res.writeHead(200, { "Content-Type": mime[path.extname(filePath)] || "text/html; charset=utf-8", "X-Content-Type-Options": "nosniff" });
    res.end(body);
  } catch { json(res, 503, { error: "A versão web não foi compilada. Execute npm run build." }); }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (req.method === "GET" && url.pathname === "/api/health") {
    return json(res, 200, { ok: true, provider: "LRCLIB", providerConfigured: true, apiKeyRequired: false, catalogItems: cachedCatalog.length, lastSearchAt });
  }

  if (url.pathname === "/api/auth/register" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const name = String(body.name || "").trim().slice(0, 80);
      const email = String(body.email || "").trim().toLowerCase().slice(0, 180);
      const password = String(body.password || "");
      if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10) return json(res, 400, { error: "Informe nome, e-mail válido e senha com pelo menos 10 caracteres." });
      const users = await readJsonFile(usersFile, []);
      if (users.some((user) => user.email === email)) return json(res, 409, { error: "Já existe uma conta com este e-mail." });
      const credentials = hashPassword(password);
      const user = { id: randomBytes(16).toString("hex"), name, email, ...credentials, favorites: [], createdAt: new Date().toISOString() };
      users.push(user); await writeJsonFile(usersFile, users);
      const token = randomBytes(32).toString("hex");
      const sessions = await readJsonFile(sessionsFile, {});
      sessions[token] = { userId: user.id, expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 14 };
      await writeJsonFile(sessionsFile, sessions);
      return json(res, 201, { token, user: publicUser(user) });
    } catch (error) { return json(res, 400, { error: error.message || "Não foi possível criar a conta." }); }
  }
  if (url.pathname === "/api/auth/login" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      const users = await readJsonFile(usersFile, []);
      const user = users.find((item) => item.email === email);
      if (!user || !passwordMatches(String(body.password || ""), user)) return json(res, 401, { error: "E-mail ou senha incorretos." });
      const token = randomBytes(32).toString("hex");
      const sessions = await readJsonFile(sessionsFile, {});
      sessions[token] = { userId: user.id, expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 14 };
      await writeJsonFile(sessionsFile, sessions);
      return json(res, 200, { token, user: publicUser(user) });
    } catch (error) { return json(res, 400, { error: error.message || "Não foi possível entrar." }); }
  }
  if (url.pathname === "/api/auth/me" && req.method === "GET") {
    const user = await currentUser(req);
    return user ? json(res, 200, { user: publicUser(user) }) : json(res, 401, { error: "Faça login para continuar." });
  }
  if (url.pathname === "/api/auth/logout" && req.method === "POST") {
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const sessions = await readJsonFile(sessionsFile, {});
    delete sessions[token]; await writeJsonFile(sessionsFile, sessions);
    return json(res, 200, { ok: true });
  }
  if (url.pathname === "/api/account/favorites" && req.method === "PUT") {
    const user = await currentUser(req);
    if (!user) return json(res, 401, { error: "Faça login para salvar seus favoritos." });
    try {
      const body = await readBody(req);
      const favorites = Array.isArray(body.favorites) ? body.favorites.slice(0, 500).map((item) => ({
        id: String(item.id || "").slice(0, 160), title: String(item.title || "").slice(0, 200),
        artist: String(item.artist || "").slice(0, 200), album: String(item.album || "").slice(0, 200),
        artworkUrl: String(item.artworkUrl || "").startsWith("https://") ? String(item.artworkUrl).slice(0, 1000) : ""
      })).filter((item) => item.id && item.title) : [];
      const users = await readJsonFile(usersFile, []);
      const index = users.findIndex((item) => item.id === user.id);
      users[index].favorites = favorites; await writeJsonFile(usersFile, users);
      return json(res, 200, { favorites });
    } catch (error) { return json(res, 400, { error: error.message || "Não foi possível salvar favoritos." }); }
  }
  if (url.pathname === "/api/chords/generate" && req.method === "POST") {
    return json(res, 410, {
      error: "A geração automática por IA foi desativada para evitar custos. Pesquise uma cifra gratuita e cole os acordes no editor para salvar no catálogo."
    });
  }

  if (url.pathname === "/api/chords" && req.method === "GET") {
    const title = String(url.searchParams.get("title") || "").trim().slice(0, 200);
    const artist = String(url.searchParams.get("artist") || "").trim().slice(0, 200);
    const instrument = String(url.searchParams.get("instrument") || "Violão").trim().slice(0, 40);
    if (!title || !artist) return json(res, 400, { error: "Informe o título da música e o artista." });
    const key = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/\b(?:ao vivo|live|official audio|official video|videoclipe oficial|clipe oficial|lyrics|lyric video|acustico|acoustic|remasterizado|remastered)\b/g, " ")
      .replace(/\s*[-–—|:]\s*(?:ao vivo|live|official audio|official video|lyrics|acustico|acoustic).*$/g, " ")
      .replace(/\b(?:feat|ft|participacao)\b.*$/g, " ")
      .replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
    const chords = await readJsonFile(chordsFile, []);
    const titleKey = key(title), artistKey = key(artist), instrumentKey = key(instrument);
    let chord = chords.find((item) => key(item.title) === titleKey && key(item.artist) === artistKey && key(item.instrument) === instrumentKey) ||
      chords.find((item) => key(item.instrument) === instrumentKey && key(item.title) && key(item.artist) &&
        (key(item.title).includes(titleKey) || titleKey.includes(key(item.title))) &&
        (key(item.artist).includes(artistKey) || artistKey.includes(key(item.artist)))) || null;
    // Adapt guitar-style chord/tab entries into instrument-appropriate study guides.
    // Do not show a guitar tablature unchanged when another instrument is selected.
    if (chord && !["violao", "guitarra"].includes(instrumentKey)) {
      const originalContent = String(chord.content || "");
      const hasGuitarTab = /(?:^|\n)\s*[eEBGDA]\|[-0-9hpb~/\-]{3,}/m.test(originalContent);
      const hasSectionedChordSheet = /\[(?:intro|verse|verso|chorus|refr[aã]o|bridge|ponte|solo)/i.test(originalContent);
      if (hasGuitarTab || hasSectionedChordSheet) {
        const chordNames = [...new Set((originalContent.match(/\b[A-G](?:#|b)?(?:m|min|maj|sus|dim|aug|add)?[0-9]?(?:\/[A-G](?:#|b)?)?\b/g) || [])
          .filter((name) => !/^(?:E|B|G|D|A)$/i.test(name) || !hasGuitarTab))].slice(0, 32);
        const sections = [...originalContent.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1]).slice(0, 12);
        let adapted = [];
        if (instrumentKey === "baixo") {
          adapted = [
            "GUIA DE BAIXO DERIVADO DOS ACORDES DISPONÍVEIS",
            "Use as fundamentais abaixo como ponto de partida; não é uma transcrição oficial da linha original.",
            "NOTAS-GUIA: " + (chordNames.length ? chordNames.map((name) => name.replace(/m(?:in)?|maj|sus|dim|aug|add|[0-9]/g, "").split("/")[0]).join(" · ") : "acordes não identificados"),
            "Pratique uma fundamental por mudança de acorde; acrescente oitavas e aproximações apenas se soarem bem."
          ];
        } else if (instrumentKey === "bateria") {
          adapted = [
            "GUIA RÍTMICO DE BATERIA · ESTUDO SUGERIDO",
            "Os acordes da música não determinam a bateria original; este é um arranjo de estudo, não uma transcrição.",
            "COMPASSO SUGERIDO: 4/4",
            "ESTROFE: chimbal fechado em colcheias, bumbo leve e caixa nos tempos 2 e 4.",
            "REFRÃO: aumente a intensidade, bumbo firme, caixa nos tempos 2 e 4 e prato nas entradas.",
            "PONTE / FINAL: reduza a dinâmica e faça uma virada curta para a retomada."
          ];
        } else if (instrumentKey === "teclado" || instrumentKey === "piano") {
          adapted = [
            "GUIA DE TECLADO/PIANO DERIVADO DOS ACORDES DISPONÍVEIS",
            "ACORDES IDENTIFICADOS: " + (chordNames.join(" · ") || "não identificados"),
            "MÃO ESQUERDA: toque a fundamental ou oitavas.",
            "MÃO DIREITA: monte tríades e inversões dos acordes identificados; mantenha notas comuns entre mudanças.",
            "Este guia é uma adaptação de estudo, não uma transcrição oficial do arranjo."
          ];
        } else if (instrumentKey === "ukulele") {
          adapted = [
            "GUIA DE UKULELE DERIVADO DOS ACORDES DISPONÍVEIS",
            "ACORDES A CONFERIR: " + (chordNames.join(" · ") || "não identificados"),
            "Use formas de acorde compatíveis com a afinação G-C-E-A. Algumas inversões de guitarra podem precisar ser simplificadas.",
            "BATIDA SUGERIDA: ↓ ↓↑ ↑↓↑, começando devagar.",
            "Este guia precisa ser conferido com a versão da música."
          ];
        }
        if (adapted.length) {
          chord = { ...chord, instrument, content: [
            "GUIA ADAPTADO PARA " + instrument.toUpperCase() + " — " + chord.title + " / " + chord.artist,
            ...adapted,
            sections.length ? "SEÇÕES DETECTADAS NA REFERÊNCIA: " + sections.join(" · ") : "",
            "Aviso: material de estudo derivado da referência disponível; não garante reproduzir exatamente a gravação."
          ].filter(Boolean).join("\n"), source: "guia-adaptado-de-referencia" };
        }
      }
    }
    let externalMatches = [];
    const providerDiagnostics = { local: chord ? "found" : "empty", cifraClub: "not_tried", ultimateGuitar: "not_tried", songsterr: "not_tried" };
    // Try the community Cifra Club adapter with slug and original-text variants.
    // This adapter is unofficial; accept only actual chord text and reject unrelated results.
    if (!chord) {
      providerDiagnostics.cifraClub = "no_match";
      const slug = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().replace(/&/g, " e ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
      const candidates = [
        { artist: slug(artist), song: slug(title) },
        { artist: artist.trim(), song: title.trim() },
        { artist: slug(artist), song: title.trim() },
        { artist: artist.trim(), song: slug(title) }
      ];
      const tried = new Set();
      for (const candidate of candidates) {
        const candidateKey = candidate.artist + "|" + candidate.song;
        if (tried.has(candidateKey)) continue;
        tried.add(candidateKey);
        try {
          const sourceUrl = new URL("https://cifraclub-api.vercel.app/api/cifra");
          sourceUrl.searchParams.set("artist", candidate.artist);
          sourceUrl.searchParams.set("song", candidate.song);
          const response = await fetch(sourceUrl, {
            headers: { "User-Agent": USER_AGENT, "Accept": "application/json" },
            signal: AbortSignal.timeout(7000)
          });
          if (!response.ok) continue;
          const payload = await response.json();
          const records = [payload, payload?.data, payload?.result, payload?.cifraData].filter(Boolean);
          let matched = null;
          for (const record of records) {
            const raw = record?.cifra ?? record?.chords ?? record?.content ?? record?.tabs ?? record?.lyrics;
            const content = Array.isArray(raw) ? raw.map((line) => {
              if (typeof line === "string") return line;
              if (line && typeof line === "object") return [line.chord, line.text, line.lyric].filter(Boolean).join(" ");
              return "";
            }).join("\n") : typeof raw === "string" ? raw : "";
            const returnedTitle = String(record?.name || record?.title || title).slice(0, 200);
            const returnedArtist = String(record?.artist?.name || record?.artist || artist).slice(0, 160);
            const titleMatch = key(returnedTitle) === titleKey || key(returnedTitle).includes(titleKey) || titleKey.includes(key(returnedTitle));
            const artistMatch = key(returnedArtist) === artistKey || key(returnedArtist).includes(artistKey) || artistKey.includes(key(returnedArtist));
            if (content.trim() && content.length <= 30000 && titleMatch && artistMatch) {
              matched = {
                id: "cifraclub-api-" + slug(returnedArtist) + "-" + slug(returnedTitle),
                title: returnedTitle,
                artist: returnedArtist,
                instrument,
                content: content.trim(),
                source: "Cifra Club (adaptador comunitário)",
                sourceUrl: record?.cifraclub_url || record?.url || "https://www.cifraclub.com.br/" + slug(returnedArtist) + "/" + slug(returnedTitle) + "/",
                updatedAt: new Date().toISOString()
              };
              break;
            }
          }
          if (matched) { chord = matched; providerDiagnostics.cifraClub = "found"; break; }
        } catch (error) { providerDiagnostics.cifraClub = "error: " + String(error?.message || error).slice(0, 120); /* Try another query variant before falling back to external sources. */ }
      }
    }
    // Second content provider: Ultimate Guitar community scraper package.
    // It is best-effort because the upstream website can block requests or change its format.
    if (!chord) {
      providerDiagnostics.ultimateGuitar = "no_match";
      try {
        const ugModule = await import("ultimate-guitar");
        const guitarFactory = ugModule.guitar || ugModule.default?.guitar;
        if (typeof guitarFactory === "function") {
          const ug = guitarFactory();
          const category = ug.category?.CHORDS ?? 300;
          const result = await Promise.race([
            ug.search(title, artist, category),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Ultimate Guitar search timeout")), 9000))
          ]);
          const results = Array.isArray(result?.responses) ? result.responses : [];
          providerDiagnostics.ultimateGuitar = results.length ? "search_results:" + results.length : "no_search_results";
          const slugUG = (value) => key(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
          const titleTokens = key(title).split(" ").filter(Boolean);
          const artistTokens = key(artist).split(" ").filter(Boolean);
          const overlap = (tokens, candidate) => tokens.length ? tokens.filter((token) => key(candidate).split(" ").includes(token)).length / tokens.length : 0;
          const candidates = results.filter((item) => {
            const candidateTitle = item.song_name || item.songName || item.title || "";
            const candidateArtist = item.artist_name || item.artistName || item.band_name || "";
            return overlap(titleTokens, candidateTitle) >= 0.6 && overlap(artistTokens, candidateArtist) >= 0.3 && (item.tab_url || item.url);
          }).slice(0, 5);
          for (const candidate of candidates) {
            try {
              const detail = await Promise.race([
                ug.fetch(candidate),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Ultimate Guitar fetch timeout")), 9000))
              ]);
              const body = detail?.response ?? detail?.contentText ?? detail?.content ?? detail?.tab?.contentText ?? "";
              const content = typeof body === "string" ? body.trim() : Array.isArray(body) ? body.map(String).join("\n").trim() : "";
              const candidateTitle = String(candidate.song_name || candidate.songName || candidate.title || title).slice(0, 200);
              const candidateArtist = String(candidate.artist_name || candidate.artistName || candidate.band_name || artist).slice(0, 160);
              const candidateTitleTokens = key(candidateTitle).split(" ").filter(Boolean);
              const candidateArtistTokens = key(candidateArtist).split(" ").filter(Boolean);
              const titleSimilarity = titleTokens.length ? titleTokens.filter((token) => candidateTitleTokens.includes(token)).length / titleTokens.length : 0;
              const artistSimilarity = artistTokens.length ? artistTokens.filter((token) => candidateArtistTokens.includes(token)).length / artistTokens.length : 0;
              // UG titles often append "(chords)", "chords", version labels, or arrangement names.
              // Use token overlap instead of strict equality so valid chord pages aren't discarded.
              if (content.length > 20 && content.length <= 30000 && titleSimilarity >= 0.75 && artistSimilarity >= 0.5) {
                chord = {
                  id: "ultimate-guitar-" + String(candidate.id || slugUG(candidateArtist) + "-" + slugUG(candidateTitle)),
                  title: candidateTitle,
                  artist: candidateArtist,
                  instrument,
                  content,
                  source: "Ultimate Guitar",
                  sourceUrl: candidate.tab_url || candidate.url || "https://www.ultimate-guitar.com/",
                  updatedAt: new Date().toISOString()
                };
                providerDiagnostics.ultimateGuitar = "found";
                break;
              }
            } catch (error) { providerDiagnostics.ultimateGuitar = "detail_error: " + String(error?.message || error).slice(0, 120); /* Try the next matching Ultimate Guitar entry. */ }
          }
        }
      } catch (error) { providerDiagnostics.ultimateGuitar = "error: " + String(error?.message || error).slice(0, 120); /* Keep the Cifra Club and external search fallbacks available. */ }
    }
    // Search providers automatically when no complete chord content was returned.
    if (!chord) {
      const query = `${title} ${artist}`.slice(0, 180);
      console.info("[chords] provedores externos sem conteúdo; verificando referências internas", JSON.stringify({ title, artist, instrument, providers: providerDiagnostics }));
      const encodedQuery = encodeURIComponent(query);
      const providerLinks = [
        { title: "Cifra Club", artist, instrumentTracks: [instrument], url: `https://www.cifraclub.com.br/?q=${encodedQuery}`, provider: "Cifra Club" },
        { title: "Ultimate Guitar", artist, instrumentTracks: [instrument], url: `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodedQuery}`, provider: "Ultimate Guitar" },
        { title: "Songsterr", artist, instrumentTracks: [instrument], url: `https://www.songsterr.com/?pattern=${encodedQuery}`, provider: "Songsterr" },
        { title: "Pesquisa na web", artist, instrumentTracks: [instrument], url: `https://www.google.com/search?q=${encodeURIComponent(query + " cifra acordes " + instrument)}`, provider: "Pesquisa na web" }
      ];
      try {
        const response = await fetch(`https://www.songsterr.com/api/songs?pattern=${encodedQuery}`, {
          headers: { "User-Agent": USER_AGENT, "Accept": "application/json" },
          signal: AbortSignal.timeout(7000)
        });
        if (response.ok) {
          const payload = await response.json();
          providerDiagnostics.songsterr = "response_received";
          const items = Array.isArray(payload) ? payload : Array.isArray(payload?.songs) ? payload.songs : [];
          const normalizeMatch = (value) => key(value).split(" ").filter(Boolean);
          const titleTokens = normalizeMatch(title);
          const artistTokens = normalizeMatch(artist);
          const scored = items.map((item) => {
            const resultTitle = String(item.title || item.name || "Faixa sem título").slice(0, 200);
            const resultArtist = String(item.artist?.name || item.artistName || item.artist || "Artista não informado").slice(0, 160);
            const resultTitleTokens = normalizeMatch(resultTitle);
            const resultArtistTokens = normalizeMatch(resultArtist);
            const titleOverlap = titleTokens.filter((token) => resultTitleTokens.includes(token)).length / Math.max(1, titleTokens.length);
            const artistOverlap = artistTokens.filter((token) => resultArtistTokens.includes(token)).length / Math.max(1, artistTokens.length);
            const exactTitle = key(resultTitle) === key(title);
            const exactArtist = key(resultArtist) === key(artist);
            return { item, resultTitle, resultArtist, score: (exactTitle ? 3 : titleOverlap) + (exactArtist ? 2 : artistOverlap), titleOverlap, artistOverlap };
          }).filter((match) => match.titleOverlap >= 0.6 && match.artistOverlap >= 0.3)
            .sort((a, b) => b.score - a.score).slice(0, 5);
          externalMatches = scored.map(({ item, resultTitle, resultArtist }) => {
            const tracks = Array.isArray(item.tracks) ? item.tracks.map((track) => String(track.instrument || track.name || "")).filter(Boolean).slice(0, 8) : [];
            return { title: resultTitle, artist: resultArtist, instrumentTracks: tracks,
              url: "https://www.songsterr.com/?pattern=" + encodeURIComponent(resultTitle + " " + resultArtist), provider: "Songsterr" };
          });
          providerDiagnostics.songsterr = "matches:" + externalMatches.length;
        } else { providerDiagnostics.songsterr = "http_" + response.status; }
      } catch (error) { providerDiagnostics.songsterr = "error: " + String(error?.message || error).slice(0, 120); /* Provider links below remain available if the API is offline. */ }
      const seenUrls = new Set(externalMatches.map((item) => item.url));
      externalMatches.push(...providerLinks.filter((item) => !seenUrls.has(item.url)));
    }
    // Small, locally hosted starter catalog: chord progressions only (no copyrighted lyrics).
    // The page stays on Site Músicas and does not redirect users to a search engine.
    const normalizedTitle = key(title);
    const normalizedArtist = key(artist);
    if (!chord && (normalizedTitle.includes("ah jesus") || normalizedTitle.includes("coracao igual ao teu"))) {
      const instrumentContent = {
        "Violão": [
          "INSTRUMENTO: VIOLÃO · TOM G",
          "INTRO: C  G/B  Am7",
          "ESTROFE: G  D/F#  Em  C (repetir)",
          "PRÉ-REFRÃO: Am  Em  C  D",
          "REFRÃO: G  G/B  C  D (repetir) · Bm  Em  Bm  Em · Am  G/B  C  D  G",
          "FINAL: C  G/B  Am7",
          "",
          "POSIÇÕES: G (320003), D/F# (200232), Em (022000), C (x32010), Am (x02210), G/B (x20033), D (xx0232), Bm (x24432), Am7 (x02010).",
          "BATIDA DE ESTUDO: ↓ ↓↑ ↑↓↑. Experimente dedilhado na introdução."
        ],
        "Guitarra": [
          "INSTRUMENTO: GUITARRA · ARRANJO DE BASE",
          "INTRO: arpejo limpo em C → G/B → Am7",
          "ESTROFE: G5/G → D/F# → Em → C; toque leve e com espaço.",
          "PRÉ-REFRÃO: Am → Em → C → D; aumente gradualmente a intensidade.",
          "REFRÃO: G → G/B → C → D; base mais aberta, com acentos regulares.",
          "PONTE: Bm → Em (alternando); volte para Am → G/B → C → D → G.",
          "TIMBRE SUGERIDO: clean com reverb leve ou drive suave no refrão. A cifra é harmônica simplificada, não uma transcrição da guitarra gravada."
        ],
        "Teclado": [
          "INSTRUMENTO: TECLADO · GUIA DE MÃOS",
          "INTRO: mão direita C-E-G | B-D-G | A-C-E-G; mão esquerda C | B | A.",
          "ESTROFE: G (B-D-G) → D/F# (A-D-F#) → Em (G-B-E) → C (G-C-E).",
          "PRÉ-REFRÃO: Am (A-C-E) → Em (G-B-E) → C (G-C-E) → D (A-D-F#).",
          "REFRÃO: G (B-D-G) → G/B (B-D-G) → C (C-E-G) → D (A-D-F#).",
          "MÃO ESQUERDA: toque as fundamentais G, F#, E, C; no G/B, toque B. Use inversões próximas para facilitar as trocas.",
          "Sugestão de estudo: arpejos na introdução e acordes sustentados no refrão."
        ],
        "Piano": [
          "INSTRUMENTO: PIANO · VOICINGS",
          "INTRO: C (C-E-G) → G/B (B-D-G) → Am7 (A-C-E-G).",
          "ESTROFE: G (G-B-D) → D/F# (F#-A-D) → Em (E-G-B) → C (C-E-G).",
          "PRÉ-REFRÃO: Am (A-C-E) → Em (E-G-B) → C (C-E-G) → D (D-F#-A).",
          "REFRÃO: use tríades próximas G → G/B → C → D; depois Bm (B-D-F#) ↔ Em (E-G-B).",
          "MÃO ESQUERDA: fundamentais ou oitavas; MÃO DIREITA: tríades/inversões. Evite saltos grandes e mantenha a dinâmica suave nas estrofes."
        ],
        "Baixo": [
          "INSTRUMENTO: BAIXO · LINHA DE NOTAS-GUIA (não cifra para violão)",
          "INTRO: C | B | A",
          "ESTROFE: G | F# | E | C (repetir)",
          "PRÉ-REFRÃO: A | E | C | D",
          "REFRÃO: G | B | C | D · G | B | C | D",
          "PONTE: B | E | B | E",
          "FINAL: A | B | C | D | G",
          "Toque uma nota fundamental por mudança de acorde; experimente oitavas e aproximações apenas quando combinarem com o arranjo. Não há transcrição oficial da linha de baixo."
        ],
        "Bateria": [
          "INSTRUMENTO: BATERIA · GUIA RÍTMICO (sem cifras harmônicas)",
          "COMPASSO SUGERIDO: 4/4",
          "INTRODUÇÃO: chimbal fechado suave; sem viradas, deixe espaço para a música começar.",
          "ESTROFE: chimbal em colcheias; bumbo nos tempos 1 e 3; caixa nos tempos 2 e 4, com dinâmica baixa.",
          "PRÉ-REFRÃO: aumente gradualmente a intensidade e abra um pouco o chimbal.",
          "REFRÃO: bumbo mais presente, caixa firme nos tempos 2 e 4 e prato nos inícios de frase.",
          "PONTE: reduza a dinâmica e faça uma virada curta para retornar ao refrão.",
          "FINAL: acompanhe o encerramento e finalize junto com a banda.",
          "Este é um exercício rítmico sugerido, não uma transcrição da bateria original."
        ],
        "Ukulele": [
          "INSTRUMENTO: UKULELE · AFINAÇÃO G-C-E-A",
          "INTRO: C (0003) → G/B (0232, versão simplificada G) → Am7 (0000).",
          "ESTROFE: G (0232) → D (2220, simplifique D/F#) → Em (0432) → C (0003).",
          "PRÉ-REFRÃO: Am (2000) → Em (0432) → C (0003) → D (2220).",
          "REFRÃO: G (0232) → G (0232) → C (0003) → D (2220); Bm (4222) ↔ Em (0432).",
          "BATIDA DE ESTUDO: ↓ ↓↑ ↑↓↑; mantenha a mão direita leve nas estrofes."
        ]
      };
      const progressions = [
        "AH, JESUS / CORAÇÃO IGUAL AO TEU — Julliany Souza",
        "Guia simplificado específico para o instrumento selecionado. Tom de referência: G.",
        "",
        ...(instrumentContent[instrument] || instrumentContent["Violão"]),
        "",
        "Aviso: guia de estudo sugerido, sem letra e sem pretensão de reproduzir exatamente o arranjo gravado.",
        "Referência para conferência: https://www.cifraclub.com.br/julliany-souza/ah-jesus-coracao-igual-ao-teu-2-2/"
      ].join("\n");
      chord = {
        id: "builtin-ah-jesus-coracao-igual-ao-teu",
        title: "Ah, Jesus / Coração Igual Ao Teu",
        artist: "Julliany Souza",
        instrument,
        content: progressions,
        source: "catalogo-interno-referencia",
        updatedAt: "2026-10-21T00:00:00.000Z"
      };
    }
    // Local chord-only reference for a common song whose external providers often return empty results.
    // It intentionally contains no lyrics and is labelled as a simplified study arrangement.
    if (!chord && normalizedTitle.includes("ressuscita me") && normalizedArtist.includes("aline barros")) {
      const instrumentGuides = {
        "Violão": [
          "INSTRUMENTO: VIOLÃO · REFERÊNCIA SIMPLIFICADA · TOM D",
          "INTRO: C6  G/B  Bb6  D  A",
          "ESTROFE: D  A  Bm  G (repetir)",
          "PASSAGEM: G  D/F#  Em  Em/D#  Em/D  C#m7(b5)  G",
          "PRÉ-REFRÃO: D  A/C#  Bm  Bm/A  G  D/F#  Em  A  A4",
          "REFRÃO: D  A  Bm  G  D/F#  G  A  C9  G/B  A  D",
          "PONTE: D  A/C#  Bm  G (repetir)",
          "FINAL / SUBIDA: E  B  C#m  A  E/G#  A  B  D  A/C#  E",
          "ACORDES SIMPLIFICADOS: D (xx0232), A (x02220), Bm (x24432), G (320003), Em (022000), C (x32010)."
        ],
        "Guitarra": [
          "INSTRUMENTO: GUITARRA · BASE SIMPLIFICADA · TOM D",
          "INTRO: C6  G/B  Bb6  D  A",
          "ESTROFE: D  A  Bm  G (repetir)",
          "PRÉ-REFRÃO: D  A/C#  Bm  Bm/A  G  D/F#  Em  A  A4",
          "REFRÃO: D  A  Bm  G  D/F#  G  A  C9  G/B  A  D",
          "PONTE: D  A/C#  Bm  G (repetir)",
          "DINÂMICA: comece limpo nas estrofes; abra a base no refrão. Use D5, A5, B5 e G5 se preferir power chords."
        ],
        "Teclado": [
          "INSTRUMENTO: TECLADO · TOM D",
          "INTRO: C6  G/B  Bb6  D  A",
          "ESTROFE: D  A  Bm  G (repetir)",
          "PRÉ-REFRÃO: D  A/C#  Bm  Bm/A  G  D/F#  Em  A  A4",
          "REFRÃO: D  A  Bm  G  D/F#  G  A  C9  G/B  A  D",
          "PONTE: D  A/C#  Bm  G (repetir)",
          "MÃO ESQUERDA: toque a fundamental ou a inversão indicada após a barra. MÃO DIREITA: tríades e extensões (C6, A4, C9) conforme seu nível."
        ],
        "Piano": [
          "INSTRUMENTO: PIANO · TOM D",
          "INTRO: C6  G/B  Bb6  D  A",
          "ESTROFE: D  A  Bm  G (repetir)",
          "PRÉ-REFRÃO: D  A/C#  Bm  Bm/A  G  D/F#  Em  A  A4",
          "REFRÃO: D  A  Bm  G  D/F#  G  A  C9  G/B  A  D",
          "PONTE: D  A/C#  Bm  G (repetir)",
          "SUGESTÃO: mão esquerda nas fundamentais; mão direita em tríades/inversões. A sequência é uma referência de estudo simplificada."
        ],
        "Baixo": [
          "INSTRUMENTO: BAIXO · TOM D",
          "INTRO: C  B  Bb  D  A",
          "ESTROFE: D  A  B  G (repetir)",
          "PRÉ-REFRÃO: D  C#  B  A  G  F#  E  A",
          "REFRÃO: D  A  B  G  F#  G  A  C  B  A  D",
          "PONTE: D  C#  B  G (repetir)",
          "ESTUDO: pratique primeiro as fundamentais no tempo; acrescente aproximações cromáticas apenas se combinar com a banda."
        ],
        "Bateria": [
          "INSTRUMENTO: BATERIA · GUIA RÍTMICO DE ESTUDO",
          "ESTROFE: groove leve em 4/4, chimbal fechado, caixa nos tempos 2 e 4, bumbo econômico.",
          "PRÉ-REFRÃO: aumente gradualmente a intensidade e abra o chimbal no final das frases.",
          "REFRÃO: groove pop/adoração em 4/4 com bumbo firme, caixa nos tempos 2 e 4 e crash na entrada.",
          "PONTE: reduza a dinâmica e construa a volta para o refrão.",
          "Observação: guia rítmico sugerido, não uma transcrição da gravação."
        ],
        "Ukulele": [
          "INSTRUMENTO: UKULELE · VERSÃO SIMPLIFICADA · TOM D",
          "INTRO: C  G  Bb  D  A (Bb pode ser omitido para iniciantes)",
          "ESTROFE: D  A  Bm  G (repetir)",
          "PRÉ-REFRÃO: D  A  Bm  G  A",
          "REFRÃO: D  A  Bm  G  D  G  A  D",
          "PONTE: D  A  Bm  G (repetir)",
          "BATIDA DE ESTUDO: ↓ ↓↑ ↑↓↑; use Bm simplificado se necessário."
        ]
      };
      const instrumentKey = key(instrument);
      const instrumentAliases = {
        "violao": "Violão",
        "guitarra": "Guitarra",
        "teclado": "Teclado",
        "piano": "Piano",
        "baixo": "Baixo",
        "bateria": "Bateria",
        "ukulele": "Ukulele"
      };
      const selectedInstrument = instrumentAliases[instrumentKey] || "Violão";
      const selectedGuide = instrumentGuides[selectedInstrument] || instrumentGuides["Violão"];
      chord = {
        id: "builtin-ressuscita-me-aline-barros-" + instrumentKey,
        title: "Ressuscita-me",
        artist: "Aline Barros",
        instrument: selectedInstrument,
        content: [
          "REFERÊNCIA INTERNA SIMPLIFICADA · RESSUSCITA-ME — ALINE BARROS",
          ...selectedGuide,
          "",
          "Aviso: guia de acordes para estudo, sem letra e sem pretensão de reproduzir exatamente a gravação ao vivo.",
          "Fonte para conferir a versão completa: https://www.cifraclub.com.br/aline-barros/ressuscita-me/"
        ].join("\n"),
        source: "catalogo-interno-referencia",
        updatedAt: new Date().toISOString()
      };
    }
    return json(res, 200, { chord, externalMatches, diagnostics: providerDiagnostics, total: chords.length + (chord?.source === "catalogo-interno-referencia" ? 1 : 0) });
  }
  if (url.pathname === "/api/chords" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const title = String(body.title || "").trim().slice(0, 200);
      const artist = String(body.artist || "").trim().slice(0, 200);
      const instrument = String(body.instrument || "Violão").trim().slice(0, 40);
      const content = String(body.content || "").trim().slice(0, 12000);
      if (!title || !artist || !content || content.length < 3) return json(res, 400, { error: "Informe música, artista e uma cifra com pelo menos 3 caracteres." });
      const allowedInstruments = ["Violão", "Guitarra", "Teclado", "Piano", "Baixo", "Bateria", "Ukulele"];
      if (!allowedInstruments.includes(instrument)) return json(res, 400, { error: "Instrumento não reconhecido." });
      const key = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const chords = await readJsonFile(chordsFile, []);
      const index = chords.findIndex((item) => key(item.title) === key(title) && key(item.artist) === key(artist) && key(item.instrument) === key(instrument));
      const chord = { id: index >= 0 ? chords[index].id : randomBytes(12).toString("hex"), title, artist, instrument, content, updatedAt: new Date().toISOString() };
      if (index >= 0) chords[index] = chord; else chords.push(chord);
      await writeJsonFile(chordsFile, chords.slice(-10000));
      return json(res, 201, { chord, total: chords.length });
    } catch (error) { return json(res, 400, { error: error.message || "Não foi possível salvar a cifra." }); }
  }
  if (url.pathname === "/api/comments" && req.method === "GET") {
    const title = String(url.searchParams.get("title") || "").trim().slice(0, 200);
    const artist = String(url.searchParams.get("artist") || "").trim().slice(0, 200);
    if (!title || !artist) return json(res, 400, { error: "Informe a música e o artista." });
    const key = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
    const all = await readJsonFile(commentsFile, []);
    const comments = all.filter((item) => key(item.title) === key(title) && key(item.artist) === key(artist)).slice(0, 100);
    return json(res, 200, { comments, total: comments.length });
  }
  if (url.pathname === "/api/comments" && req.method === "POST") {
    const user = await currentUser(req);
    if (!user) return json(res, 401, { error: "Entre na sua conta para comentar." });
    try {
      const body = await readBody(req);
      const title = String(body.title || "").trim().slice(0, 200);
      const artist = String(body.artist || "").trim().slice(0, 200);
      const text = String(body.text || "").trim().slice(0, 1200);
      if (!title || !artist || text.length < 3) return json(res, 400, { error: "Informe a música, o artista e um comentário com pelo menos 3 caracteres." });
      const all = await readJsonFile(commentsFile, []);
      const comment = { id: randomBytes(12).toString("hex"), songKey: title.toLowerCase() + "|" + artist.toLowerCase(), title, artist, userId: user.id, name: user.name, text, createdAt: new Date().toISOString() };
      all.unshift(comment);
      await writeJsonFile(commentsFile, all.slice(0, 20000));
      return json(res, 201, { comment });
    } catch (error) { return json(res, 400, { error: error.message || "Não foi possível publicar o comentário." }); }
  }
  if (url.pathname === "/api/support/tickets" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const subject = String(body.subject || "").trim().slice(0, 100);
      const description = String(body.description || "").trim().slice(0, 5000);
      const email = String(body.email || "").trim().toLowerCase().slice(0, 180);
      const user = await currentUser(req);
      if (!subject || description.length < 10 || (!user && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return json(res, 400, { error: "Informe o assunto, descreva o problema com pelo menos 10 caracteres e forneça um e-mail válido se não estiver conectado." });
      const tickets = await readJsonFile(ticketsFile, []);
      const ticket = { protocol: "SL-" + randomBytes(4).toString("hex").toUpperCase(), subject, description, email: user?.email || email, userId: user?.id || null, status: "Aberto", messages: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      tickets.unshift(ticket); await writeJsonFile(ticketsFile, tickets);
      return json(res, 201, { ticket: { protocol: ticket.protocol, subject: ticket.subject, status: ticket.status, createdAt: ticket.createdAt } });
    } catch (error) { return json(res, 400, { error: error.message || "Não foi possível abrir o chamado." }); }
  }
  if (url.pathname === "/api/support/tickets" && req.method === "GET") {
    const user = await currentUser(req);
    const protocol = (url.searchParams.get("protocol") || "").trim().toUpperCase();
    const email = (url.searchParams.get("email") || "").trim().toLowerCase();
    if (!user && (!protocol || !email)) return json(res, 400, { error: "Informe o protocolo e o e-mail de contato para consultar um chamado." });
    const tickets = await readJsonFile(ticketsFile, []);
    const found = tickets.filter((ticket) => user ? ticket.userId === user.id : ticket.protocol === protocol && ticket.email === email);
    return json(res, 200, { tickets: found.map(({ protocol, subject, status, messages, createdAt, updatedAt }) => ({ protocol, subject, status, messages, createdAt, updatedAt })) });
  }
  if (url.pathname === "/api/admin/support/tickets" && req.method === "GET") {
    if (!process.env.ADMIN_SUPPORT_TOKEN || req.headers["x-admin-token"] !== process.env.ADMIN_SUPPORT_TOKEN) return json(res, 403, { error: "Acesso administrativo não autorizado." });
    const tickets = await readJsonFile(ticketsFile, []);
    return json(res, 200, { tickets });
  }
  if (url.pathname.startsWith("/api/admin/support/tickets/") && req.method === "PATCH") {
    if (!process.env.ADMIN_SUPPORT_TOKEN || req.headers["x-admin-token"] !== process.env.ADMIN_SUPPORT_TOKEN) return json(res, 403, { error: "Acesso administrativo não autorizado." });
    try {
      const protocol = url.pathname.split("/").pop().toUpperCase();
      const body = await readBody(req);
      const allowed = ["Aberto", "Em atendimento", "Aguardando resposta", "Resolvido"];
      const tickets = await readJsonFile(ticketsFile, []);
      const ticket = tickets.find((item) => item.protocol === protocol);
      if (!ticket) return json(res, 404, { error: "Chamado não encontrado." });
      if (allowed.includes(body.status)) ticket.status = body.status;
      if (String(body.message || "").trim()) ticket.messages.push({ from: "suporte", text: String(body.message).trim().slice(0, 3000), at: new Date().toISOString() });
      ticket.updatedAt = new Date().toISOString(); await writeJsonFile(ticketsFile, tickets);
      return json(res, 200, { ticket });
    } catch (error) { return json(res, 400, { error: error.message || "Não foi possível atualizar o chamado." }); }
  }


  if (req.method === "GET" && url.pathname === "/api/artists") {
    const queryText = (url.searchParams.get("q") || "").trim().slice(0, 100);
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const limit = 100;
    const offset = (page - 1) * limit;
    const normalizeArtist = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    if (queryText.length >= 2) {
      try {
        const mbUrl = new URL("https://musicbrainz.org/ws/2/artist");
        const safeQuery = queryText.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9'& -]/g, " ").replace(/\s+/g, " ").trim();
        const tokens = safeQuery.split(" ").filter(Boolean);
        // Prefix matching lets the autocomplete find artists while the user is still typing,
        // instead of requiring the full artist name to match as an exact phrase.
        const artistQuery = tokens.map((token) => `artist:${token}*`).join(" AND ");
        mbUrl.searchParams.set("query", artistQuery);
        mbUrl.searchParams.set("fmt", "json");
        mbUrl.searchParams.set("limit", String(limit));
        mbUrl.searchParams.set("offset", String(offset));
        const response = await fetch(mbUrl, { headers: { "User-Agent": USER_AGENT, "Accept": "application/json" }, signal: AbortSignal.timeout(12000) });
        if (!response.ok) return json(res, 502, { error: "A busca de artistas está temporariamente indisponível.", items: [], total: 0, hasMore: false });
        const payload = await response.json();
        let items = (payload.artists || []).map((artist) => ({
          id: `mb-artist-${artist.id}`,
          name: artist.name || "Artista sem nome",
          title: artist.name || "Artista sem nome",
          genre: artist.tags?.sort((a, b) => (b.count || 0) - (a.count || 0))[0]?.name || "Artista",
          country: artist.country || artist.area?.name || "",
          disambiguation: artist.disambiguation || "",
          provider: "MusicBrainz",
          providerUrl: `https://musicbrainz.org/artist/${artist.id}`
        }));
        let total = Number(payload.count || items.length);
        let source = "MusicBrainz";
        // MusicBrainz does not list every emerging or independent artist.
        // If it has no match, fall back to Apple's artist catalog.
        if (items.length === 0 && page === 1) {
          const appleUrl = new URL("https://itunes.apple.com/search");
          appleUrl.searchParams.set("term", queryText);
          appleUrl.searchParams.set("entity", "musicArtist");
          appleUrl.searchParams.set("limit", "200");
          appleUrl.searchParams.set("country", "BR");
          const appleResponse = await fetch(appleUrl, { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(10000) });
          if (appleResponse.ok) {
            const applePayload = await appleResponse.json();
            const seen = new Set();
            items = (applePayload.results || []).map((artist) => ({
              id: `itunes-artist-${artist.artistId || normalizeArtist(artist.artistName)}`,
              name: artist.artistName || "Artista sem nome",
              title: artist.artistName || "Artista sem nome",
              genre: artist.primaryGenreName || "Artista",
              country: "BR",
              provider: "Apple Music/iTunes",
              providerUrl: artist.artistLinkUrl || ""
            })).filter((artist) => {
              const key = normalizeArtist(artist.name);
              if (!key || seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            total = items.length;
            source = "Apple Music/iTunes";
          }
        }
        return json(res, 200, { items, total, page, limit, hasMore: source === "MusicBrainz" && offset + items.length < Number(payload.count || items.length), source });
      } catch (error) {
        return json(res, 502, { error: "Não foi possível consultar o catálogo de artistas agora. Tente novamente.", items: [], total: 0, hasMore: false });
      }
    }
    const catalog = [
      ["Gospel", ["Aline Barros","Fernandinho","Gabriela Rocha","Anderson Freire","Diante do Trono","Isadora Pompeo","Bruna Karla","Thalles Roberto","Casa Worship","Preto no Branco","Cassiane","Damares","Leandro Borges","Sarah Farias","Eli Soares","Samuel Messias","Kemilly Santos","Midian Lima","Eyshila","André Valadão"]],
      ["Sertanejo", ["Jorge & Mateus","Marília Mendonça","Gusttavo Lima","Henrique & Juliano","Maiara & Maraisa","Zezé Di Camargo & Luciano","Chitãozinho & Xororó","Bruno & Marrone","Michel Teló","Leonardo","Sérgio Reis","Luan Santana","Ana Castela","Zé Neto & Cristiano","Matheus & Kauan","Fernando & Sorocaba","João Bosco & Vinícius","Daniel","Edson & Hudson","Rio Negro & Solimões","Chrystian & Ralf","Guilherme & Benuto","Israel & Rodolffo","Lauana Prado","Simone Mendes","Naiara Azevedo","Felipe & Rodrigo","Hugo & Guilherme","Clayton & Romário","Murilo Huff"]],
      ["MPB", ["Gilberto Gil","Caetano Veloso","Marisa Monte","Djavan","Elis Regina","Milton Nascimento","Maria Bethânia","Chico Buarque","Gal Costa","Nando Reis","Lenine","Zélia Duncan","Adriana Calcanhotto","Cássia Eller","Seu Jorge","Tim Maia","Jorge Ben Jor","Alceu Valença","Maria Gadú","Liniker"]],
      ["Pop", ["Anitta","Luísa Sonza","IZA","Jão","Ludmilla","Pabllo Vittar","Gloria Groove","Vitor Kley","Melim","Duda Beat","Marina Sena","Wanessa Camargo","Kelly Key","Manu Gavassi","Lexa","Pedro Sampaio","Giulia Be","Vitão"]],
      ["Rock", ["Legião Urbana","Titãs","Capital Inicial","Barão Vermelho","Skank","Pitty","Charlie Brown Jr.","Engenheiros do Hawaii","Os Paralamas do Sucesso","Raimundos","Sepultura","O Rappa","Nando Reis","Detonautas","CPM 22","Jota Quest","Ira!","Lobão","RPM","Fresno"]],
      ["Rap", ["Emicida","Racionais MC's","Criolo","Djonga","Mano Brown","BK'","MV Bill","Rashid","Projota","Orochi","Filipe Ret","Xamã","Baco Exu do Blues","Marcelo D2","Hungria Hip Hop","Sabotage","Dexter","Flora Matos"]],
      ["Funk", ["MC Kevin","MC Hariel","MC Ryan SP","Dennis DJ","MC Livinho","MC Cabelinho","MC Don Juan","MC IG","MC Daniel","MC Paiva","MC Menor JP","MC Carol","Tati Quebra Barraco","MC Marcinho","MC Zaac","Kevinho","MC Lan"]],
      ["Pagode", ["Ferrugem","Dilsinho","Sorriso Maroto","Grupo Menos é Mais","Péricles","Belo","Thiaguinho","Daquele Jeito","Turma do Pagode","Pixote","Jeito Moleque","Exaltasamba","Katinguelê","Revelação","Mumuzinho","Di Propósito","Tiee"]],
      ["Samba", ["Zeca Pagodinho","Martinho da Vila","Beth Carvalho","Jorge Aragão","Arlindo Cruz","Paulinho da Viola","Alcione","Dona Ivone Lara","Diogo Nogueira","Teresa Cristina","Roberta Sá","Leci Brandão","Neguinho da Beija-Flor","Dudu Nobre","Fundo de Quintal"]],
      ["Forró", ["Luiz Gonzaga","Wesley Safadão","Mastruz com Leite","João Gomes","Dorgival Dantas","Falamansa","Calcinha Preta","Limão com Mel","Aviões do Forró","Xand Avião","Tarcísio do Acordeon","Zé Vaqueiro","Mastruz com Leite","Trio Nordestino","Elba Ramalho","Flávio José"]],
      ["Reggae", ["Natiruts","Cidade Negra","Maneva","Planta e Raiz","Armandinho","Maskavo","Ponto de Equilíbrio","Tribos de Jah","Edson Gomes","Onze:20"]],
      ["Indie", ["Terno Rei","O Grilo","Los Hermanos","Rubel","Clarice Falcão","Boogarins","Maglore","Vivendo do Ócio","Scalene","Dingo Bells"]],
      ["Jazz", ["João Gilberto","Hermeto Pascoal","Eliane Elias","Baden Powell","Azimuth","Leny Andrade","Hamilton de Holanda","João Donato","Dori Caymmi","Moacir Santos"]],
      ["Música Latina", ["Daniela Mercury","Ivete Sangalo","Anitta","Claudia Leitte","Ludmilla","Pabllo Vittar","Carlinhos Brown","Margareth Menezes","Alinne Rosa","Bell Marques"]]
    ];
    const unique = new Map();
    for (const [genre, names] of catalog) {
      for (const name of names) {
        const key = normalizeArtist(name);
        if (!unique.has(key)) unique.set(key, { id: `artist-${key.replace(/ /g, "-")}`, name, title: name, genre, country: "BR", provider: "Catálogo de artistas brasileiros" });
      }
    }
    const items = [...unique.values()];
    return json(res, 200, { items, total: items.length, page: 1, limit: items.length, hasMore: false, source: "Catálogo editorial brasileiro" });
  }

  if (req.method === "GET" && url.pathname === "/api/genre-artists") {
    const genre = (url.searchParams.get("genre") || "").trim().slice(0, 80);
    if (!genre) return json(res, 400, { error: "Informe o gênero musical.", items: [] });
        const norm = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    const key = norm(genre);
    const aliases = {
      gospel: ["gospel", "christian", "louvor", "adoração"], sertanejo: ["sertanejo", "sertanejo brasileiro"],
      mpb: ["mpb", "musica popular brasileira"], pop: ["pop brasileiro", "brazilian pop"],
      rock: ["rock brasileiro", "brazilian rock"], rap: ["rap brasileiro", "brazilian rap", "hip hop brasileiro"],
      funk: ["funk brasileiro", "funk carioca"], pagode: ["pagode", "pagode brasileiro"],
      samba: ["samba", "samba brasileiro"], forro: ["forro", "forro brasileiro"],
      reggae: ["reggae brasileiro", "reggae"], indie: ["indie brasileiro", "indie pop"],
      jazz: ["jazz brasileiro", "jazz"], "musica latina": ["latin", "musica latina"]
    };
    const curated = {
      gospel: ["Aline Barros", "Fernandinho", "Gabriela Rocha", "Anderson Freire", "Diante do Trono", "Isadora Pompeo", "Bruna Karla", "Thalles Roberto", "Casa Worship", "Preto no Branco"],
      sertanejo: ["Jorge & Mateus", "Marília Mendonça", "Gusttavo Lima", "Henrique & Juliano", "Maiara & Maraisa", "Zezé Di Camargo & Luciano", "Chitãozinho & Xororó"],
      mpb: ["Gilberto Gil", "Caetano Veloso", "Marisa Monte", "Djavan", "Elis Regina", "Milton Nascimento", "Maria Bethânia"],
      pop: ["Anitta", "Luísa Sonza", "IZA", "Jão", "Ludmilla", "Pabllo Vittar", "Gloria Groove"],
      rock: ["Legião Urbana", "Titãs", "Capital Inicial", "Barão Vermelho", "Skank", "Pitty", "Charlie Brown Jr."],
      rap: ["Emicida", "Racionais MC's", "Criolo", "Djonga", "Mano Brown", "BK'", "MV Bill"],
      funk: ["MC Kevin", "Anitta", "MC Hariel", "MC Ryan SP", "Ludmilla", "Dennis DJ"],
      pagode: ["Ferrugem", "Dilsinho", "Sorriso Maroto", "Grupo Menos é Mais", "Péricles", "Belo"],
      samba: ["Zeca Pagodinho", "Martinho da Vila", "Beth Carvalho", "Jorge Aragão", "Arlindo Cruz", "Paulinho da Viola"],
      forro: ["Luiz Gonzaga", "Wesley Safadão", "Mastruz com Leite", "João Gomes", "Dorgival Dantas", "Falamansa"],
      reggae: ["Natiruts", "Cidade Negra", "Maneva", "Planta e Raiz", "Armandinho", "Maskavo"],
      indie: ["Terno Rei", "O Grilo", "Los Hermanos", "Rubel", "Clarice Falcão"],
      jazz: ["João Gilberto", "Hermeto Pascoal", "Eliane Elias", "Baden Powell", "Azimuth"],
      "musica latina": ["Daniela Mercury", "Ivete Sangalo", "Anitta", "Claudia Leitte", "Ludmilla", "Pabllo Vittar"]
    };
    try {
      const found = new Map();
      for (const tag of (aliases[key] || [genre]).slice(0, 3)) {
        const mbUrl = new URL("https://musicbrainz.org/ws/2/artist");
        mbUrl.searchParams.set("query", `tag:"${tag.replace(/["\\\\]/g, " ")}"`);
        mbUrl.searchParams.set("fmt", "json");
        mbUrl.searchParams.set("limit", "100");
        const response = await fetch(mbUrl, { headers: { "User-Agent": USER_AGENT, "Accept": "application/json" }, signal: AbortSignal.timeout(9000) });
        if (!response.ok) continue;
        const payload = await response.json();
        for (const artist of payload.artists || []) {
          const name = String(artist.name || "").trim();
          const id = String(artist.id || "");
          const normalized = norm(name);
          if (!name || !id || found.has(normalized)) continue;
          found.set(normalized, { id: `mb-artist-${id}`, name, title: name, artist: genre, country: artist.country || "", disambiguation: artist.disambiguation || "", provider: "MusicBrainz", providerUrl: `https://musicbrainz.org/artist/${id}` });
        }
      }
      const discovered = [...found.values()].filter((item) => item.country === "BR");
      const editorial = (curated[key] || []).map((name, index) => ({ id: `curated-${key}-${index}`, name, title: name, artist: genre, country: "Brasil", provider: "Seleção de artistas brasileiros", providerUrl: "" }));
      const seen = new Set(editorial.map((item) => norm(item.name)));
      const brazilianCatalog = discovered.filter((item) => !seen.has(norm(item.name)));
      // Prioriza a seleção editorial nacional e complementa somente com artistas marcados como brasileiros.
      const items = [...editorial, ...brazilianCatalog];
      const source = editorial.length && brazilianCatalog.length ? "Artistas brasileiros + MusicBrainz" : editorial.length ? "Seleção de artistas brasileiros" : "MusicBrainz (artistas brasileiros)";
      return json(res, 200, { genre, items, total: items.length, source, note: items.length ? "" : "Não encontramos artistas para este gênero. Tente novamente mais tarde." });
    } catch (error) {
      const items = (curated[key] || []).map((name, index) => ({ id: `curated-${key}-${index}`, name, title: name, artist: genre, provider: "Seleção editorial", providerUrl: "" }));
      return json(res, 200, { genre, items, total: items.length, source: items.length ? "Seleção editorial" : "MusicBrainz", note: items.length ? "Lista editorial usada porque o catálogo de artistas está temporariamente indisponível." : "Não foi possível carregar artistas agora." });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/music-search") {
    const q = (url.searchParams.get("q") || "").trim().slice(0, 120);
    if (q.length < 2) return json(res, 400, { error: "Digite pelo menos duas letras para pesquisar." });
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const limit = 50;
    const offset = (page - 1) * limit;
    const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    const query = normalize(q);
    const tokens = query.split(" ").filter((token) => token.length > 1);
    const relevant = (item) => {
      const fields = normalize([item.title, item.artist, item.album].filter(Boolean).join(" "));
      return fields.includes(query) || (tokens.length > 0 && tokens.every((token) => fields.includes(token)));
    };
    const mapApple = (track) => ({
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
    });
    const mapMusicBrainz = (recording) => ({
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
    });
    try {
      let items = [];
      let total = 0;
      let source = "Apple/iTunes";
      // Apple search results are filtered so unrelated tracks are never shown as matches.
      const lookup = new URL("https://itunes.apple.com/search");
      lookup.searchParams.set("term", q);
      lookup.searchParams.set("entity", "song");
      lookup.searchParams.set("limit", String(limit));
      lookup.searchParams.set("offset", String(offset));
      lookup.searchParams.set("country", "BR");
      const response = await fetch(lookup, { headers: { "User-Agent": USER_AGENT, "Accept": "application/json" }, signal: AbortSignal.timeout(12000) });
      if (response.ok) {
        const payload = await response.json();
        const appleItems = (payload.results || []).map(mapApple).filter(relevant);
        items = appleItems;
        total = appleItems.length;
      }
      // If Apple has no relevant matches, try MusicBrainz title/recording search, then artist-specific search.
      if (!items.length) {
        source = "MusicBrainz";
        let mb = null;
        for (const mbQuery of [q, `artist:"${q.replace(/["\\\\]/g, " ")}"`]) {
          const mbUrl = new URL("https://musicbrainz.org/ws/2/recording");
          mbUrl.searchParams.set("query", mbQuery);
          mbUrl.searchParams.set("fmt", "json");
          mbUrl.searchParams.set("limit", String(limit));
          mbUrl.searchParams.set("offset", String(offset));
          const mbResponse = await fetch(mbUrl, { headers: { "User-Agent": "SomELetra/1.0 (https://github.com/TFERRE21/SITELESTRASMUSICAS)", "Accept": "application/json" }, signal: AbortSignal.timeout(12000) });
          if (!mbResponse.ok) continue;
          const payload = await mbResponse.json();
          const matches = (payload.recordings || []).map(mapMusicBrainz).filter(relevant);
          if (matches.length) {
            items = matches;
            total = Number(payload.count) || matches.length;
            mb = payload;
            break;
          }
        }
        if (!items.length) total = 0;
      }
      return json(res, 200, { items, total, page, limit, hasMore: offset + items.length < total, source, query: q });
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
  if (req.method === "GET" && url.pathname === "/api/music-video") {
    const q = (url.searchParams.get("q") || "").trim().slice(0, 180);
    if (!q) return json(res, 400, { error: "Informe o nome da música e do artista." });
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return json(res, 503, { error: "O player de vídeos ainda precisa da chave oficial da YouTube Data API (YOUTUBE_API_KEY)." });
    try {
      const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
      searchUrl.searchParams.set("part", "snippet");
      searchUrl.searchParams.set("type", "video");
      // Prefer videos that YouTube marks as embeddable, to avoid restricted players in the site.
      searchUrl.searchParams.set("videoEmbeddable", "true");
      searchUrl.searchParams.set("videoSyndicated", "true");
      searchUrl.searchParams.set("regionCode", "BR");
      searchUrl.searchParams.set("relevanceLanguage", "pt");
      searchUrl.searchParams.set("maxResults", "10");
      searchUrl.searchParams.set("q", q);
      searchUrl.searchParams.set("key", apiKey);
      const response = await fetch(searchUrl, { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(10000) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || "Não foi possível pesquisar vídeos no YouTube.");
      const videos = (payload.items || []).filter((item) => item.id?.videoId).map((item) => ({
        videoId: item.id.videoId,
        title: item.snippet?.title || "",
        channel: item.snippet?.channelTitle || "",
        thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || ""
      }));
      if (!videos.length) return json(res, 404, { error: "Nenhum vídeo relacionado foi encontrado." });
      return json(res, 200, { video: videos[0], alternatives: videos.slice(1), source: "YouTube Data API" });
    } catch (error) {
      return json(res, 502, { error: error.message || "Falha ao localizar vídeo." });
    }
  }
  if (req.method === "GET" && url.pathname === "/api/charts") {
    const country = (url.searchParams.get("country") || "br").toLowerCase();
    const isGlobal = ["international", "global", "us"].includes(country);
    const countrySlug = isGlobal ? "worldwide" : "brazil";
    const strip = (value) => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    let sourceError = "";
    try {
      const chartUrl = `https://chartex.com/charts/youtube/weekly/${countrySlug}`;
      const response = await fetch(chartUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SomELetra/1.0)", "Accept": "text/html" },
        signal: AbortSignal.timeout(12000)
      });
      if (!response.ok) throw new Error(`A fonte principal respondeu HTTP ${response.status}.`);
      const html = await response.text();
      const decoded = html.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ");
      const chartTitle = strip(decoded.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
      const rows = [];
      const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
      for (const rowMatch of decoded.matchAll(rowRegex)) {
        const cells = [...rowMatch[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => ({ html: cell[1], text: strip(cell[1]) }));
        if (!cells.length) continue;
        const rank = Number.parseInt(cells[0].text, 10);
        if (!Number.isFinite(rank) || rank < 1 || rank > 500) continue;
        const titleCell = cells.find((cell) => /href=["'][^"']*\/(songs|sounds)\//i.test(cell.html));
        if (!titleCell) continue;
        const href = titleCell.html.match(/href=["']([^"']+)["']/i)?.[1];
        const titleLink = titleCell.html.match(/<a\b[^>]*href=["'][^"']*\/(songs|sounds)\/[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
        const title = titleLink ? strip(titleLink[2]) : "";
        if (!href || !title || title.length > 180 || rows.some((item) => item.rank === rank)) continue;
        const artist = cells.slice(1).map((cell) => cell.text).find((text) => text && text !== title && !/^[-–—]$/.test(text)) || "Ver artistas na fonte";
        const image = titleCell.html.match(/<img\b[^>]*src=["']([^"']+)["']/i)?.[1] || "";
        rows.push({ id: `ytchart-${countrySlug}-${rank}`, rank, title, artist, album: "", genre: "YouTube Top Songs", genres: [{ name: "YouTube Top Songs" }], artworkUrl: image, url: href.startsWith("http") ? href : `https://chartex.com${href}`, country: isGlobal ? "Global" : "Brasil", source: "YouTube Top Songs via ChartEx", updatedAt: new Date().toISOString() });
      }
      rows.sort((a, b) => a.rank - b.rank);
      if (rows.length) {
        const items = rows.slice(0, 10);
        return json(res, 200, { country: countrySlug, items, total: items.length, updatedAt: new Date().toISOString(), source: "YouTube Top Songs via ChartEx", sourceUrl: chartUrl, chartTitle, note: "Ranking semanal do YouTube apresentado por um serviço terceiro." });
      }
      sourceError = "A fonte principal não apresentou linhas reconhecíveis.";
    } catch (error) {
      sourceError = error.message || "Falha na fonte principal.";
    }

    // Não substitua o ranking do YouTube por outra plataforma: isso confundia a origem dos dados.
    return json(res, 502, {
      error: "O ranking do YouTube está temporariamente indisponível para esta região. Tente novamente mais tarde.",
      detail: sourceError,
      items: [],
      source: "YouTube Charts",
      country: countrySlug
    });
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
  if (req.method === "GET" && url.pathname === "/sitemap-musicas.xml") {
    const xmlEscape = (value) => String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
    const slugify = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "musica";
    const songs = new Map();
    for (const item of cachedCatalog) {
      const title = String(item.title || "").trim();
      const artist = String(item.artist || "").trim();
      if (!title || !artist || title === "Faixa sem título" || artist === "Artista desconhecido") continue;
      const slug = slugify(title) + "-por-" + slugify(artist);
      songs.set(slug, { slug, updated: item.updatedAt || item.addedAt || null });
    }
    const entries = [...songs.values()].map(({ slug, updated }) => "  <url><loc>https://versosmusicais.com.br/musica/" + xmlEscape(slug) + "</loc>" + (updated ? "<lastmod>" + xmlEscape(new Date(updated).toISOString().slice(0, 10)) + "</lastmod>" : "") + "<changefreq>monthly</changefreq><priority>0.6</priority></url>").join("\n");
    res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=900", "X-Content-Type-Options": "nosniff" });
    return res.end('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + entries + (entries ? "\n" : "") + "</urlset>");
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
    const norm = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    try {
      const queries = [...new Set([[title, artist].filter(Boolean).join(" "), title].filter(Boolean))];
      let results = [];
      let lastUpstreamError = null;
      for (const q of queries) {
        try {
          const found = await lrclib("/api/search", { q });
          if (Array.isArray(found) && found.length) { results = found; break; }
        } catch (error) {
          lastUpstreamError = error;
          // Try the title-only query when the combined query fails or the provider is temporarily unstable.
        }
      }
      if (!results.length) {
        const fallback = await lyricsOvh(title, artist);
        if (fallback) {
          return json(res, 200, { lyrics: fallback.lyrics, provider: fallback.provider, providerUrl: fallback.providerUrl, trackName: title, artistName: artist, instrumental: false, fallback: true });
        }
        const status = lastUpstreamError?.status === 503 || lastUpstreamError?.status === 502 ? 503 : lastUpstreamError?.status === 429 ? 429 : 404;
        return json(res, status, { error: status === 503 ? "Os serviços de letras estão temporariamente instáveis. Tente novamente em instantes." : status === 429 ? "Muitas consultas foram feitas em sequência. Aguarde um pouco e tente novamente." : "Não encontramos letra disponível para esta música nas fontes consultadas." });
      }
      const exact = results.find((item) => norm(item.trackName) === norm(title) && (!artist || norm(item.artistName).includes(norm(artist)) || norm(artist).includes(norm(item.artistName))));
      const match = exact || results.find((item) => norm(item.trackName) === norm(title)) || results.find((item) => norm(item.trackName).includes(norm(title)) && (!artist || norm(item.artistName).includes(norm(artist)))) || results[0];
      // Search responses may already contain lyrics; use them first to avoid an unnecessary second API call.
      let detail = match;
      let lyrics = match.plainLyrics || match.syncedLyrics || "";
      if (!lyrics) {
        try {
          detail = await lrclib("/api/get/" + encodeURIComponent(match.id));
          lyrics = detail.plainLyrics || detail.syncedLyrics || "";
        } catch (error) {
          // Try LRCLIB's metadata lookup as a second authorized path before reporting the temporary failure.
          try {
            detail = await lrclib("/api/get", { track_name: title || match.trackName, artist_name: artist || match.artistName });
            lyrics = detail.plainLyrics || detail.syncedLyrics || "";
          } catch (fallbackError) {
            const status = fallbackError.status === 429 ? 429 : 503;
            return json(res, status, { error: status === 429 ? "Muitas consultas foram feitas em sequência. Aguarde um pouco e tente novamente." : "O serviço de letras está temporariamente instável. Tente novamente em instantes." });
          }
        }
      }
      if (!lyrics) {
        const fallback = await lyricsOvh(title || match.trackName, artist || match.artistName);
        if (fallback) {
          return json(res, 200, { lyrics: fallback.lyrics, provider: fallback.provider, providerUrl: fallback.providerUrl, trackName: title || match.trackName, artistName: artist || match.artistName, instrumental: false, fallback: true });
        }
        return json(res, 404, { error: "Encontramos a música, mas nenhuma fonte disponibilizou a letra." });
      }
      return json(res, 200, { lyrics, provider: "LRCLIB", trackName: detail.trackName || match.trackName, artistName: detail.artistName || match.artistName, instrumental: Boolean(detail.instrumental) });
    } catch (error) {
      const status = error.status === 429 ? 429 : error.status === 503 ? 503 : 502;
      return json(res, status, { error: status === 503 ? "O serviço de letras está temporariamente instável. Tente novamente em instantes." : error.message || "Não foi possível consultar a letra agora.", retryAfter: error.retryAfter || null });
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
    let items;
    let source = "LRCLIB";
    try {
      const results = await lrclib("/api/search", { q });
      items = Array.isArray(results) ? results.map(normalizeTrack) : [];
    } catch (lrclibError) {
      // LRCLIB may return 503 during an outage. Keep the catalog growing with
      // track metadata from Apple's public Search API; lyrics remain LRCLIB-only.
      if (lrclibError.status !== 503) throw lrclibError;
      items = await appleSearchTracks(q);
      source = "Apple Search (fallback de metadados)";
      console.warn("[catalog-robot] LRCLIB indisponível (503); consulta '" + q + "' atendida via Apple Search, sem letras.");
    }
    // Advance and persist the next query with the catalog to continue collecting across restarts.
    robotQueryIndex = (robotQueryIndex + 1) % ROBOT_QUERIES.length;
    await saveCatalog(items);
    robotLastRunAt = new Date().toISOString();
    robotLastError = null;
    robotConsecutiveErrors = 0;
    robotNextAllowedAt = null;
    console.info("[catalog-robot] consulta " + q + " via " + source + ": " + items.length + " resultados; total local " + cachedCatalog.length + ".");
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