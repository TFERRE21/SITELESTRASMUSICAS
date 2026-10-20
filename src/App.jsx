import { useEffect, useMemo, useState } from "react";
import { AudioLines, Search, Music2, Heart, Menu, X, ArrowRight, ChevronRight, Play, Disc3, Mic2, Headphones, Sparkles, Clock3, ExternalLink } from "lucide-react";
import { institutional } from "./config/institutional.js";

const genres = ["Todos", "Gospel", "Sertanejo", "MPB", "Pop", "Rock", "Rap", "Funk", "Pagode", "Samba", "Forró", "Reggae", "Indie", "Jazz", "Música Latina"];
const normalize = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function Cover({ item, index = 0, className = "" }) {
  const colors = ["#e9dffb", "#f8e2d8", "#dcecf7", "#f7edce", "#dcefe5", "#f4ddeb"];
  return item?.artworkUrl || item?.artworkUrl100
    ? <img className={`music-cover ${className}`} src={item.artworkUrl || item.artworkUrl100} alt={`Capa de ${item.title || item.name || "música"}`} loading="lazy" />
    : <div className={`music-cover music-cover--placeholder ${className}`} style={{ background: colors[index % colors.length] }}><AudioLines size={26} /><span>som & letra</span></div>;
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

  const visibleChart = useMemo(() => chart.slice(0, 10), [chart]);
  const toggleSaved = (item) => setSaved((old) => old.some((x) => x.id === item.id) ? old.filter((x) => x.id !== item.id) : [...old, item]);

  const openLyrics = async (item) => {
    setLyricsLoading(true);
    setLyrics({ title: item.title, artist: item.artist, text: "Consultando disponibilidade da letra..." });
    try {
      const endpoint = String(item.id || "").startsWith("itunes-") || String(item.id || "").startsWith("mb-")
        ? `/api/lyrics/search?title=${encodeURIComponent(item.title)}&artist=${encodeURIComponent(item.artist)}`
        : `/api/lyrics/${encodeURIComponent(item.id)}`;
      const response = await fetch(endpoint);
      const data = await response.json();
      setLyrics({ title: data.trackName || item.title, artist: data.artistName || item.artist, text: data.lyrics || data.error || "Letra indisponível na fonte consultada.", provider: data.provider });
    } catch { setLyrics({ title: item.title, artist: item.artist, text: "Não foi possível consultar a fonte de letras neste momento." }); }
    finally { setLyricsLoading(false); }
  };

  return <div className="portal">
    <div className="portal-topline"><span><Sparkles size={13}/> Descubra a história por trás de cada música</span><span className="portal-topline__right">Música conecta pessoas</span></div>
    <header className="portal-header">
      <a className="portal-brand" href="#" aria-label="Som & Letra início"><span className="portal-brand__mark"><AudioLines size={24}/></span><span>som<span>&</span>letra</span></a>
      <nav className={mobileOpen ? "portal-nav portal-nav--open" : "portal-nav"}>
        <a href="#inicio" onClick={() => setMobileOpen(false)}>Início</a><a href="#destaques" onClick={() => setMobileOpen(false)}>Destaques</a><a href="#artistas" onClick={() => setMobileOpen(false)}>Artistas</a><a href="#generos" onClick={() => setMobileOpen(false)}>Gêneros</a>
      </nav>
      <div className="portal-header-actions"><a href="#busca" className="portal-search-link"><Search size={17}/> Buscar música</a><button className="portal-mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Abrir menu">{mobileOpen ? <X/> : <Menu/>}</button></div>
    </header>

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

      <section className="portal-section" id="destaques"><div className="portal-section-heading"><div><span className="portal-kicker">PARA OUVIR E DESCOBRIR</span><h2>Em alta <em>agora.</em></h2><p>Uma seleção do ranking musical disponível neste momento.</p></div><div className="portal-tabs"><button className={country === "br" ? "active" : ""} onClick={() => setCountry("br")}>Brasil</button><button className={country === "us" ? "active" : ""} onClick={() => setCountry("us")}>Internacional</button></div></div>
        {visibleChart.length ? <div className="portal-feature-grid">{visibleChart.slice(0,4).map((item,i)=><article className="portal-feature" key={item.id}><div className="portal-feature__cover"><Cover item={item} index={i}/><span className="portal-feature__rank">#{item.rank || i+1}</span><a href={item.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${item.name || item.title}`}><Play size={17} fill="currentColor"/></a></div><div className="portal-feature__info"><h3>{item.name || item.title}</h3><p>{item.artistName || item.artist}</p><small>{item.genres?.[0]?.name || item.genre || "Música em destaque"}</small></div></article>)}</div> : <div className="portal-empty portal-empty--inline"><Disc3 size={22}/><p>O ranking musical não está disponível neste momento. Tente novamente mais tarde.</p></div>}
      </section>

      <section className="portal-artist-band" id="artistas"><div><span className="portal-kicker">ENCONTRE SUA PRÓXIMA PAIXÃO</span><h2>Artistas que fazem<br/><em>a trilha da nossa vida.</em></h2><p>Pesquise pelo nome do cantor para encontrar faixas, álbuns e informações disponíveis no catálogo.</p><a href="#busca" onClick={() => document.querySelector(".portal-search input")?.focus()}>Encontrar um artista <ArrowRight size={17}/></a></div><div className="portal-artist-band__art"><div className="portal-artist-circle"><Mic2 size={54}/></div><span>VOZES QUE MARCAM</span></div></section>

      <section className="portal-section portal-genres" id="generos"><div className="portal-section-heading"><div><span className="portal-kicker">EXPLORE POR ESTILO</span><h2>Qual é o seu <em>som?</em></h2><p>Escolha um gênero e pesquise músicas relacionadas quando disponíveis.</p></div></div><div className="portal-genre-grid">{genres.filter((g)=>g!=="Todos").map((g,i)=><button key={g} className="portal-genre" onClick={()=>{setGenre(g);setQuery(g);search(g,1);}}><span className={`portal-genre__icon portal-genre__icon--${i%6}`}>{i%3===0?<Headphones size={19}/>:i%3===1?<Music2 size={19}/>:<Disc3 size={19}/>}</span><span>{g}</span><ArrowRight size={15}/></button>)}</div></section>

      <section className="portal-newsletter"><div className="portal-newsletter__icon"><AudioLines size={25}/></div><div><span className="portal-kicker">SOM & LETRA</span><h2>As músicas contam histórias. <em>Encontre a sua.</em></h2><p>Explore nosso portal e descubra sua próxima música favorita.</p></div><a href="#busca" onClick={() => document.querySelector(".portal-search input")?.focus()}>Começar agora <ArrowRight size={16}/></a></section>
    </main>
    <footer className="portal-footer"><div className="portal-footer__main"><a className="portal-brand" href="#"><span className="portal-brand__mark"><AudioLines size={22}/></span><span>som<span>&</span>letra</span></a><p>Descobrindo sons, conectando histórias.</p><nav><a href="#destaques">Destaques</a><a href="#artistas">Artistas</a><a href="#generos">Gêneros</a><a href="#busca">Pesquisar</a></nav></div><div className="portal-footer__bottom"><span>© {new Date().getFullYear()} {institutional.brandName || "Som & Letra"}. Todos os direitos reservados.</span><span>Dados musicais fornecidos por fontes externas. Letras completas exibidas apenas quando disponíveis e autorizadas.</span></div></footer>

    {lyrics && <div className="portal-modal-backdrop" role="dialog" aria-modal="true" aria-label={`Letra de ${lyrics.title}`}><section className="portal-lyrics-modal"><button className="portal-modal-close" onClick={()=>setLyrics(null)} aria-label="Fechar"><X/></button><span className="portal-kicker">SOM & LETRA · LETRAS</span><h2>{lyrics.title}</h2><p className="portal-lyrics-artist">{lyrics.artist}</p><div className="portal-lyrics-content">{lyricsLoading ? "Consultando fonte de letras..." : lyrics.text}</div><p className="portal-lyrics-footnote">A disponibilidade depende da fonte consultada e dos direitos de uso da letra.</p><button className="portal-modal-close-bottom" onClick={()=>setLyrics(null)}>Fechar</button></section></div>}
  </div>;
}
