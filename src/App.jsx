import { useEffect, useMemo, useState } from "react";
import { AudioLines, Search, Music2, Heart, Menu, X, ArrowRight, ChevronRight, Play, Disc3, Mic2, Headphones, Sparkles, Printer, Download, Share2, Youtube, Home, UserRound, LifeBuoy, Send, LogOut, CircleUserRound, ListMusic } from "lucide-react";
import { institutional } from "./config/institutional.js";

const genres = ["Todos", "Gospel", "Sertanejo", "MPB", "Pop", "Rock", "Rap", "Funk", "Pagode", "Samba", "Forró", "Reggae", "Indie", "Jazz", "Música Latina"];
const normalize = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function Cover({ item, index = 0, className = "" }) {
  const colors = ["#e9dffb", "#f8e2d8", "#dcecf7", "#f7edce", "#dcefe5", "#f4ddeb"];
  const image = item?.artworkUrl || item?.artworkUrl100;
  return image
    ? <img className={`music-cover ${className}`} src={image} alt={`Capa de ${item.title || item.name || "música"}`} loading="lazy" />
    : <div className={`music-cover music-cover--placeholder ${className}`} style={{ background: colors[index % colors.length] }}><AudioLines size={26} /><span>Site Músicas</span></div>;
}

function Brand({ onClick }) {
  return <a className="reference-brand" href="#inicio" onClick={onClick} aria-label="Site Músicas — Início">
    <span className="reference-brand__note"><Music2 size={33} fill="currentColor"/></span>
    <span className="reference-brand__words"><strong>Site <em>Músicas</em></strong><small>LETRAS QUE TOCAM VOCÊ</small></span>
  </a>;
}

