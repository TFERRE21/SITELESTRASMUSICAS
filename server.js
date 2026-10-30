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
const musicVideosFile = path.join(dataDir, "music-videos.json");
const usersFile = path.join(dataDir, "users.json");
const sessionsFile = path.join(dataDir, "sessions.json");
const ticketsFile = path.join(dataDir, "support-tickets.json");
const commentsFile = path.join(dataDir, "song-comments.json");
const chordsFile = path.join(dataDir, "song-chords.json");
const PORT = Number(process.env.PORT || 3000);
const USER_AGENT = "SomELetra/0.2 (https://github.com/TFERRE21/SITELESTRASMUSICAS)";
let cachedCatalog = [];
const musicVideoCache = new Map();
let videoRobotRunning = false;
let videoRobotIndex = 0;
let videoRobotLastRunAt = null;
let videoRobotLastError = null;
const VIDEO_ROBOT_INTERVAL_MS = 45_000;
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
  "Sabrina Carpenter", "Chappell Roan", "Post Malone", "Shakira", "Bad Bunny", "BTS", "BLACKPINK",
  // Buscas diretas por títulos de músicas para ampliar o catálogo além das consultas por artista/gênero.
  "Evidências Chitãozinho Xororó", "Boate Azul", "Ainda Ontem Chorei de Saudade", "Telefone Mudo",
  "Leão Marília Mendonça", "Infiel Marília Mendonça", "Todo Mundo Menos Você", "Erro Gostoso",
  "Nosso Quadro", "Pipoco Ana Castela", "Canudinho Gusttavo Lima", "Desejo Imortal",
  "Acorda Pedrinho", "Zona de Perigo", "Tá OK Dennis Kevin O Chris", "Vai Malandra Anitta",
  "Envolver Anitta", "Cheia de Manias Raça Negra", "Temporal Art Popular", "Depois do Prazer Só Pra Contrariar",
  "Deixa Acontecer Grupo Revelação", "Tá Escrito Grupo Revelação", "O Sol Jota Quest",
  "Dias Melhores Jota Quest", "Anna Júlia Los Hermanos", "Tempo Perdido Legião Urbana",
  "Pais e Filhos Legião Urbana", "Pro Dia Nascer Feliz Barão Vermelho", "Primeiros Erros Capital Inicial",
  "Evidências", "Como é Grande o Meu Amor por Você", "Detalhes Roberto Carlos", "Oceano Djavan",
  "Flor de Lis Djavan", "Velha Infância Tribalistas", "Ainda Bem Marisa Monte",
  "Amei Te Ver Tiago Iorc", "Trevo Anavitória", "Meu Abrigo Melim", "Amarelo Emicida",
  "Levanta e Anda Emicida", "AmarElo", "Dona de Mim IZA", "Pesadão IZA",
  "Ai Preto L7NNON", "Malvadão 3 Xamã", "Amor de Fim de Noite Orochi",
  "Deus de Promessas Davi Sacer", "Raridade Anderson Freire", "A Casa É Sua Casa Worship",
  "Ninguém Explica Deus Preto no Branco", "Ousado Amor Isaias Saad", "Lugar Secreto Gabriela Rocha",
  "Todavia Me Alegrarei Samuel Messias", "Jó Midian Lima", "Faz um Milagre em Mim Regis Danese",
  "Because of You Kelly Clarkson", "Shape of You Ed Sheeran", "Blinding Lights The Weeknd",
  "Flowers Miley Cyrus", "Anti-Hero Taylor Swift", "Cruel Summer Taylor Swift",
  "Someone Like You Adele", "Rolling in the Deep Adele", "Perfect Ed Sheeran",
  "Bohemian Rhapsody Queen", "Billie Jean Michael Jackson", "Smells Like Teen Spirit Nirvana",
  "Numb Linkin Park", "Wonderwall Oasis", "Hotel California Eagles",
  "Imagine John Lennon", "Like a Prayer Madonna", "Dancing Queen ABBA",
  "Hallelujah Leonard Cohen", "Take On Me a-ha", "Livin on a Prayer Bon Jovi",
  "Sweet Child O Mine Guns N Roses", "Enter Sandman Metallica", "Lose Yourself Eminem",
  "Bad Romance Lady Gaga", "Levitating Dua Lipa", "As It Was Harry Styles",
  "Despacito Luis Fonsi", "Bailando Enrique Iglesias", "Dynamite BTS", "How You Like That BLACKPINK"
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
      const slugifySeo = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "musica";
      const slug = decoded.slice("/musica/".length).replace(/\/$/, "");
      const item = cachedCatalog.find((song) => slugifySeo(song.title) + "-por-" + slugifySeo(song.artist) === slug);
      if (item) {
        const escapeHtml = (value) => String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
        const title = "Versos Musicais | Letra de " + String(item.title || "Música") + " — " + String(item.artist || "Artista");
        const description = "Conheça " + String(item.title || "esta música") + ", de " + String(item.artist || "este artista") + ", no Versos Musicais. Consulte informações da faixa e verifique a disponibilidade da letra.";
        const canonical = "https://versosmusicais.com.br/musica/" + slug;
        body = body
          .replace(/<title>[^<]*<\/title>/i, "<title>" + escapeHtml(title) + "</title>")
          .replace(/<meta name="description" content="[^"]*"\s*\/?\s*>/i, '<meta name="description" content="' + escapeHtml(description) + '">')
          .replace(/<link rel="canonical" href="[^"]*"\s*\/?\s*>/i, '<link rel="canonical" href="' + canonical + '">')
          .replace(/<meta property="og:title" content="[^"]*"\s*\/?\s*>/i, '<meta property="og:title" content="' + escapeHtml(title) + '">')
          .replace(/<meta property="og:description" content="[^"]*"\s*\/?\s*>/i, '<meta property="og:description" content="' + escapeHtml(description) + '">')
          .replace(/<meta property="og:type" content="[^"]*"\s*\/?\s*>/i, '<meta property="og:type" content="music.song">')
          .replace(/<meta property="og:url" content="[^"]*"\s*\/?\s*>/i, '<meta property="og:url" content="' + canonical + '">')
          .replace(/<meta name="twitter:title" content="[^"]*"\s*\/?\s*>/i, '<meta name="twitter:title" content="' + escapeHtml(title) + '">')
          .replace(/<meta name="twitter:description" content="[^"]*"\s*\/?\s*>/i, '<meta name="twitter:description" content="' + escapeHtml(description) + '">');
        const schema = JSON.stringify({
          "@context": "https://schema.org",
          "@type": "MusicRecording",
          name: String(item.title || ""),
          byArtist: { "@type": "MusicGroup", name: String(item.artist || "") },
          url: canonical,
          inLanguage: "pt-BR",
          mainEntityOfPage: canonical
        }).replace(/</g, "\\u003c");
        body = body.replace("</head>", '<script type="application/ld+json">' + schema + "</script>\n</head>");
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
    const query = encodeURIComponent(title + " " + artist);
    const links = [
      { title: "Cifra Club", artist, instrumentTracks: [instrument], url: "https://www.cifraclub.com.br/?q=" + query, provider: "Cifra Club" },
      { title: "Ultimate Guitar", artist, instrumentTracks: [instrument], url: "https://www.ultimate-guitar.com/search.php?search_type=title&value=" + query, provider: "Ultimate Guitar" },
      { title: "Songsterr", artist, instrumentTracks: [instrument], url: "https://www.songsterr.com/?pattern=" + query, provider: "Songsterr" }
    ];
    return json(res, 200, {
      chord: null,
      externalMatches: links,
      total: links.length,
      message: "As cifras são consultadas diretamente nas plataformas externas. O Versos Musicais não reproduz nem armazena cifras completas."
    });
  }
  if (url.pathname === "/api/chords" && req.method === "POST") {
    return json(res, 410, {
      error: "O cadastro de cifras completas foi desativado. Consulte as plataformas externas indicadas na página da música."
    });
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
      return json(res, 502, { error: error.message || "Não foi possível buscar a capa do álbum." });
    }
  }
  if (req.method === "GET" && url.pathname === "/api/music-video") {
    const q = (url.searchParams.get("q") || "").trim().slice(0, 180);
    if (!q) return json(res, 400, { error: "Informe o nome da música e do artista." });
    const cacheKey = q.toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
    const cached = musicVideoCache.get(cacheKey);
    if (cached?.video?.videoId) return json(res, 200, { video: cached.video, source: "cache" });
    try {
      const video = await findYouTubeVideo(q);
      if (!video) return json(res, 404, { error: "Nenhum vídeo encontrado. Tente novamente mais tarde." });
      musicVideoCache.set(cacheKey, { video, savedAt: new Date().toISOString() });
      await persistMusicVideos();
      return json(res, 200, { video, source: "youtube-public-search" });
    } catch (error) {
      return json(res, 502, { error: error.message || "Falha ao buscar vídeos no YouTube." });
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
    const q = (url.searchParams.get("q") || "").trim().slice(0, 180);
    if (!q) return json(res, 400, { error: "Informe o nome da música ou artista no parâmetro q." });
    const encoded = encodeURIComponent(q);
    return json(res, 200, {
      query: q,
      sources: [
        { name: "Musixmatch", type: "external-search", url: "https://www.musixmatch.com/search/" + encoded, lyricsCopied: false },
        { name: "Letras.mus.br", type: "external-search", url: "https://www.letras.mus.br/?q=" + encoded, lyricsCopied: false },
        { name: "Genius", type: "external-search", url: "https://genius.com/search?q=" + encoded, lyricsCopied: false },
        { name: "YouTube Music", type: "external-search", url: "https://music.youtube.com/search?q=" + encoded, lyricsCopied: false }
      ],
      note: "Os links abrem buscas nas plataformas externas. O Versos Musicais não extrai, copia, armazena ou reproduz letras dessas plataformas. A disponibilidade e os direitos de exibição são regidos pelos termos e licenças de cada serviço."
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
  if (req.method === "GET" && (url.pathname === "/api/lyrics/search" || url.pathname.startsWith("/api/lyrics/"))) {
    return json(res, 410, {
      error: "A exibição de letras completas foi desativada para respeitar direitos autorais.",
      provider: null,
      lyrics: null,
      externalSearches: (() => {
        const query = encodeURIComponent((url.searchParams.get("title") || "") + " " + (url.searchParams.get("artist") || ""));
        return [
          { name: "Musixmatch", url: "https://www.musixmatch.com/search/" + query },
          { name: "Letras.mus.br", url: "https://www.letras.mus.br/?q=" + query },
          { name: "Genius", url: "https://genius.com/search?q=" + query },
          { name: "YouTube Music", url: "https://music.youtube.com/search?q=" + query }
        ];
      })()
    });
  }
  if (req.method === "GET" && !url.pathname.startsWith("/api/")) return serveStatic(req, res, url.pathname);
  return json(res, 404, { error: "Não encontrado." });
});

async function persistMusicVideos() {
  await mkdir(dataDir, { recursive: true });
  const entries = Object.fromEntries(musicVideoCache.entries());
  await writeFile(musicVideosFile, JSON.stringify({ updatedAt: new Date().toISOString(), items: entries }, null, 2), { mode: 0o600 });
}

async function readMusicVideos() {
  try {
    const parsed = JSON.parse(await readFile(musicVideosFile, "utf8"));
    for (const [key, value] of Object.entries(parsed.items || {})) {
      if (value?.video?.videoId) musicVideoCache.set(key, value);
    }
  } catch {}
}

async function findYouTubeVideo(q) {
  const searchUrl = new URL("https://www.youtube.com/results");
  searchUrl.searchParams.set("search_query", q);
  const response = await fetch(searchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
    },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error("O YouTube não disponibilizou a página de pesquisa agora.");
  const html = await response.text();
  const initialMatch = html.match(/(?:var ytInitialData = |window\["ytInitialData"\] = )(\{[\s\S]*?\});<\/script>/);
  if (!initialMatch) throw new Error("O YouTube bloqueou ou alterou a página de pesquisa.");
  const initialData = JSON.parse(initialMatch[1]);
  const renderers = [];
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (value.videoRenderer?.videoId) renderers.push(value.videoRenderer);
    for (const child of Object.values(value)) {
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === "object") visit(child);
    }
  };
  visit(initialData);
  const seen = new Set();
  const videos = renderers.filter((item) => {
    if (seen.has(item.videoId)) return false;
    seen.add(item.videoId);
    return true;
  }).slice(0, 5).map((item) => ({
    videoId: item.videoId,
    title: (item.title?.runs || []).map((run) => run.text || "").join("") || item.title?.simpleText || "",
    channel: (item.ownerText?.runs || item.shortBylineText?.runs || []).map((run) => run.text || "").join("") || "",
    thumbnail: item.thumbnail?.thumbnails?.slice(-1)[0]?.url || "",
    url: "https://www.youtube.com/watch?v=" + item.videoId
  })).filter((item) => item.videoId && item.title);
  return videos[0] || null;
}

