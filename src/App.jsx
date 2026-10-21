import { useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Square, Search, Music2, SkipForward, Heart, Menu, X, ArrowRight, ChevronRight, Play, Disc3, Mic2, Headphones, Sparkles, BookOpen, Crown, Printer, Download, Share2, Youtube, Home, UserRound, LifeBuoy, Send, LogOut, CircleUserRound, ListMusic } from "lucide-react";
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

function MusicPage({ lyrics, loading, video, videoLoading, videoError, onBack, onPrint, onDownload, onShare, onVideo, onListen, onNextTrack, nextTrackLoading, onSave, saved, catalog, onOpen, fontScale, setFontScale, account, comments, commentsLoading, commentText, setCommentText, onSubmitComment, commentError, commentNotice, audioRef, isPreviewPlaying, previewTime, previewDuration, onSeekPreview }) {
  const artistItems = catalog.filter((item) => normalize(item.artist) === normalize(lyrics.artist) && normalize(item.title) !== normalize(lyrics.title)).slice(0, 5);
  const relatedItems = catalog.filter((item) => normalize(item.title) !== normalize(lyrics.title) && normalize(item.artist) !== normalize(lyrics.artist) && (lyrics.genre ? normalize(item.genre || item.genres?.[0]?.name).includes(normalize(lyrics.genre)) : true)).slice(0, 5);
  const hasLyrics = Boolean(lyrics.text && !/^(carregando letra|letra indisponível|letra não encontrada|não foi possível carregar)/i.test(lyrics.text.trim()));
  const youtubeUrl = video ? "https://www.youtube.com/watch?v=" + encodeURIComponent(video.videoId) : "https://www.youtube.com/results?search_query=" + encodeURIComponent(lyrics.title + " " + lyrics.artist);
  return <main className="reference-song-page">
    <div className="reference-print-brand"><div className="reference-print-brand__logo">♫</div><div><strong>Site <em>Músicas</em></strong><small>LETRAS QUE TOCAM VOCÊ · sitemusicas.vps11710.panel.icontainer.work</small></div></div>
    <div className="reference-breadcrumb"><a href="#inicio" onClick={onBack}>Início</a><ChevronRight size={14}/><a href="#busca" onClick={onBack}>{lyrics.artist}</a><ChevronRight size={14}/><span>{lyrics.title}</span></div>
    <div className="reference-song-layout">
      <div className="reference-song-main">
        <section className="reference-song-hero">
          <Cover item={{...lyrics, artworkUrl:lyrics.artworkUrl}} index={0} className="reference-song-cover"/>
          <div className="reference-song-meta"><h1>{lyrics.title}</h1><p className="reference-song-artist">{lyrics.artist}</p>
            <p className="reference-song-album">{lyrics.album ? `Álbum: ${lyrics.album}` : "Detalhes do lançamento conforme disponíveis no catálogo"}{lyrics.releaseDate ? ` · Ano: ${String(lyrics.releaseDate).slice(0,4)}` : ""}{lyrics.genre ? ` · Gênero: ${lyrics.genre}` : ""}</p>
            <div className="reference-song-actions"><button className="reference-yellow" onClick={onListen}>{isPreviewPlaying ? <><Square size={15} fill="currentColor"/> Parar música</> : <><Play size={16} fill="currentColor"/> Ouvir música</>}</button><button onClick={onNextTrack} disabled={nextTrackLoading} title="Carregar outra música deste artista"><SkipForward size={16}/>{nextTrackLoading ? "Buscando..." : "Próxima do artista"}</button><button onClick={onPrint}><Printer size={16}/> Imprimir</button><button onClick={onDownload} disabled={!hasLyrics}><Download size={16}/> Baixar (PDF)</button><button onClick={onShare}><Share2 size={16}/> Compartilhar</button><span className="reference-font-controls"><button onClick={()=>setFontScale(Math.max(.8,fontScale-.1))} aria-label="Diminuir fonte">A-</button><button onClick={()=>setFontScale(Math.min(1.4,fontScale+.1))} aria-label="Aumentar fonte">A+</button></span><button className={saved ? "reference-save is-saved" : "reference-save"} onClick={onSave}><Heart size={17} fill={saved ? "currentColor" : "none"}/> Favoritar</button></div>
          </div>
        </section>
        <section className="reference-inline-player" aria-label="Mini player musical">
          {lyrics.previewUrl && <audio ref={audioRef} src={lyrics.previewUrl} preload="metadata" onTimeUpdate={(event)=>setPreviewTime(event.currentTarget.currentTime || 0)} onDurationChange={(event)=>{const duration=event.currentTarget.duration;if(Number.isFinite(duration)&&duration>0)setPreviewDuration(duration)}} onLoadedMetadata={(event)=>{const duration=event.currentTarget.duration;if(Number.isFinite(duration)&&duration>0)setPreviewDuration(duration)}} onLoadedData={(event)=>{const audio=event.currentTarget;if(Number.isFinite(audio.duration)&&audio.duration>0)setPreviewDuration(audio.duration);setPreviewTime(audio.currentTime||0)}} onPlaying={()=>setIsPreviewPlaying(true)} onPause={()=>setIsPreviewPlaying(false)} onEnded={()=>{setIsPreviewPlaying(false);setPreviewTime(0)}} />}
          <div className="reference-inline-player__top"><span className="reference-inline-player__disc"><AudioLines size={19}/></span><div><strong>{lyrics.previewUrl ? (isPreviewPlaying ? "Tocando agora" : "Mini player") : (video ? "Player oficial incorporado" : "Player da música completa")}</strong><small>{lyrics.previewUrl ? "Prévia de áudio do catálogo musical" : "Buscando versão oficial completa quando disponível"}</small></div><button type="button" onClick={onListen} className="reference-yellow">{lyrics.previewUrl ? (isPreviewPlaying ? "Parar música" : "Ouvir prévia") : (video ? "Ouvir no player" : videoLoading ? "Carregando..." : "Carregar música")}</button></div>
          {lyrics.previewUrl ? <div className="reference-inline-player__timeline"><span>{Math.floor(previewTime/60)}:{String(Math.floor(previewTime%60)).padStart(2,"0")}</span><input type="range" min="0" max={Math.max(1,previewDuration)} step="0.1" value={Math.min(previewTime,previewDuration || 0)} onChange={(event)=>onSeekPreview(Number(event.target.value))} aria-label="Avançar ou retroceder na prévia"/><span>{Math.floor(previewDuration/60)}:{String(Math.floor(previewDuration%60)).padStart(2,"0")}</span></div> : <div className="reference-inline-player__timeline reference-inline-player__timeline--unavailable"><span>--:--</span><input type="range" min="0" max="1" value="0" disabled aria-label="Barra indisponível sem prévia de áudio"/><span>--:--</span></div>}
          <p className="reference-inline-player__notice">{lyrics.previewUrl ? "A barra permite avançar e voltar dentro da prévia disponível. A duração depende do catálogo; nem toda faixa oferece a música completa." : "Para evitar redirecionamentos, carregue o player oficial abaixo. O controle de avanço do YouTube fica dentro do próprio player; não é possível controlar o áudio do YouTube por esta barra personalizada."}</p>
        </section>
        <div className="reference-song-grid">
          <section className="reference-lyrics-card"><h2>Letra de {lyrics.title}</h2><div className="reference-lyrics-text" style={{fontSize:`calc(14px * ${fontScale})`}}>{loading ? "Carregando letra..." : lyrics.text}</div><small className="reference-rights-note">As letras são exibidas somente quando disponíveis no provedor consultado.</small></section>
          <section className="reference-video-column">
            <div className="reference-video-card"><h2>Vídeo relacionado</h2>
              {video ? <><div className="reference-video-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.videoId)}?rel=0`} title={`${lyrics.title} — vídeo relacionado`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/></div><div className="reference-video-details"><strong>{video.title}</strong><span>{video.channel || lyrics.artist}</span><a href={youtubeUrl} target="_blank" rel="noreferrer">Assistir no YouTube <ArrowRight size={14}/></a></div></>
              : <div className="reference-video-empty"><Youtube size={40}/><strong>{videoLoading ? "Localizando vídeo..." : "Vídeo oficial ou relacionado"}</strong><p>{videoError || "Busque um vídeo correspondente a esta música."}</p><button className="reference-yellow" onClick={onVideo} disabled={videoLoading}><Play size={15} fill="currentColor"/> {videoLoading ? "Buscando..." : "Carregar vídeo"}</button></div>}
            </div>
            {video && <div className="reference-video-channel"><div className="reference-video-channel__icon"><Youtube size={25}/></div><div><strong>{video.channel || lyrics.artist}</strong><span>{video.title}</span></div><a href={youtubeUrl} target="_blank" rel="noreferrer">Assistir no YouTube <ArrowRight size={14}/></a></div>}
            <a className="reference-listen-promo" href={youtubeUrl} target="_blank" rel="noreferrer"><span className="reference-listen-promo__icon"><Music2 size={29}/></span><span><strong>Ouça agora no YouTube</strong><small>Assista ao clipe e curta essa emoção.</small></span><ChevronRight size={23}/></a>
          </section>
        </div>
      </div>
      <aside className="reference-song-sidebar">
        <section className="reference-related-card"><h2>Mais de {lyrics.artist}</h2>{artistItems.length ? artistItems.map((item,i)=><button key={item.id || item.title} onClick={()=>onOpen(item)}><Cover item={item} index={i}/><span><strong>{item.title}</strong><small>{item.artist}</small></span><ChevronRight size={14}/></button>) : <p>Não há outras músicas desse artista no catálogo disponível.</p>}</section>
        <section className="reference-related-card"><h2>Músicas relacionadas</h2>{relatedItems.length ? relatedItems.map((item,i)=><button key={item.id || item.title} onClick={()=>onOpen(item)}><Cover item={item} index={i}/><span><strong>{item.title}</strong><small>{item.artist}</small></span><ChevronRight size={14}/></button>) : <p>Não há recomendações correspondentes no catálogo disponível.</p>}</section>
      </aside>
    </div>
    <section className="reference-comments-card">
      <div className="reference-comments-heading"><div><h2>Comentários sobre a música</h2><p>Compartilhe sua opinião com a comunidade Site Músicas.</p></div><span>{comments.length} {comments.length === 1 ? "comentário" : "comentários"}</span></div>
      {account ? <form className="reference-comment-form" onSubmit={onSubmitComment}><label htmlFor="song-comment">Seu comentário</label><textarea id="song-comment" value={commentText} onChange={(event)=>setCommentText(event.target.value)} placeholder="O que essa música significa para você?" rows={3} maxLength={1200} required/><div className="reference-comment-form__bottom"><small>{commentText.length}/1200 caracteres</small><button className="reference-yellow" type="submit">Publicar comentário</button></div></form> : <div className="reference-comment-login"><span>Entre na sua conta para comentar sobre esta música.</span><button type="button" onClick={()=>window.dispatchEvent(new CustomEvent("site-musicas:login"))}>Entrar / Cadastrar</button></div>}
      {commentError && <p className="reference-comment-error">{commentError}</p>}{commentNotice && <p className="reference-comment-notice">{commentNotice}</p>}
      <div className="reference-comment-list">{commentsLoading ? <p>Carregando comentários...</p> : comments.length ? comments.map((comment)=><article className="reference-comment" key={comment.id}><div className="reference-comment-avatar">{String(comment.name || "U").trim().charAt(0).toUpperCase()}</div><div><strong>{comment.name}</strong><time>{new Date(comment.createdAt).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}</time><p>{comment.text}</p></div></article>) : <p className="reference-comments-empty">Ainda não há comentários. Seja a primeira pessoa a comentar.</p>}</div>
    </section>
  </main>;
}
export default function App() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [genre, setGenre] = useState("Todos");
  const [results, setResults] = useState([]);
  const [chart, setChart] = useState([]);
  const [globalChart, setGlobalChart] = useState([]);
  const [chartSource, setChartSource] = useState("");
  const [chartNote, setChartNote] = useState("");
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
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [nextTrackLoading, setNextTrackLoading] = useState(false);
  const [newsletterNotice, setNewsletterNotice] = useState("");
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState("");
  const [commentNotice, setCommentNotice] = useState("");
  const audioRef = useRef(null);

  // Sincroniza o mini player com o relógio real do elemento de áudio.
  // Alguns catálogos demoram a disparar loadedmetadata/timeupdate de forma consistente.
  useEffect(() => {
    if (!isPreviewPlaying) return undefined;
    const syncAudioProgress = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (Number.isFinite(audio.currentTime)) setPreviewTime(audio.currentTime);
      if (Number.isFinite(audio.duration) && audio.duration > 0) setPreviewDuration(audio.duration);
      if (audio.ended) setIsPreviewPlaying(false);
    };
    syncAudioProgress();
    const intervalId = window.setInterval(syncAudioProgress, 200);
    return () => window.clearInterval(intervalId);
  }, [isPreviewPlaying]);

  useEffect(() => {
    const token = window.localStorage.getItem("somletra_token");
    if (!token) return;
    fetch("/api/auth/me", { headers: { Authorization: "Bearer " + token } }).then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data.error || "Sessão expirada."); setAccount(data.user); setSaved(Array.isArray(data.user.favorites) ? data.user.favorites : []); }).catch(() => window.localStorage.removeItem("somletra_token"));
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/charts?country=br").then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data.error || "Ranking Brasil indisponível."); return data; }),
      fetch("/api/charts?country=us").then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data.error || "Ranking global indisponível."); return data; })
    ]).then(([br, global]) => {
      if (!active) return;
      setChart(Array.isArray(br.items) ? br.items : []);
      setGlobalChart(Array.isArray(global.items) ? global.items : []);
      setChartSource([br.source, global.source].filter(Boolean).join(" · "));
      setChartNote(br.note || global.note || "");
    }).catch(() => {
      if (active) { setChart([]); setGlobalChart([]); setChartSource(""); setChartNote(""); }
    });
    return () => { active = false; };
  }, []);

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
  const loadSongComments = async (song) => {
    if (!song?.title || !song?.artist) return;
    setCommentsLoading(true); setCommentError(""); setCommentNotice(""); setComments([]);
    try {
      const params = new URLSearchParams({ title: song.title, artist: song.artist });
      const response = await fetch("/api/comments?" + params.toString());
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar os comentários.");
      setComments(Array.isArray(data.comments) ? data.comments : []);
    } catch (error) { setCommentError(error.message || "Falha ao carregar comentários."); }
    finally { setCommentsLoading(false); }
  };
  const submitSongComment = async (event) => {
    event.preventDefault(); setCommentError(""); setCommentNotice("");
    const token = window.localStorage.getItem("somletra_token");
    if (!account || !token) { setCommentError("Entre na sua conta para publicar um comentário."); return; }
    if (commentText.trim().length < 3) { setCommentError("Escreva pelo menos 3 caracteres."); return; }
    try {
      const response = await fetch("/api/comments", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ title: lyrics.title, artist: lyrics.artist, text: commentText.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível publicar o comentário.");
      setComments((old) => [data.comment, ...old.filter((item) => item.id !== data.comment.id)]);
      setCommentText(""); setCommentNotice("Seu comentário foi publicado.");
    } catch (error) { setCommentError(error.message || "Falha ao publicar comentário."); }
  };
  const listenToCurrentSong = async () => {
    if (!lyrics) return;
    if (lyrics.previewUrl && audioRef.current) {
      try {
        if (isPreviewPlaying) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setPreviewTime(0);
          setIsPreviewPlaying(false);
        } else {
          await audioRef.current.play();
          setIsPreviewPlaying(true);
        }
        return;
      } catch {
        setIsPreviewPlaying(false);
        setMessage("Não foi possível reproduzir esta prévia. Tente novamente.");
        return;
      }
    }
    if (video?.videoId) {
      document.querySelector(".reference-video-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!videoLoading) {
      loadMusicVideo();
    }
  };
  const seekPreview = (time) => {
    if (!audioRef.current || !Number.isFinite(time)) return;
    audioRef.current.currentTime = time;
    setPreviewTime(time);
  };
  const nextTrackFromArtist = async () => {
    if (!lyrics?.artist || nextTrackLoading) return;
    setNextTrackLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/music-search?q=${encodeURIComponent(lyrics.artist)}&page=1`);
      const raw = await response.text();
      let data;
      try { data = JSON.parse(raw); } catch { throw new Error("O catálogo musical retornou uma resposta inválida."); }
      if (!response.ok) throw new Error(data.error || "Não foi possível buscar outra música deste artista.");
      const norm = (value) => String(value || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().trim();
      const candidates = (Array.isArray(data.items) ? data.items : []).filter((item) =>
        norm(item.artist) === norm(lyrics.artist) &&
        norm(item.title) !== norm(lyrics.title) &&
        item.title && item.artist
      );
      if (!candidates.length) {
        setMessage(`Não encontrei outra faixa de ${lyrics.artist} no catálogo agora. Tente novamente mais tarde.`);
        return;
      }
      const next = candidates[Math.floor(Math.random() * candidates.length)];
      await openLyrics(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setMessage(error.message || "Não foi possível carregar a próxima música.");
    } finally {
      setNextTrackLoading(false);
    }
  };
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

  useEffect(() => { if (lyrics?.title && lyrics?.artist) loadSongComments(lyrics); return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } }; }, [lyrics?.title, lyrics?.artist]);

  useEffect(() => { const openLogin = () => { setAuthMode("login"); setProfileOpen(true); }; window.addEventListener("site-musicas:login", openLogin); return () => window.removeEventListener("site-musicas:login", openLogin); }, []);

  useEffect(() => {
    const openFromAddress = () => {
      const params = new URLSearchParams(window.location.search);
      const title = params.get("title");
      const artist = params.get("artist");
      if (title && artist) {
        openLyrics({ id: "itunes-direct", title, artist, artworkUrl: params.get("artwork") || "", album: params.get("album") || "", releaseDate: params.get("releaseDate") || "", genre: params.get("genre") || "" });
      } else {
        setLyrics(null);
        setVideo(null);
        setVideoError("");
        setLyricsLoading(false);
      }
    };
    if (new URLSearchParams(window.location.search).has("title") && new URLSearchParams(window.location.search).has("artist")) openFromAddress();
    window.addEventListener("popstate", openFromAddress);
    return () => window.removeEventListener("popstate", openFromAddress);
  }, []);

  const visibleChart = useMemo(() => chart.slice(0, 5), [chart]);
  const visibleGlobalChart = useMemo(() => globalChart.slice(0, 5), [globalChart]);
  const toggleSaved = (item) => { setSaved((old) => { const next = old.some((x) => x.id === item.id) ? old.filter((x) => x.id !== item.id) : [...old, item]; const token = window.localStorage.getItem("somletra_token"); if (token) fetch("/api/account/favorites", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ favorites: next }) }).then(async (r) => { if (!r.ok) { const d = await r.json(); setMessage(d.error || "Não foi possível sincronizar os favoritos."); } }).catch(() => setMessage("Não foi possível sincronizar os favoritos.")); else setMessage("Entre em Meus Dados para manter seus favoritos salvos na conta."); return next; }); };
  const submitAuth = async (event) => { event.preventDefault(); setAuthBusy(true); setAuthError(""); try { const response = await fetch(authMode === "register" ? "/api/auth/register" : "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: authName, email: authEmail, password: authPassword }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Não foi possível autenticar."); window.localStorage.setItem("somletra_token", data.token); setAccount(data.user); setSaved(data.user.favorites || []); setAuthPassword(""); } catch (error) { setAuthError(error.message || "Falha ao conectar."); } finally { setAuthBusy(false); } };
  const signOut = async () => { const token = window.localStorage.getItem("somletra_token"); if (token) await fetch("/api/auth/logout", { method: "POST", headers: { Authorization: "Bearer " + token } }).catch(() => {}); window.localStorage.removeItem("somletra_token"); setAccount(null); setSaved([]); setAuthMode("login"); };
  const submitSupport = async (event) => { event.preventDefault(); setSupportBusy(true); setSupportError(""); setTicketResult(null); try { const token = window.localStorage.getItem("somletra_token"); const response = await fetch("/api/support/tickets", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: JSON.stringify({ subject: supportSubject, description: supportDescription, email: supportEmail }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Não foi possível registrar o chamado."); setTicketResult(data.ticket); setSupportDescription(""); } catch (error) { setSupportError(error.message || "Falha ao registrar o chamado."); } finally { setSupportBusy(false); } };
  const downloadLyrics = (item) => { const blob = new Blob([`${item.title} — ${item.artist}\
\
${item.text}`], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${item.title || "letra"}.txt`.replace(/[\\\\/:*?"<>|]/g, "-"); document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); };

  const openLyrics = async (item) => {
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get("title") !== item.title || currentUrl.searchParams.get("artist") !== item.artist) {
      const params = new URLSearchParams({ title: item.title || "", artist: item.artist || "" });
      const metadata = {
        artwork: item.artworkUrl || item.artworkUrl100,
        album: item.album,
        releaseDate: item.releaseDate,
        genre: item.genre
      };
      for (const [key, value] of Object.entries(metadata)) {
        if (value) params.set(key, String(value));
      }
      window.history.pushState({ song: true }, "", `?${params.toString()}`);
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setIsPreviewPlaying(false); setPreviewTime(0); setPreviewDuration(0);
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
      setLyrics({ ...item, title: data.trackName || item.title, artist: data.artistName || item.artist, text: String(data.lyrics || "").trim() || data.error || (response.status === 503 || response.status === 502 ? "Letra indisponível no momento. Tente novamente mais tarde." : "Letra não encontrada para esta música."), previewUrl: item.previewUrl || "" });
    } catch (error) { setLyrics({ ...item, title: item.title, artist: item.artist, text: error?.message || "Não foi possível carregar a letra. Verifique sua conexão e tente novamente.", previewUrl: item.previewUrl || "" }); }
    finally { setLyricsLoading(false); }
  };

  const songCatalog = useMemo(() => [...results, ...chart.map((item) => ({...item, title:item.title || item.name, artist:item.artist || item.artistName, artworkUrl:item.artworkUrl || item.artworkUrl100}))], [results, chart]);
  const backToPortal = () => { window.history.replaceState({}, "", window.location.pathname); setLyrics(null); setVideo(null); setVideoError(""); setLyricsLoading(false); };
  const shareCurrentSong = async () => { try { if (navigator.share) await navigator.share({title:lyrics?.title || "Site Músicas", text:`${lyrics?.title || ""} — ${lyrics?.artist || ""}`, url:window.location.href}); else if (navigator.clipboard) await navigator.clipboard.writeText(window.location.href); } catch {} };
  const saveCurrentSong = () => { if (lyrics?.id) toggleSaved({...lyrics, id:lyrics.id, title:lyrics.title, artist:lyrics.artist}); else setMessage("Pesquise esta música no catálogo para adicioná-la aos favoritos."); };
  const printCurrentSong = () => {
    if (!lyrics) return;
    const popup = window.open("", "_blank", "width=900,height=720");
    if (!popup) { setMessage("O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente novamente."); return; }
    const escapeHtml = (value) => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
    const title = escapeHtml(lyrics.title || "Letra da música");
    const artist = escapeHtml(lyrics.artist || "Artista não informado");
    const album = escapeHtml(lyrics.album || "");
    const body = escapeHtml(lyrics.text || "Letra não disponível nesta fonte.");
    const cover = lyrics.artworkUrl || lyrics.artworkUrl100;
    popup.document.open();
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — Site Músicas</title><style>
      @page{size:A4;margin:16mm 17mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#182036;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      body{max-width:800px;margin:0 auto;padding:26px 30px 35px}.brand{display:flex;align-items:center;gap:13px;border-bottom:3px solid #ffd633;padding-bottom:16px;margin-bottom:24px}.logo{width:48px;height:48px;display:grid;place-items:center;border-radius:13px;background:#ffd633;color:#151a2d;font-size:31px;font-weight:900}.brand strong{display:block;font-size:23px;letter-spacing:-.7px}.brand em{font-style:normal;color:#7451dd}.brand small{display:block;margin-top:5px;color:#747b8c;font-size:9px;letter-spacing:1.2px;text-transform:uppercase}.song{display:flex;align-items:center;gap:18px;padding:0 0 20px;border-bottom:1px solid #e2e6ef;margin-bottom:23px}.cover{width:94px;height:94px;object-fit:cover;border-radius:10px;background:#f0edff}.song h1{font-size:25px;line-height:1.2;margin:0 0 7px;letter-spacing:-.6px;overflow-wrap:anywhere}.artist{font-size:14px;color:#5d6478;margin:0 0 5px}.album{font-size:11px;color:#858b9a;margin:0}.section-title{font-size:15px;margin:0 0 16px;color:#7251d9;text-transform:uppercase;letter-spacing:1px}.lyrics{font-size:12px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere;color:#242b3d}.foot{margin-top:26px;padding-top:12px;border-top:1px solid #e6e9f1;color:#8a90a0;font-size:9px;display:flex;justify-content:space-between;gap:12px}.print{position:fixed;right:22px;top:18px;border:0;border-radius:9px;background:#5f43cf;color:white;font-weight:700;padding:11px 17px;cursor:pointer}@media print{body{max-width:none;padding:0}.print{display:none}.brand,.song{break-inside:avoid}.lyrics{orphans:3;widows:3}}@media(max-width:600px){body{padding:16px}.song h1{font-size:20px}.cover{width:72px;height:72px}.brand strong{font-size:20px}}
      </style></head><body><button class="print" onclick="window.print()">Imprimir / Salvar em PDF</button><header class="brand"><div class="logo">♫</div><div><strong>Site <em>Músicas</em></strong><small>Letras que tocam você</small></div></header><section class="song">${cover ? '<img class="cover" src="'+escapeHtml(cover)+'" alt="Capa da música">' : '<div class="cover"></div>'}<div><h1>${title}</h1><p class="artist">${artist}</p>${album ? '<p class="album">'+album+'</p>' : ''}</div></section><h2 class="section-title">Letra da música</h2><main class="lyrics">${body}</main><footer class="foot"><span>Site Músicas · Conteúdo conforme disponibilidade da fonte consultada</span><span>${escapeHtml(new Date().toLocaleDateString("pt-BR"))}</span></footer><script>window.addEventListener('load',()=>{setTimeout(()=>window.print(),450)});<\/script></body></html>`);
    popup.document.close();
    popup.focus();
  };

  const downloadCurrentSong = () => {
    if (!lyrics) return;
    const safePdfText = (value) => String(value ?? "")
      .normalize("NFC")
      .replace(/[–—]/g, "-").replace(/[’‘]/g, "'").replace(/[“”]/g, '"')
      .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
    const pdfEscape = (value) => safePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    const wrapLine = (line, width = 88) => {
      const words = safePdfText(line).split(/\s+/).filter(Boolean);
      const result = [];
      let current = "";
      for (const word of words) {
        if (current && (current + " " + word).length > width) {
          result.push(current);
          current = word;
        } else current = current ? current + " " + word : word;
      }
      if (current) result.push(current);
      return result.length ? result : [""];
    };
    const rawLines = String(lyrics.text || "Letra não disponível nesta fonte.").replace(/\r/g, "").split("\n");
    const lyricLines = rawLines.flatMap((line) => wrapLine(line));
    const linesPerPage = 41;
    const pageLines = [];
    for (let i = 0; i < lyricLines.length; i += linesPerPage) pageLines.push(lyricLines.slice(i, i + linesPerPage));
    if (!pageLines.length) pageLines.push([""]);
    const streams = pageLines.map((lines, pageIndex) => {
      const commands = [];
      commands.push("q 1 0.84 0.12 rg 54 785 38 38 re f Q");
      commands.push("BT /F1 22 Tf 61 796 Td (" + pdfEscape("♫") + ") Tj ET");
      commands.push("BT /F1 17 Tf 102 808 Td (" + pdfEscape("SITE MUSICAS") + ") Tj ET");
      commands.push("BT /F1 8 Tf 103 794 Td (" + pdfEscape("LETRAS QUE TOCAM VOCE") + ") Tj ET");
      commands.push("q 0.43 0.31 0.83 RG 54 779 m 541 779 l S Q");
      commands.push("BT /F1 18 Tf 54 748 Td (" + pdfEscape(lyrics.title || "Letra") + ") Tj ET");
      commands.push("BT /F1 11 Tf 54 728 Td (" + pdfEscape(lyrics.artist || "Artista não informado") + ") Tj ET");
      commands.push("BT /F1 10 Tf 54 704 Td (" + pdfEscape(pageIndex ? "LETRA (CONTINUACAO)" : "LETRA DA MUSICA") + ") Tj ET");
      lines.forEach((line, index) => {
        const y = 680 - index * 15;
        commands.push("BT /F1 11 Tf 54 " + y + " Td (" + pdfEscape(line) + ") Tj ET");
      });
      commands.push("BT /F1 8 Tf 54 28 Td (" + pdfEscape("Site Músicas - conteúdo fornecido pela fonte consultada") + ") Tj ET");
      commands.push("BT /F1 8 Tf 520 28 Td (" + (pageIndex + 1) + "/" + pageLines.length + ") Tj ET");
      return commands.join("\n");
    });
    const objects = [];
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    const pageRefs = streams.map((_, index) => (4 + index * 2) + " 0 R").join(" ");
    objects[2] = "<< /Type /Pages /Kids [" + pageRefs + "] /Count " + streams.length + " >>";
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    streams.forEach((stream, index) => {
      const pageObject = 4 + index * 2;
      const streamObject = pageObject + 1;
      objects[pageObject] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents " + streamObject + " 0 R >>";
      objects[streamObject] = "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream";
    });
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    for (let id = 1; id < objects.length; id++) {
      offsets[id] = pdf.length;
      pdf += id + " 0 obj\n" + objects[id] + "\nendobj\n";
    }
    const xrefOffset = pdf.length;
    pdf += "xref\n0 " + objects.length + "\n0000000000 65535 f \n";
    for (let id = 1; id < objects.length; id++) pdf += String(offsets[id]).padStart(10, "0") + " 00000 n \n";
    pdf += "trailer\n<< /Size " + objects.length + " /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF";
    const bytes = new Uint8Array(pdf.length);
    for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = ((lyrics.title || "letra").replace(/[\\\\/:*?"<>|]/g, "-")) + ".pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return <div className={lyrics ? "portal portal--song-open" : "portal"}>
    <div className="portal-topline"><span><Sparkles size={13}/> Descubra a história por trás de cada música</span><span className="portal-topline__right">Música conecta pessoas</span></div>
    {lyrics && <header className="reference-site-header"><div className="reference-site-header__top"><Brand onClick={backToPortal}/><form className="reference-header-search" onSubmit={(event)=>{event.preventDefault();backToPortal();if(query.trim())search(query,1);}}><Search size={19}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar por música, artista ou trecho da letra..."/><button aria-label="Buscar"><Search size={18}/></button></form><div className="reference-quick-actions"><button onClick={()=>{setAuthMode("login");setProfileOpen(true);}}><UserRound size={15}/> Entrar</button><button className="reference-yellow" onClick={()=>setProfileOpen(true)}>Meus Dados</button></div></div><nav className="reference-site-nav"><a href="#inicio" onClick={backToPortal}><Home size={15}/> Início</a><a href="#busca" onClick={backToPortal}><Music2 size={15}/> Letras</a><a href="#artistas" onClick={backToPortal}><UserRound size={15}/> Artistas</a><a href="#destaques" onClick={backToPortal}><Disc3 size={15}/> Álbuns</a><a href="#generos" onClick={backToPortal}><ListMusic size={15}/> Playlists</a><a href="#destaques" onClick={backToPortal}><Music2 size={15}/> Em Alta</a><a href="#generos" onClick={backToPortal}>Gêneros⌄</a><button onClick={()=>setSupportOpen(true)}><Headphones size={16}/> Suporte</button></nav></header>}
    <header className="portal-header">
      <a className="portal-brand" href="#inicio" aria-label="Site Músicas início"><span className="portal-brand__mark"><Music2 size={24} fill="currentColor"/></span><span>Site <span className="portal-brand__yellow">Músicas</span><small className="portal-brand__tagline">LETRAS QUE TOCAM VOCÊ</small></span></a>
      <form className="portal-search portal-header-search" onSubmit={(e) => { e.preventDefault(); search(query, 1); }}><Search size={19}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por música, artista ou trecho da letra..." aria-label="Buscar por música, artista ou trecho da letra"/><button disabled={loading} aria-label="Pesquisar"><Search size={18}/></button></form>
      <div className="portal-header-actions"><button className="portal-login-link" onClick={() => {setAuthMode("login");setProfileOpen(true);}}><UserRound size={14}/> Entrar</button><button className="portal-account-button" onClick={() => setProfileOpen(true)}>{account ? account.name.split(" ")[0] : "Meus Dados"}</button><button className="portal-mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Abrir menu">{mobileOpen ? <X/> : <Menu/>}</button></div>
      <nav className={mobileOpen ? "portal-nav portal-nav--open" : "portal-nav"}><a href="#inicio" onClick={() => setMobileOpen(false)}><Home size={15}/> Início</a><a href="#busca" onClick={() => setMobileOpen(false)}><Music2 size={15}/> Letras</a><a href="#artistas" onClick={() => setMobileOpen(false)}><UserRound size={15}/> Artistas</a><a href="#generos" onClick={() => setMobileOpen(false)}><Disc3 size={15}/> Álbuns</a><a href="#generos" onClick={() => setMobileOpen(false)}><ListMusic size={15}/> Playlists</a><a href="#destaques" onClick={() => setMobileOpen(false)}><Music2 size={15}/> Em Alta</a><a href="#generos" onClick={() => setMobileOpen(false)}>Gêneros⌄</a><button onClick={() => { setSupportOpen(true); setMobileOpen(false); }}><Headphones size={15}/> Suporte</button></nav>
    </header>

    <main id="inicio">
      <section className="portal-hero portal-hero--campaign">
        <div className="portal-hero__photo" role="img" aria-label="Pessoa curtindo música em um ambiente musical iluminado"></div>
        <div className="portal-hero__content"><span className="portal-kicker"><span/> LETRAS QUE TOCAM VOCÊ</span><h1>Encontre a música<br/><em>que toca você.</em></h1><p>Busque por música, artista ou trecho da letra e descubra a trilha sonora da sua vida.</p>
          <form className="portal-search" id="busca" onSubmit={(e) => { e.preventDefault(); search(query, 1); }}><Search size={21}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por música, artista ou trecho da letra..." aria-label="Pesquisar música ou artista"/><button disabled={loading}>{loading ? "Buscando..." : "Pesquisar"} <ArrowRight size={17}/></button></form>
          <div className="portal-search-hint"><span>Pesquisas populares:</span>{["Ana Castela", "Jorge e Mateus", "Henrique e Juliano", "The Weeknd", "BTS"].map((term) => <button key={term} onClick={() => { setQuery(term); search(term, 1); }}>{term}</button>)}</div>
        </div>
        <div className="portal-hero__floating portal-hero__floating--one"><Music2 size={18}/><span>Milhões de letras<br/>para você curtir</span></div>
        <div className="portal-hero__floating portal-hero__floating--two"><Heart size={18}/><span>Guarde suas<br/>músicas favoritas</span></div>
      </section>

      {submittedQuery && <section className="portal-results portal-section" id="busca-resultados"><div className="portal-section-heading"><div><span className="portal-kicker">PESQUISA MUSICAL</span><h2>Resultados para <em>“{submittedQuery}”</em></h2><p>{message || "Buscando no catálogo musical..."}</p>{source && <small>Fonte consultada: {source}</small>}</div><button className="portal-text-button" onClick={() => { setSubmittedQuery(""); setResults([]); setMessage(""); }}>Limpar pesquisa <X size={15}/></button></div>
        {results.length > 0 ? <><div className="portal-result-list">{results.map((item, i) => <article className="portal-result" key={item.id || `${item.title}-${i}`}><Cover item={item} index={i}/><div className="portal-result__info"><h3>{item.title}</h3><p>{item.artist}</p><small>{item.album || item.genre || "Faixa musical"}{item.releaseDate ? ` · ${String(item.releaseDate).slice(0,4)}` : ""}</small></div><button className="portal-icon-button" onClick={() => toggleSaved(item)} aria-label="Salvar música"><Heart size={18} fill={saved.some((x) => x.id === item.id) ? "currentColor" : "none"}/></button><button className="portal-result__open" onClick={() => openLyrics(item)}>Ver letra <ChevronRight size={16}/></button></article>)}</div>{(page > 1 || hasMore) && <div className="portal-pagination"><button disabled={page <= 1 || loading} onClick={() => search(submittedQuery, page - 1)}>Anterior</button><span>Página {page}</span><button disabled={!hasMore || loading} onClick={() => search(submittedQuery, page + 1)}>Próxima <ArrowRight size={15}/></button></div>}</> : <div className="portal-empty"><Search size={25}/><strong>{loading ? "Pesquisando..." : "Nenhum resultado relevante"}</strong><p>{message}</p></div>}
      </section>}

      <section className="portal-home-grid" aria-label="Descubra músicas">
        <aside className="portal-home-left">
          <article className="portal-promo-card portal-promo-card--artists" id="artistas">
            <div className="portal-promo-copy"><span className="portal-kicker">DESCUBRA NOVOS ARTISTAS</span><h2>Artistas que fazem<br/><em>a trilha da nossa vida.</em></h2><p>Navegue pelos perfis dos artistas que marcam o Brasil, ritmos e sonoridades de todos os estilos.</p><a href="#artistas-em-destaque">Ver artistas em destaque <ArrowRight size={15}/></a></div>
            <div className="portal-promo-art" aria-hidden="true"><span className="portal-promo-art__ring"><Mic2 size={44}/></span><Music2 className="portal-promo-note portal-promo-note--a"/><Music2 className="portal-promo-note portal-promo-note--b"/></div>
          </article>
          <article className="portal-promo-card portal-promo-card--lyrics">
            <span className="portal-book-icon"><BookOpen size={30}/></span><div><span className="portal-kicker">SOBRE A LETRA</span><h2>As músicas contam histórias.<br/>Encontre a sua.</h2><p>Explore letras, artistas e álbuns e viva grandes histórias.</p></div><a href="#busca" onClick={() => document.querySelector(".portal-hero .portal-search input")?.focus()}>Começar agora <ArrowRight size={15}/></a>
          </article>
        </aside>
        <div className="portal-home-center">
          <section className="portal-ranking-panel" id="destaques">
            <div className="portal-section-heading"><div><span className="portal-kicker">RANKINGS MUSICAIS</span><h2>Em alta agora.</h2><p>Top 10 por região, com base nas atualizações identificadas.</p></div><div className="portal-tabs"><span className="active">🇧🇷 Brasil</span><span>🌐 Global</span></div></div>
            <p className="portal-chart-source"><span className="portal-chart-source__info">ⓘ</span> {chartNote || "Os dados refletem a popularidade da fonte musical consultada e podem ter atualizações periódicas."}{chartSource ? <span className="portal-chart-source__name">Fonte: {chartSource}</span> : null}</p>
            <div className="portal-ranking-columns">
              <section className="portal-ranking-country"><h3>Top 10 Brasil</h3>{visibleChart.length ? <div className="portal-ranking-list">{visibleChart.map((item,i)=><button className="portal-ranking-row" key={item.id || item.title || item.name} onClick={()=>openLyrics({...item,title:item.title || item.name,artist:item.artist || item.artistName,artworkUrl:item.artworkUrl || item.artworkUrl100})}><span className="portal-ranking-number">{i+1}</span><Cover item={{...item,title:item.title || item.name,artworkUrl:item.artworkUrl || item.artworkUrl100}} index={i}/><span className="portal-ranking-meta"><strong>{item.title || item.name}</strong><small>{item.artist || item.artistName}</small></span><span className="portal-ranking-trend" aria-label="posição no ranking">↑</span></button>)}</div> : <div className="portal-ranking-empty"><Disc3 size={18}/><span>Ranking Brasil indisponível no momento.</span></div>}</section>
              <section className="portal-ranking-country"><h3>Top 10 Global</h3>{visibleGlobalChart.length ? <div className="portal-ranking-list">{visibleGlobalChart.map((item,i)=><button className="portal-ranking-row" key={item.id || item.title || item.name} onClick={()=>openLyrics({...item,title:item.title || item.name,artist:item.artist || item.artistName,artworkUrl:item.artworkUrl || item.artworkUrl100})}><span className="portal-ranking-number">{i+1}</span><Cover item={{...item,title:item.title || item.name,artworkUrl:item.artworkUrl || item.artworkUrl100}} index={i+5}/><span className="portal-ranking-meta"><strong>{item.title || item.name}</strong><small>{item.artist || item.artistName}</small></span><span className="portal-ranking-trend" aria-label="posição no ranking">↑</span></button>)}</div> : <div className="portal-ranking-empty"><Disc3 size={18}/><span>Ranking global indisponível no momento.</span></div>}</section>
            </div>
          </section>
        </div>
        <aside className="portal-home-right">
          <article className="portal-premium-card portal-discover-card"><div className="portal-premium-card__art" aria-hidden="true"></div><div className="portal-premium-card__copy"><h2><Crown size={19}/> Seja Premium</h2><p>Tenha uma experiência ainda melhor, sem anúncios, com playlists exclusivas e muito mais.</p><button onClick={()=>{setSupportSubject("Informações sobre Premium");setSupportDescription("Gostaria de receber informações sobre os recursos Premium.");setSupportOpen(true);}}>Conheça os planos <ArrowRight size={15}/></button></div></article>
          <section className="portal-featured-artists" id="artistas-em-destaque"><div className="portal-mini-heading"><span className="portal-kicker">ARTISTAS EM DESTAQUE</span><button onClick={()=>{setQuery("artistas");document.querySelector(".portal-hero .portal-search input")?.focus();}}>Ver todos <ArrowRight size={14}/></button></div>
            {(() => { const unique=[]; for(const item of [...results,...chart]) { const name=item.artist || item.artistName; if(name && !unique.some(a=>normalize(a.name)===normalize(name))) unique.push({name,artworkUrl:item.artworkUrl || item.artworkUrl100}); if(unique.length===5) break; } return unique.length ? <div className="portal-artist-cards">{unique.map((artist,i)=><button key={artist.name} onClick={()=>{setQuery(artist.name);search(artist.name,1);}}><Cover item={{title:artist.name,artworkUrl:artist.artworkUrl}} index={i}/><strong>{artist.name}</strong></button>)}</div> : <div className="portal-artists-empty"><Mic2 size={23}/><p>Pesquise uma música para descobrir artistas disponíveis no catálogo.</p><button onClick={()=>document.querySelector(".portal-hero .portal-search input")?.focus()}>Buscar artistas</button></div>; })()}
          </section>
        </aside>
      </section>
      <section className="portal-genres portal-genres--compact portal-genres--reference" id="generos"><div className="portal-section-heading"><div><h2>Principais gêneros musicais</h2></div><button className="portal-text-button" onClick={()=>document.querySelector(".portal-hero .portal-search input")?.focus()}>Ver todos <ArrowRight size={14}/></button></div><div className="portal-genre-grid">{["Gospel","Sertanejo","MPB","Pop","Rock","Rap","Funk","Pagode","Samba","Forró"].map((g,i)=><button key={g} className={`portal-genre portal-genre--reference portal-genre--tile-${i}`} onClick={()=>{setGenre(g);setQuery(g);search(g,1);}}><span className={`portal-genre__icon portal-genre__icon--${i%6}`}>{i===0?"✝":i===1?"♧":i===2?"♫":i===3?"☆":i===4?"♆":i===5?"♬":i===6?"♛":i===7?"◉":i===8?"▤":"▥"}</span><span>{g}</span></button>)}</div></section>
    </main>
    <footer className="portal-footer reference-footer"><div className="reference-footer__grid"><div className="reference-footer__brand"><a className="portal-brand" href="#inicio"><span className="portal-brand__mark"><Music2 size={25} fill="currentColor"/></span><span>Site <span className="portal-brand__yellow">Músicas</span><small className="portal-brand__tagline">LETRAS QUE TOCAM VOCÊ</small></span></a><p>Descubra as músicas que fazem parte da sua história.</p></div><div><h3>Navegação</h3><nav><a href="#inicio">Início</a><a href="#busca">Letras</a><a href="#artistas">Artistas</a><a href="#generos">Álbuns e playlists</a><a href="#destaques">Em Alta</a></nav></div><div><h3>Suporte</h3><nav><a href="#ajuda" onClick={(e)=>{e.preventDefault();setSupportOpen(true);}}>Ajuda</a><a href="#ajuda" onClick={(e)=>{e.preventDefault();setSupportOpen(true);}}>Fale Conosco</a><a href="#termos">Termos de Uso</a><a href="#privacidade">Política de Privacidade</a></nav></div><div><h3>Siga-nos</h3><div className="reference-social-links"><a href="https://www.youtube.com/" target="_blank" rel="noreferrer" aria-label="YouTube"><Youtube/></a><a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram">◎</a><a href="https://www.facebook.com/" target="_blank" rel="noreferrer" aria-label="Facebook">f</a><a href="https://www.tiktok.com/" target="_blank" rel="noreferrer" aria-label="TikTok">♪</a></div></div><div><h3>Receba novidades</h3><form className="reference-newsletter" onSubmit={(e)=>{e.preventDefault();setNewsletterNotice("Cadastro ainda não ativado: falta configurar um serviço de envio de e-mails.");}}><input type="email" required placeholder="Seu e-mail" aria-label="Seu e-mail"/><button>Cadastro</button></form>{newsletterNotice && <small className="reference-newsletter-notice">{newsletterNotice}</small>}</div></div><div className="portal-footer__bottom"><span>© {new Date().getFullYear()} Site Músicas. Todos os direitos reservados.</span><span>Dados e letras exibidos conforme disponibilidade das fontes e autorizações aplicáveis.</span></div></footer>

    <button className="portal-support-fab" onClick={() => setSupportOpen(true)} aria-label="Abrir suporte"><LifeBuoy size={20}/><span>Suporte</span></button>
    {profileOpen && <div className="portal-overlay" role="dialog" aria-modal="true" aria-label="Meus Dados"><section className="portal-panel"><button className="portal-panel-close" onClick={() => setProfileOpen(false)} aria-label="Fechar"><X/></button>{account ? <><div className="portal-profile-heading"><div className="portal-avatar"><CircleUserRound size={32}/></div><div><span className="portal-kicker">SEU ESPAÇO MUSICAL</span><h2>Olá, {account.name}</h2><p>{account.email}</p></div></div><div className="portal-profile-stats"><div><Heart size={18}/><strong>{saved.length}</strong><span>Favoritos</span></div><div><ListMusic size={18}/><strong>—</strong><span>Playlists</span></div></div><h3>Minhas músicas favoritas</h3>{saved.length ? <div className="portal-saved-list">{saved.map((item) => <div key={item.id} className="portal-saved-item"><Cover item={item}/><div><strong>{item.title}</strong><span>{item.artist}</span></div><button onClick={() => toggleSaved(item)} aria-label="Remover dos favoritos"><X size={16}/></button></div>)}</div> : <p className="portal-muted">Ainda não há favoritos salvos na sua conta.</p>}<button className="portal-primary-button" onClick={signOut}><LogOut size={17}/> Sair da conta</button></> : <><div className="portal-profile-heading"><div className="portal-avatar"><UserRound size={30}/></div><div><span className="portal-kicker">MEUS DADOS</span><h2>{authMode === "register" ? "Entre no seu universo musical" : "Bem-vindo de volta"}</h2><p>Salve favoritos e personalize sua experiência.</p></div></div><div className="portal-auth-tabs"><button className={authMode === "register" ? "active" : ""} onClick={() => {setAuthMode("register");setAuthError("");}}>Criar conta</button><button className={authMode === "login" ? "active" : ""} onClick={() => {setAuthMode("login");setAuthError("");}}>Já tenho conta</button></div><form className="portal-form" onSubmit={submitAuth}>{authMode === "register" && <label>Nome<input value={authName} onChange={e=>setAuthName(e.target.value)} autoComplete="name" required minLength={2} maxLength={80}/></label>}<label>E-mail<input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} autoComplete="email" required/></label><label>Senha<input type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} autoComplete={authMode === "register" ? "new-password" : "current-password"} minLength={authMode === "register" ? 10 : 1} required/><small>{authMode === "register" ? "Use pelo menos 10 caracteres." : "Digite sua senha para entrar."}</small></label><p className="portal-muted">Ao continuar, você concorda com os termos de uso e a política de privacidade.</p>{authError && <p className="portal-form-error">{authError}</p>}<button className="portal-primary-button" disabled={authBusy}>{authBusy ? "Aguarde..." : authMode === "register" ? "Criar minha conta" : "Entrar"} <ArrowRight size={17}/></button></form><p className="portal-muted portal-small-note">A recuperação de senha por e-mail depende da configuração de um serviço de envio.</p></>}</section></div>}
    {supportOpen && <div className="portal-overlay portal-overlay--support" role="dialog" aria-modal="true" aria-label="Central de suporte"><section className="portal-panel"><button className="portal-panel-close" onClick={() => setSupportOpen(false)} aria-label="Fechar"><X/></button><div className="portal-profile-heading"><div className="portal-avatar"><LifeBuoy size={28}/></div><div><span className="portal-kicker">CENTRAL DE ATENDIMENTO</span><h2>Como podemos ajudar?</h2><p>Envie sua solicitação e receba um protocolo.</p></div></div>{ticketResult ? <div className="portal-ticket-success"><span>Chamado registrado</span><strong>{ticketResult.protocol}</strong><p>Status: {ticketResult.status}</p><button className="portal-primary-button" onClick={() => setTicketResult(null)}>Abrir outro chamado</button></div> : <form className="portal-form" onSubmit={submitSupport}><label>Assunto<select value={supportSubject} onChange={e=>setSupportSubject(e.target.value)}>{["Problemas com músicas ou letras","Ajuda com cadastro e login","Minhas músicas favoritas","Problemas técnicos","Sugestões de melhorias","Direitos autorais e conteúdo","Outros assuntos"].map(x=><option key={x}>{x}</option>)}</select></label>{!account && <label>E-mail para contato<input type="email" value={supportEmail} onChange={e=>setSupportEmail(e.target.value)} required/></label>}<label>Descreva como podemos ajudar<textarea value={supportDescription} onChange={e=>setSupportDescription(e.target.value)} minLength={10} maxLength={5000} rows={5} required placeholder="Conte o que aconteceu..."/></label>{supportError && <p className="portal-form-error">{supportError}</p>}<button className="portal-primary-button" disabled={supportBusy}>{supportBusy ? "Enviando..." : "Enviar solicitação"} <Send size={17}/></button></form>}<div className="portal-support-help"><strong>Consultar chamado</strong><form className="portal-ticket-lookup" onSubmit={lookupTicket}><input value={ticketProtocol} onChange={e=>setTicketProtocol(e.target.value)} placeholder="Protocolo SL-..." required={!account}/>{!account && <input type="email" value={ticketEmailLookup} onChange={e=>setTicketEmailLookup(e.target.value)} placeholder="E-mail usado no chamado" required/>}<button className="portal-primary-button">Consultar status</button></form>{ticketLookupError && <p className="portal-form-error">{ticketLookupError}</p>}{ticketLookupResult && (ticketLookupResult.length ? ticketLookupResult.map(t=><div className="portal-ticket-status" key={t.protocol}><strong>{t.protocol} · {t.status}</strong><span>{t.subject}</span>{t.messages?.map((m,i)=><p key={i}>{m.text}</p>)}</div>) : <p>Nenhum chamado encontrado com esses dados.</p>)}</div></section></div>}
    {lyrics && <MusicPage key={lyrics.id || lyrics.title} lyrics={lyrics} loading={lyricsLoading} video={video} videoLoading={videoLoading} videoError={videoError} onBack={backToPortal} onPrint={printCurrentSong} onDownload={downloadCurrentSong} onShare={shareCurrentSong} onVideo={loadMusicVideo} onListen={listenToCurrentSong} onNextTrack={nextTrackFromArtist} nextTrackLoading={nextTrackLoading} onSave={saveCurrentSong} saved={saved.some(item=>item.id===lyrics.id)} catalog={songCatalog} onOpen={openLyrics} fontScale={songFontScale} setFontScale={setSongFontScale} account={account} comments={comments} commentsLoading={commentsLoading} commentText={commentText} setCommentText={setCommentText} onSubmitComment={submitSongComment} commentError={commentError} commentNotice={commentNotice} audioRef={audioRef} isPreviewPlaying={isPreviewPlaying} previewTime={previewTime} previewDuration={previewDuration} onSeekPreview={seekPreview}/>}

  </div>;
}