function MusicPage({ lyrics, loading, video, videoLoading, videoError, onBack, onPrint, onDownload, onShare, onVideo, onSave, saved, catalog, onOpen, fontScale, setFontScale }) {
  const artistItems = catalog.filter((item) => normalize(item.artist) === normalize(lyrics.artist) && normalize(item.title) !== normalize(lyrics.title)).slice(0, 6);
  const extras = artistItems.slice(0, 6);
  return <main className="reference-song-page">
    <div className="reference-breadcrumb"><a href="#inicio" onClick={onBack}>Início</a><ChevronRight size={14}/><a href="#busca" onClick={onBack}>{lyrics.artist}</a><ChevronRight size={14}/><span>{lyrics.title}</span></div>
    <section className="reference-song-hero">
      <Cover item={{...lyrics, artworkUrl:lyrics.artworkUrl}} index={0} className="reference-song-cover"/>
      <div className="reference-song-meta"><h1>{lyrics.title}</h1><p className="reference-song-artist">{lyrics.artist}</p>
        <p className="reference-song-album">{lyrics.album ? `Álbum: ${lyrics.album}` : "Detalhes do lançamento conforme disponíveis no catálogo"}{lyrics.releaseDate ? ` · Ano: ${String(lyrics.releaseDate).slice(0,4)}` : ""}{lyrics.genre ? ` · Gênero: ${lyrics.genre}` : ""}</p>
        <div className="reference-song-actions"><button className="reference-yellow" onClick={onVideo}><Play size={16} fill="currentColor"/> Ouvir</button><button onClick={onPrint}><Printer size={16}/> Imprimir</button><button onClick={onDownload}><Download size={16}/> Baixar</button><button onClick={onShare}><Share2 size={16}/> Compartilhar</button><span className="reference-font-controls"><button onClick={()=>setFontScale(Math.max(.8,fontScale-.1))}>A-</button><button onClick={()=>setFontScale(Math.min(1.4,fontScale+.1))}>A+</button></span><button className={saved ? "reference-save is-saved" : "reference-save"} onClick={onSave}><Heart size={17} fill={saved ? "currentColor" : "none"}/> Favoritar</button></div>
      </div>
    </section>
    <div className="reference-song-grid">
      <section className="reference-lyrics-card"><h2>Letra de {lyrics.title}</h2><div className="reference-lyrics-text" style={{fontSize:`calc(14px * ${fontScale})`}}>{loading ? "Carregando letra..." : lyrics.text}</div><small className="reference-rights-note">As letras são exibidas somente quando disponíveis no provedor consultado.</small></section>
      <section className="reference-video-column"><div className="reference-video-card"><h2>Vídeo relacionado</h2>
        {video ? <><div className="reference-video-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.videoId)}?rel=0`} title={`${lyrics.title} — vídeo relacionado`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/></div><div className="reference-video-details"><strong>{video.title}</strong><span>{video.channel || lyrics.artist}</span><a href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.videoId)}`} target="_blank" rel="noreferrer">Assistir no YouTube <ArrowRight size={14}/></a></div></>
        : <div className="reference-video-empty"><Youtube size={40}/><strong>{videoLoading ? "Localizando vídeo..." : "Vídeo oficial ou relacionado"}</strong><p>{videoError || "Carregue um vídeo relacionado a esta música."}</p><button className="reference-yellow" onClick={onVideo} disabled={videoLoading}><Play size={15} fill="currentColor"/> {videoLoading ? "Buscando..." : "Carregar vídeo"}</button></div>}
      </div><section className="reference-related-card"><h2>Mais de {lyrics.artist}</h2>{extras.length ? extras.slice(0,5).map((item,i)=><button key={item.id || item.title} onClick={()=>onOpen(item)}><Cover item={item} index={i}/><span><strong>{item.title}</strong><small>{item.artist}</small></span><ChevronRight size={14}/></button>) : <p>Pesquise outras músicas de {lyrics.artist} para ver faixas relacionadas aqui.</p>}</section></section>
      <aside className="reference-side-column"><section className="reference-related-card"><h2>Músicas relacionadas</h2>{catalog.filter(item=>normalize(item.title)!==normalize(lyrics.title)).slice(0,5).map((item,i)=><button key={item.id || item.title} onClick={()=>onOpen(item)}><Cover item={item} index={i}/><span><strong>{item.title}</strong><small>{item.artist}</small></span><ChevronRight size={14}/></button>)}</section></aside>
    </div>
    <section className="reference-other-songs"><div className="reference-other-heading"><h2>Outras músicas de {lyrics.artist}</h2><a href="#busca" onClick={onBack}>Ver mais <ChevronRight size={14}/></a></div>{extras.length ? <div className="reference-song-strip">{extras.map((item,i)=><button key={item.id || item.title} onClick={()=>onOpen(item)}><Cover item={item} index={i}/><strong>{item.title}</strong><small>{item.artist}</small></button>)}</div> : <p>Pesquise pelo artista para descobrir outras músicas do catálogo.</p>}</section>
  </main>;
}