async function robotCollectOneVideo() {
  if (videoRobotRunning || !cachedCatalog.length) return;
  videoRobotRunning = true;
  try {
    const pending = cachedCatalog.filter((item) => item.title && item.artist &&
      !musicVideoCache.has((item.title + " " + item.artist).toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim()));
    if (!pending.length) {
      videoRobotLastRunAt = new Date().toISOString();
      return;
    }
    const track = pending[videoRobotIndex % pending.length];
    videoRobotIndex = (videoRobotIndex + 1) % Math.max(1, pending.length);
    const q = track.title + " " + track.artist;
    const key = q.toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
    const video = await findYouTubeVideo(q);
    if (video) {
      musicVideoCache.set(key, { video, savedAt: new Date().toISOString() });
      await persistMusicVideos();
      console.info("[video-robot] vídeo salvo: " + q + " -> " + video.url);
    }
    videoRobotLastError = null;
    videoRobotLastRunAt = new Date().toISOString();
  } catch (error) {
    videoRobotLastError = error.message || "Falha na busca automática de vídeos.";
    console.warn("[video-robot] " + videoRobotLastError);
  } finally {
    videoRobotRunning = false;
  }
}

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
await readMusicVideos();
server.listen(PORT, "0.0.0.0", () => {
  console.info(`[server] Som & Letra ouvindo na porta ${PORT}; provedor LRCLIB sem chave de API.`);
  setTimeout(() => {
    robotCollectOneQuery().catch((error) => console.warn("[catalog-robot]", error));
    setInterval(() => robotCollectOneQuery().catch((error) => console.warn("[catalog-robot]", error)), ROBOT_INTERVAL_MS);
    robotCollectOneVideo().catch((error) => console.warn("[video-robot]", error));
    setInterval(() => robotCollectOneVideo().catch((error) => console.warn("[video-robot]", error)), VIDEO_ROBOT_INTERVAL_MS);
  }, 10_000);
});