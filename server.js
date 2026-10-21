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


  if (req.method === "GET" && url.pathname === "/api/genre-artists") {
    const genre = (url.searchParams.get("genre") || "").trim().slice(0, 80);
    if (!genre) return json(res, 400, { error: "Informe o gênero musical.", items: [] });
    const norm = (value) => String(value || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\\s+/g, " ").trim();
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
      pop: ["Anitta", "Luísa Sonza", "IZA", "Jão", "Ludmilla", "Dua Lipa", "Taylor Swift"],
      rock: ["Legião Urbana", "Titãs", "Capital Inicial", "Barão Vermelho", "Skank", "Pitty", "Charlie Brown Jr."],
      rap: ["Emicida", "Racionais MC's", "Criolo", "Djonga", "Mano Brown", "BK'", "MV Bill"],
      funk: ["MC Kevin", "Anitta", "MC Hariel", "MC Ryan SP", "Ludmilla", "Dennis DJ"],
      pagode: ["Ferrugem", "Dilsinho", "Sorriso Maroto", "Grupo Menos é Mais", "Péricles", "Belo"],
      samba: ["Zeca Pagodinho", "Martinho da Vila", "Beth Carvalho", "Jorge Aragão", "Arlindo Cruz", "Paulinho da Viola"],
      forro: ["Luiz Gonzaga", "Wesley Safadão", "Mastruz com Leite", "João Gomes", "Dorgival Dantas", "Falamansa"],
      reggae: ["Natiruts", "Cidade Negra", "Maneva", "Planta e Raiz", "Bob Marley"],
      indie: ["Terno Rei", "O Grilo", "Los Hermanos", "Rubel", "Clarice Falcão"],
      jazz: ["João Gilberto", "Hermeto Pascoal", "Eliane Elias", "Baden Powell", "Azimuth"],
      "musica latina": ["Shakira", "Juanes", "Bad Bunny", "Karol G", "Maná"]
    };
    try {
      const found = new Map();
      for (const tag of (aliases[key] || [genre]).slice(0, 3)) {
        const mbUrl = new URL("https://musicbrainz.org/ws/2/artist");
        mbUrl.searchParams.set("query", `tag:"${tag.replace(/["\\\\]/g, " ")}"`);
        mbUrl.searchParams.set("fmt", "json");
        mbUrl.searchParams.set("limit", "30");
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
      let items = [...found.values()].slice(0, 30);
      let source = "MusicBrainz";
      if (!items.length) {
        items = (curated[key] || []).map((name, index) => ({ id: `curated-${key}-${index}`, name, title: name, artist: genre, provider: "Seleção editorial", providerUrl: "" }));
        source = "Seleção editorial";
      }
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
      searchUrl.searchParams.set("maxResults", "5");
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

    // Fallback de catálogo: Apple Music RSS mantém a seção útil se o scraper do ranking estiver indisponível.
    // A resposta é rotulada como lista de músicas populares, não como ranking oficial do YouTube.
    try {
      const storefront = isGlobal ? "us" : "br";
      const fallbackUrl = `https://rss.applemarketingtools.com/api/v2/${storefront}/music/most-played/10/songs.json`;
      const response = await fetch(fallbackUrl, {
        headers: { "User-Agent": USER_AGENT, "Accept": "application/json" },
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error(`A fonte alternativa respondeu HTTP ${response.status}.`);
      const payload = await response.json();
      const results = Array.isArray(payload.feed?.results) ? payload.feed.results : [];
      const items = results.map((track, index) => ({
        id: `apple-popular-${storefront}-${track.id || index + 1}`,
        rank: index + 1,
        title: track.name || "Faixa sem título",
        artist: track.artistName || "Artista não informado",
        album: track.collectionName || "",
        genre: track.genres?.[0]?.name || "Música",
        genres: track.genres || [],
        artworkUrl: track.artworkUrl100 || "",
        url: track.url || "",
        country: isGlobal ? "Global" : "Brasil",
        source: "Apple Music Most Played",
        updatedAt: new Date().toISOString()
      }));
      if (!items.length) throw new Error("A fonte alternativa não retornou músicas.");
      return json(res, 200, {
        country: storefront, items, total: items.length,
        updatedAt: new Date().toISOString(),
        source: "Apple Music Most Played",
        sourceUrl: fallbackUrl,
        note: "Lista alternativa de músicas populares da Apple Music. Não representa o ranking oficial do YouTube.",
        fallback: true
      });
    } catch (fallbackError) {
      return json(res, 502, {
        error: "Não foi possível carregar as listas musicais agora. Tente novamente mais tarde.",
        detail: sourceError,
        fallbackError: fallbackError.message || "Falha na fonte alternativa.",
        items: [], source: "music charts"
      });
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