export default function App() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [genre, setGenre] = useState("Todos");
  const [results, setResults] = useState([]);
  const [chart, setChart] = useState([]);
  const [country, setCountry] = useState("br");
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lyrics, setLyrics] = useState(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [video, setVideo] = useState(null);
  const [videoError, setVideoError] = useState("");
  const [account, setAccount] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [authMode, setAuthMode] = useState("register");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [supportSubject, setSupportSubject] = useState("Problemas com músicas ou letras");
  const [supportDescription, setSupportDescription] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportBusy, setSupportBusy] = useState(false);
  const [supportError, setSupportError] = useState("");
  const [ticketResult, setTicketResult] = useState(null);
  const [ticketProtocol, setTicketProtocol] = useState("");
  const [ticketEmailLookup, setTicketEmailLookup] = useState("");
  const [ticketLookupResult, setTicketLookupResult] = useState(null);
  const [ticketLookupError, setTicketLookupError] = useState("");
  const [songFontScale, setSongFontScale] = useState(1);

  useEffect(() => {
    const token = window.localStorage.getItem("somletra_token");
    if (!token) return;
    fetch("/api/auth/me", { headers: { Authorization: "Bearer " + token } }).then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data.error || "Sessão expirada."); setAccount(data.user); setSaved(Array.isArray(data.user.favorites) ? data.user.favorites : []); }).catch(() => window.localStorage.removeItem("somletra_token"));
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`/api/charts?country=${country}`).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Ranking indisponível.");
      if (active) setChart(Array.isArray(data.items) ? data.items : []);
    }).catch(() => { if (active) setChart([]); });
    return () => { active = false; };
  }, [country]);

  const search = async (term, nextPage = 1) => {
    const clean = term.trim();
    if (clean.length < 2) { setMessage("Digite pelo menos duas letras para pesquisar."); return; }
    setLoading(true);
    setSubmittedQuery(clean);
    setMessage("");
    try {
      const response = await fetch(`/api/music-search?q=${encodeURIComponent(clean)}&page=${nextPage}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível pesquisar agora.");
      const cleanItems = (Array.isArray(data.items) ? data.items : []).filter((item) => {
        const q = normalize(clean);
        const full = normalize([item.title, item.artist, item.album].join(" "));
        const words = q.split(/\s+/).filter((word) => word.length > 1);
        return full.includes(q) || words.length > 0 && words.every((word) => full.includes(word));
      });
      setResults(cleanItems);
      setPage(nextPage);
      setHasMore(Boolean(data.hasMore));
      setSource(data.source || "Catálogo musical");
      setMessage(cleanItems.length ? `${cleanItems.length} resultados relevantes encontrados.` : `Não encontramos resultados confiáveis para “${clean}”. Tente o nome completo ou confira a grafia.`);
      document.getElementById("busca-resultados")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      setResults([]);
      setHasMore(false);
      setMessage(error.message || "Falha na pesquisa. Tente novamente.");
    } finally { setLoading(false); }
  };

  const lookupTicket = async (event) => { event.preventDefault(); setTicketLookupError(""); setTicketLookupResult(null); try { const token = window.localStorage.getItem("somletra_token"); const params = new URLSearchParams(); if (ticketProtocol.trim()) params.set("protocol", ticketProtocol.trim()); if (ticketEmailLookup.trim()) params.set("email", ticketEmailLookup.trim()); const response = await fetch("/api/support/tickets?" + params.toString(), { headers: token ? { Authorization: "Bearer " + token } : {} }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Não foi possível consultar o chamado."); setTicketLookupResult(data.tickets || []); } catch (error) { setTicketLookupError(error.message || "Falha na consulta."); } };
  const loadMusicVideo = async () => {
    if (!lyrics) return;
    setVideoLoading(true);
    setVideoError("");
    try {
      const q = `${lyrics.title} ${lyrics.artist} official music video`;
      const response = await fetch(`/api/music-video?q=${encodeURIComponent(q)}`);
      const data = await response.json();
      if (!response.ok || !data.video?.videoId) throw new Error(data.error || "Vídeo relacionado não encontrado.");
      setVideo(data.video);
    } catch (error) {
      setVideoError(error.message || "Não foi possível carregar o vídeo.");
    } finally {
      setVideoLoading(false);
    }
  };
  useEffect(() => {
    if (lyrics?.title && lyrics.text !== "Carregando letra...") loadMusicVideo();
  }, [lyrics?.title, lyrics?.artist, lyrics?.text]);

  const visibleChart = useMemo(() => chart.slice(0, 10), [chart]);
  const toggleSaved = (item) => { setSaved((old) => { const next = old.some((x) => x.id === item.id) ? old.filter((x) => x.id !== item.id) : [...old, item]; const token = window.localStorage.getItem("somletra_token"); if (token) fetch("/api/account/favorites", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ favorites: next }) }).then(async (r) => { if (!r.ok) { const d = await r.json(); setMessage(d.error || "Não foi possível sincronizar os favoritos."); } }).catch(() => setMessage("Não foi possível sincronizar os favoritos.")); else setMessage("Entre em Meus Dados para manter seus favoritos salvos na conta."); return next; }); };
  const submitAuth = async (event) => { event.preventDefault(); setAuthBusy(true); setAuthError(""); try { const response = await fetch(authMode === "register" ? "/api/auth/register" : "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: authName, email: authEmail, password: authPassword }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Não foi possível autenticar."); window.localStorage.setItem("somletra_token", data.token); setAccount(data.user); setSaved(data.user.favorites || []); setAuthPassword(""); } catch (error) { setAuthError(error.message || "Falha ao conectar."); } finally { setAuthBusy(false); } };
  const signOut = async () => { const token = window.localStorage.getItem("somletra_token"); if (token) await fetch("/api/auth/logout", { method: "POST", headers: { Authorization: "Bearer " + token } }).catch(() => {}); window.localStorage.removeItem("somletra_token"); setAccount(null); setSaved([]); setAuthMode("login"); };
  const submitSupport = async (event) => { event.preventDefault(); setSupportBusy(true); setSupportError(""); setTicketResult(null); try { const token = window.localStorage.getItem("somletra_token"); const response = await fetch("/api/support/tickets", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: JSON.stringify({ subject: supportSubject, description: supportDescription, email: supportEmail }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Não foi possível registrar o chamado."); setTicketResult(data.ticket); setSupportDescription(""); } catch (error) { setSupportError(error.message || "Falha ao registrar o chamado."); } finally { setSupportBusy(false); } };
  const downloadLyrics = (item) => { const blob = new Blob([`${item.title} — ${item.artist}\
\
${item.text}`], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${item.title || "letra"}.txt`.replace(/[\\\\/:*?"<>|]/g, "-"); document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); };

  const openLyrics = async (item) => {
    setVideo(null);
    setVideoError("");
    setLyricsLoading(true);
    setLyrics({ title: item.title, artist: item.artist, text: "Carregando letra...", previewUrl: item.previewUrl || "" });
    try {
      const endpoint = String(item.id || "").startsWith("itunes-") || String(item.id || "").startsWith("mb-")
        ? `/api/lyrics/search?title=${encodeURIComponent(item.title)}&artist=${encodeURIComponent(item.artist)}`
        : `/api/lyrics/${encodeURIComponent(item.id)}`;
      const response = await fetch(endpoint);
      const data = await response.json();
      setLyrics({ ...item, title: data.trackName || item.title, artist: data.artistName || item.artist, text: data.lyrics || (response.status === 503 || response.status === 502 ? "Letra indisponível no momento. Tente novamente mais tarde." : "Letra não encontrada para esta música."), previewUrl: item.previewUrl || "" });
    } catch { setLyrics({ ...item, title: item.title, artist: item.artist, text: "Letra indisponível no momento. Tente novamente mais tarde.", previewUrl: item.previewUrl || "" }); }
    finally { setLyricsLoading(false); }
  };

  const songCatalog = useMemo(() => [...results, ...chart.map((item) => ({...item, title:item.title || item.name, artist:item.artist || item.artistName, artworkUrl:item.artworkUrl || item.artworkUrl100}))], [results, chart]);
  const backToPortal = () => { setLyrics(null); setVideo(null); setVideoError(""); };
  const shareCurrentSong = async () => { try { if (navigator.share) await navigator.share({title:lyrics?.title || "Site Músicas", text:`${lyrics?.title || ""} — ${lyrics?.artist || ""}`, url:window.location.href}); else if (navigator.clipboard) await navigator.clipboard.writeText(window.location.href); } catch {} };
  const saveCurrentSong = () => { if (lyrics?.id) toggleSaved({...lyrics, id:lyrics.id, title:lyrics.title, artist:lyrics.artist}); else setMessage("Pesquise esta música no catálogo para adicioná-la aos favoritos."); };
  const downloadCurrentSong = () => {
    if (!lyrics) return;
    const blob = new Blob([`${lyrics.title} — ${lyrics.artist}\\n\\n${lyrics.text || ""}`], {type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`${lyrics.title || "musica"}.txt`.replace(/[\\\\/:*?"<>|]/g,"-"); document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  return <div className={lyrics ? "portal portal--song-open" : "portal"}>
    <div className="portal-topline"><span><Sparkles size={13}/> Descubra a história por trás de cada música</span><span className="portal-topline__right">Música conecta pessoas</span></div>
    {lyrics && <header className="reference-site-header"><div className="reference-site-header__top"><Brand onClick={backToPortal}/><form className="reference-header-search" onSubmit={(event)=>{event.preventDefault();backToPortal();if(query.trim())search(query,1);}}><Search size={19}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar por música, artista ou trecho da letra..."/><button aria-label="Buscar"><Search size={18}/></button></form><div className="reference-quick-actions"><button onClick={()=>{setProfileOpen(true);setAuthMode("login");}}>♛ Premium</button><button onClick={()=>{setProfileOpen(true);setAuthMode("login");}}><UserRound size={15}/> Entrar</button><button className="reference-yellow" onClick={()=>setProfileOpen(true)}>Meus Dados</button></div></div><nav className="reference-site-nav"><a href="#inicio" onClick={backToPortal}><Home size={15}/> Início</a><a href="#busca" onClick={backToPortal}><Music2 size={15}/> Letras</a><a href="#artistas" onClick={backToPortal}><UserRound size={15}/> Artistas</a><a href="#destaques" onClick={backToPortal}><Disc3 size={15}/> Álbuns</a><a href="#generos" onClick={backToPortal}><ListMusic size={15}/> Playlists</a><a href="#destaques" onClick={backToPortal}><Music2 size={15}/> Em Alta</a><a href="#generos" onClick={backToPortal}>Gêneros⌄</a><button onClick={()=>setSupportOpen(true)}><Headphones size={16}/> Suporte</button></nav></header>}
    <header className="portal-header">
      <a className="portal-brand" href="#" aria-label="Som & Letra início"><span className="portal-brand__mark"><AudioLines size={24}/></span><span>som<span>&</span>letra</span></a>
       <nav className={mobileOpen ? "portal-nav portal-nav--open" : "portal-nav"}><a href="#inicio" onClick={() => setMobileOpen(false)}>Início</a><a href="#busca" onClick={() => setMobileOpen(false)}>Explorar</a><a href="#destaques" onClick={() => setMobileOpen(false)}>Top 10</a><a href="#generos" onClick={() => setMobileOpen(false)}>Gêneros</a><a href="#artistas" onClick={() => setMobileOpen(false)}>Artistas</a><button onClick={() => { setProfileOpen(true); setMobileOpen(false); }}>Meus Dados</button><button onClick={() => { setSupportOpen(true); setMobileOpen(false); }}>Suporte</button><button onClick={() => { setProfileOpen(true); setMobileOpen(false); }}><Heart size={14}/> Favoritos</button></nav><div className="portal-header-actions"><a href="#busca" className="portal-search-link"><Search size={17}/> Buscar música</a><button className="portal-account-button" onClick={() => setProfileOpen(true)}><UserRound size={16}/><span>{account ? account.name.split(" ")[0] : "Meus Dados"}</span></button><button className="portal-mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Abrir menu">{mobileOpen ? <X/> : <Menu/>}</button></div></header>

    <main id="inicio">
      <section className="portal-hero">
        <div className="portal-hero__content"><span className="portal-kicker"><span/> SEU UNIVERSO MUSICAL</span><h1>Uma música.<br/><em>Mil sentimentos.</em></h1><p>Encontre letras, descubra artistas e relembre as músicas que fazem parte da sua história.</p>
          <form className="portal-search" id="busca" onSubmit={(e) => { e.preventDefault(); search(query, 1); }}><Search size={21}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Qual música ou artista você procura?" aria-label="Pesquisar música ou artista"/><button disabled={loading}>{loading ? "Buscando..." : "Pesquisar"} <ArrowRight size={17}/></button></form>
          <div className="portal-search-hint"><span>Experimente:</span>{["Bruna Karla", "Legião Urbana", "Marília Mendonça"].map((term) => <button key={term} onClick={() => { setQuery(term); search(term, 1); }}>{term}</button>)}</div>
        </div>
        <div className="portal-hero__visual" aria-hidden="true"><div className="portal-hero-disc"><div className="portal-hero-disc__center"><AudioLines size={36}/></div></div><div className="portal-floating-note portal-floating-note--one"><Music2 size={19}/><span>Uma trilha<br/>para cada fase</span></div><div className="portal-floating-note portal-floating-note--two"><Heart size={18}/><span>Canções que<br/>marcam a vida</span></div><div className="portal-hero-sticker">♪</div></div>
      </section>

      {submittedQuery && <section className="portal-results portal-section" id="busca-resultados"><div className="portal-section-heading"><div><span className="portal-kicker">PESQUISA MUSICAL</span><h2>Resultados para <em>“{submittedQuery}”</em></h2><p>{message || "Buscando no catálogo musical..."}</p>{source && <small>Fonte consultada: {source}</small>}</div><button className="portal-text-button" onClick={() => { setSubmittedQuery(""); setResults([]); setMessage(""); }}>Limpar pesquisa <X size={15}/></button></div>
        {results.length > 0 ? <><div className="portal-result-list">{results.map((item, i) => <article className="portal-result" key={item.id || `${item.title}-${i}`}><Cover item={item} index={i}/><div className="portal-result__info"><h3>{item.title}</h3><p>{item.artist}</p><small>{item.album || item.genre || "Faixa musical"}{item.releaseDate ? ` · ${String(item.releaseDate).slice(0,4)}` : ""}</small></div><button className="portal-icon-button" onClick={() => toggleSaved(item)} aria-label="Salvar música"><Heart size={18} fill={saved.some((x) => x.id === item.id) ? "currentColor" : "none"}/></button><button className="portal-result__open" onClick={() => openLyrics(item)}>Ver letra <ChevronRight size={16}/></button></article>)}</div>{(page > 1 || hasMore) && <div className="portal-pagination"><button disabled={page <= 1 || loading} onClick={() => search(submittedQuery, page - 1)}>Anterior</button><span>Página {page}</span><button disabled={!hasMore || loading} onClick={() => search(submittedQuery, page + 1)}>Próxima <ArrowRight size={15}/></button></div>}</> : <div className="portal-empty"><Search size={25}/><strong>{loading ? "Pesquisando..." : "Nenhum resultado relevante"}</strong><p>{message}</p></div>}
      </section>}

      <section className="portal-section" id="destaques">
        <div className="portal-section-heading">
          <div><span className="portal-kicker">RANKINGS MUSICAIS</span><h2>Em alta <em>agora.</em></h2><p>Top 10 por região, com fonte e atualização identificadas.</p></div>
          <div className="portal-tabs"><button className={country === "br" ? "active" : ""} onClick={() => setCountry("br")}>🇧🇷 Brasil</button><button className={country === "us" ? "active" : ""} onClick={() => setCountry("us")}>🌎 Global</button></div>
        </div>
        <p className="portal-chart-source"><Youtube size={15}/> Os dados atualmente disponíveis são do Apple Music, não do ranking oficial do YouTube. Não apresentamos essa lista como um Top 10 do YouTube.</p>
        {visibleChart.length ? <div className="portal-feature-grid">{visibleChart.map((item,i)=><article className="portal-feature" key={item.id}><div className="portal-feature__cover"><Cover item={{...item,title:item.title || item.name,artworkUrl:item.artworkUrl || item.artworkUrl100}} index={i}/><span className="portal-feature__rank">#{item.rank || i+1}</span><a href={item.url || "#"} target="_blank" rel="noreferrer" aria-label={`Abrir ${item.title || item.name}`}><Play size={17} fill="currentColor"/></a></div><div className="portal-feature__info"><h3>{item.title || item.name}</h3><p>{item.artist || item.artistName}</p><small>{item.genres?.[0]?.name || item.genre || "Música em destaque"}</small></div></article>)}</div> : <div className="portal-empty portal-empty--inline"><Disc3 size={22}/><p>O ranking musical não está disponível neste momento. Tente novamente mais tarde.</p></div>}
      </section>

      <section className="portal-artist-band" id="artistas"><div><span className="portal-kicker">ENCONTRE SUA PRÓXIMA PAIXÃO</span><h2>Artistas que fazem<br/><em>a trilha da nossa vida.</em></h2><p>Pesquise pelo nome do cantor para encontrar faixas, álbuns e informações disponíveis no catálogo.</p><a href="#busca" onClick={() => document.querySelector(".portal-search input")?.focus()}>Encontrar um artista <ArrowRight size={17}/></a></div><div className="portal-artist-band__art"><div className="portal-artist-circle"><Mic2 size={54}/></div><span>VOZES QUE MARCAM</span></div></section>

      <section className="portal-section portal-genres" id="generos"><div className="portal-section-heading"><div><span className="portal-kicker">EXPLORE POR ESTILO</span><h2>Qual é o seu <em>som?</em></h2><p>Escolha um gênero e pesquise músicas relacionadas quando disponíveis.</p></div></div><div className="portal-genre-grid">{genres.filter((g)=>g!=="Todos").map((g,i)=><button key={g} className="portal-genre" onClick={()=>{setGenre(g);setQuery(g);search(g,1);}}><span className={`portal-genre__icon portal-genre__icon--${i%6}`}>{i%3===0?<Headphones size={19}/>:i%3===1?<Music2 size={19}/>:<Disc3 size={19}/>}</span><span>{g}</span><ArrowRight size={15}/></button>)}</div></section>

      <section className="portal-newsletter"><div className="portal-newsletter__icon"><AudioLines size={25}/></div><div><span className="portal-kicker">SOM & LETRA</span><h2>As músicas contam histórias. <em>Encontre a sua.</em></h2><p>Explore nosso portal e descubra sua próxima música favorita.</p></div><a href="#busca" onClick={() => document.querySelector(".portal-search input")?.focus()}>Começar agora <ArrowRight size={16}/></a></section>
    </main>
    <footer className="portal-footer"><div className="portal-footer__main"><a className="portal-brand" href="#"><span className="portal-brand__mark"><AudioLines size={22}/></span><span>som<span>&</span>letra</span></a><p>Descobrindo sons, conectando histórias.</p><nav><a href="#destaques">Destaques</a><a href="#artistas">Artistas</a><a href="#generos">Gêneros</a><a href="#busca">Pesquisar</a></nav></div><div className="portal-footer__bottom"><span>© {new Date().getFullYear()} {institutional.brandName || "Som & Letra"}. Todos os direitos reservados.</span><span>Dados musicais fornecidos por fontes externas. Letras completas exibidas apenas quando disponíveis e autorizadas.</span></div></footer>

    <button className="portal-support-fab" onClick={() => setSupportOpen(true)} aria-label="Abrir suporte"><LifeBuoy size={20}/><span>Suporte</span></button>
    {profileOpen && <div className="portal-overlay" role="dialog" aria-modal="true" aria-label="Meus Dados"><section className="portal-panel"><button className="portal-panel-close" onClick={() => setProfileOpen(false)} aria-label="Fechar"><X/></button>{account ? <><div className="portal-profile-heading"><div className="portal-avatar"><CircleUserRound size={32}/></div><div><span className="portal-kicker">SEU ESPAÇO MUSICAL</span><h2>Olá, {account.name}</h2><p>{account.email}</p></div></div><div className="portal-profile-stats"><div><Heart size={18}/><strong>{saved.length}</strong><span>Favoritos</span></div><div><ListMusic size={18}/><strong>—</strong><span>Playlists</span></div></div><h3>Minhas músicas favoritas</h3>{saved.length ? <div className="portal-saved-list">{saved.map((item) => <div key={item.id} className="portal-saved-item"><Cover item={item}/><div><strong>{item.title}</strong><span>{item.artist}</span></div><button onClick={() => toggleSaved(item)} aria-label="Remover dos favoritos"><X size={16}/></button></div>)}</div> : <p className="portal-muted">Ainda não há favoritos salvos na sua conta.</p>}<button className="portal-primary-button" onClick={signOut}><LogOut size={17}/> Sair da conta</button></> : <><div className="portal-profile-heading"><div className="portal-avatar"><UserRound size={30}/></div><div><span className="portal-kicker">MEUS DADOS</span><h2>{authMode === "register" ? "Entre no seu universo musical" : "Bem-vindo de volta"}</h2><p>Salve favoritos e personalize sua experiência.</p></div></div><div className="portal-auth-tabs"><button className={authMode === "register" ? "active" : ""} onClick={() => {setAuthMode("register");setAuthError("");}}>Criar conta</button><button className={authMode === "login" ? "active" : ""} onClick={() => {setAuthMode("login");setAuthError("");}}>Já tenho conta</button></div><form className="portal-form" onSubmit={submitAuth}>{authMode === "register" && <label>Nome<input value={authName} onChange={e=>setAuthName(e.target.value)} autoComplete="name" required minLength={2} maxLength={80}/></label>}<label>E-mail<input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} autoComplete="email" required/></label><label>Senha<input type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} autoComplete={authMode === "register" ? "new-password" : "current-password"} minLength={authMode === "register" ? 10 : 1} required/><small>{authMode === "register" ? "Use pelo menos 10 caracteres." : "Digite sua senha para entrar."}</small></label><p className="portal-muted">Ao continuar, você concorda com os termos de uso e a política de privacidade.</p>{authError && <p className="portal-form-error">{authError}</p>}<button className="portal-primary-button" disabled={authBusy}>{authBusy ? "Aguarde..." : authMode === "register" ? "Criar minha conta" : "Entrar"} <ArrowRight size={17}/></button></form><p className="portal-muted portal-small-note">A recuperação de senha por e-mail depende da configuração de um serviço de envio.</p></>}</section></div>}
    {supportOpen && <div className="portal-overlay portal-overlay--support" role="dialog" aria-modal="true" aria-label="Central de suporte"><section className="portal-panel"><button className="portal-panel-close" onClick={() => setSupportOpen(false)} aria-label="Fechar"><X/></button><div className="portal-profile-heading"><div className="portal-avatar"><LifeBuoy size={28}/></div><div><span className="portal-kicker">CENTRAL DE ATENDIMENTO</span><h2>Como podemos ajudar?</h2><p>Envie sua solicitação e receba um protocolo.</p></div></div>{ticketResult ? <div className="portal-ticket-success"><span>Chamado registrado</span><strong>{ticketResult.protocol}</strong><p>Status: {ticketResult.status}</p><button className="portal-primary-button" onClick={() => setTicketResult(null)}>Abrir outro chamado</button></div> : <form className="portal-form" onSubmit={submitSupport}><label>Assunto<select value={supportSubject} onChange={e=>setSupportSubject(e.target.value)}>{["Problemas com músicas ou letras","Ajuda com cadastro e login","Minhas músicas favoritas","Problemas técnicos","Sugestões de melhorias","Direitos autorais e conteúdo","Outros assuntos"].map(x=><option key={x}>{x}</option>)}</select></label>{!account && <label>E-mail para contato<input type="email" value={supportEmail} onChange={e=>setSupportEmail(e.target.value)} required/></label>}<label>Descreva como podemos ajudar<textarea value={supportDescription} onChange={e=>setSupportDescription(e.target.value)} minLength={10} maxLength={5000} rows={5} required placeholder="Conte o que aconteceu..."/></label>{supportError && <p className="portal-form-error">{supportError}</p>}<button className="portal-primary-button" disabled={supportBusy}>{supportBusy ? "Enviando..." : "Enviar solicitação"} <Send size={17}/></button></form>}<div className="portal-support-help"><strong>Consultar chamado</strong><form className="portal-ticket-lookup" onSubmit={lookupTicket}><input value={ticketProtocol} onChange={e=>setTicketProtocol(e.target.value)} placeholder="Protocolo SL-..." required={!account}/>{!account && <input type="email" value={ticketEmailLookup} onChange={e=>setTicketEmailLookup(e.target.value)} placeholder="E-mail usado no chamado" required/>}<button className="portal-primary-button">Consultar status</button></form>{ticketLookupError && <p className="portal-form-error">{ticketLookupError}</p>}{ticketLookupResult && (ticketLookupResult.length ? ticketLookupResult.map(t=><div className="portal-ticket-status" key={t.protocol}><strong>{t.protocol} · {t.status}</strong><span>{t.subject}</span>{t.messages?.map((m,i)=><p key={i}>{m.text}</p>)}</div>) : <p>Nenhum chamado encontrado com esses dados.</p>)}</div></section></div>}
    {lyrics && <MusicPage key={lyrics.id || lyrics.title} lyrics={lyrics} loading={lyricsLoading} video={video} videoLoading={videoLoading} videoError={videoError} onBack={backToPortal} onPrint={()=>window.print()} onDownload={downloadCurrentSong} onShare={shareCurrentSong} onVideo={loadMusicVideo} onSave={saveCurrentSong} saved={saved.some(item=>item.id===lyrics.id)} catalog={songCatalog} onOpen={openLyrics} fontScale={songFontScale} setFontScale={setSongFontScale}/>}

  </div>;
}
