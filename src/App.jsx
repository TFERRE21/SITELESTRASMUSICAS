import { useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Square, Search, Music2, SkipForward, Heart, Menu, X, ArrowRight, ChevronRight, Play, Disc3, Mic2, Headphones, Sparkles, BookOpen, Crown, Printer, Download, Share2, Youtube, Home, UserRound, LifeBuoy, Send, LogOut, CircleUserRound, ListMusic, ShoppingBag, Guitar, Piano, Package, SlidersHorizontal, ExternalLink, BadgePercent, ArrowUpRight, Languages } from "lucide-react";
import { institutional } from "./config/institutional.js";

const genres = ["Todos", "Gospel", "Sertanejo", "MPB", "Pop", "Rock", "Rap", "Funk", "Pagode", "Samba", "Forró", "Reggae", "Indie", "Jazz", "Música Latina"];
const normalize = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const adaptChordContentForInstrument = (content, instrument, source = "") => {
  const text = String(content || "").trim();
  if (!text || ["Violão", "Guitarra"].includes(instrument)) return text;
  if (source === "catalogo-interno-referencia" || source === "guia-adaptado-de-referencia" || text.startsWith("REFERÊNCIA INTERNA SIMPLIFICADA")) return text;
  // Read chord symbols from chord/section lines, and ignore tablature and lyric-only lines.
  const chordSource = text.split("\n").filter((line) =>
    !/^\s*[eEBGDA]\|[-0-9hpb~/\\-]{3,}/.test(line) &&
    !/^\s*(?:GUIA |LINHA-GUIA|MÃO |COMPASSO|ESTROFE:|REFRÃO:|PONTE|Este |Use |Confira |Não é |Adapte |BATIDA )/i.test(line)
  ).join("\n");
  const chordTokens = [...new Set(chordSource.match(/(?:^|[\s|])([A-G](?:#|b)?(?:m|min|maj|sus|dim|aug|add)?[0-9]?(?:\/[A-G](?:#|b)?)?)(?=$|[\s|),])/gm)?.map((token) => token.trim()) || [])].slice(0, 24);
  const chordLine = chordTokens.length ? chordTokens.join(" · ") : "Não foi possível identificar acordes com segurança na referência.";
  const titleLine = "GUIA DE ESTUDO PARA " + instrument.toUpperCase();
  if (instrument === "Bateria") return [
    titleLine,
    "Este é um guia rítmico sugerido; acordes não permitem recuperar a bateria original.",
    "COMPASSO SUGERIDO: 4/4",
    "ESTROFE: chimbal fechado em colcheias, bumbo leve e caixa nos tempos 2 e 4.",
    "REFRÃO: bumbo firme, caixa nos tempos 2 e 4 e prato nas entradas.",
    "PONTE: reduza a dinâmica e faça uma virada curta para retornar ao refrão.",
    "Não é uma transcrição da gravação."
  ].join("\n");
  if (instrument === "Baixo") return [
    titleLine,
    "LINHA-GUIA DERIVADA DOS ACORDES, não uma transcrição oficial.",
    "ACORDES / HARMONIA DETECTADOS: " + chordLine,
    "Toque a nota fundamental de cada acorde no tempo; acrescente oitavas e aproximações apenas se combinarem com a banda.",
    "Confira a tonalidade com a gravação antes de tocar."
  ].join("\n");
  if (instrument === "Teclado" || instrument === "Piano") return [
    titleLine,
    "ACORDES DETECTADOS NA REFERÊNCIA: " + chordLine,
    "MÃO ESQUERDA: toque a fundamental ou oitavas.",
    "MÃO DIREITA: forme tríades e experimente inversões, mantendo notas comuns entre as mudanças.",
    "Guia simplificado de estudo, não uma transcrição oficial."
  ].join("\n");
  if (instrument === "Ukulele") return [
    titleLine,
    "ACORDES PARA CONFERIR: " + chordLine,
    "Adapte as formas para a afinação G-C-E-A; simplifique acordes difíceis quando necessário.",
    "BATIDA SUGERIDA: ↓ ↓↑ ↑↓↑, começando devagar.",
    "Confira as formas e o tom antes de tocar."
  ].join("\n");
  return text;
};


function Cover({ item, index = 0, className = "" }) {
  const colors = ["#e9dffb", "#f8e2d8", "#dcecf7", "#f7edce", "#dcefe5", "#f4ddeb"];
  const image = item?.artworkUrl || item?.artworkUrl100;
  return image
    ? <img className={`music-cover ${className}`} src={image} alt={`Capa de ${item.title || item.name || "música"}`} loading="lazy" />
    : <div className={`music-cover music-cover--placeholder ${className}`} style={{ background: colors[index % colors.length] }}><AudioLines size={26} /><span>VersosMusicais</span></div>;
}

function LanguageSwitcher() {
  useEffect(() => {
    let observer;
    const labelOriginalLanguage = () => {
      const combo = document.querySelector("#google_translate_element .goog-te-combo");
      if (!combo) return;
      const firstOption = combo.options?.[0];
      if (firstOption && firstOption.value === "" && firstOption.textContent !== "Português") firstOption.textContent = "Português";
      combo.setAttribute("aria-label", "Selecionar idioma do site");
      combo.title = "Selecionar idioma";
    };

    const mount = () => {
      if (window.google?.translate?.TranslateElement) {
        if (!document.querySelector("#google_translate_element .goog-te-combo")) {
          new window.google.translate.TranslateElement({
            pageLanguage: "pt",
            includedLanguages: "en,es,fr,it,de",
            autoDisplay: false
          }, "google_translate_element");
        }
        labelOriginalLanguage();
        const target = document.getElementById("google_translate_element");
        if (target && !observer) {
          observer = new MutationObserver(labelOriginalLanguage);
          observer.observe(target, { childList: true, subtree: true });
        }
        return true;
      }
      return false;
    };

    if (mount()) return () => observer?.disconnect();
    window.googleTranslateElementInit = mount;
    if (!document.querySelector('script[data-versos-google-translate]')) {
      const script = document.createElement("script");
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      script.dataset.versosGoogleTranslate = "true";
      document.head.appendChild(script);
    }
    return () => observer?.disconnect();
  }, []);

  return <div className="language-switcher" aria-label="Trocar idioma">
    <Languages className="language-switcher__icon" size={17} strokeWidth={2.1} aria-hidden="true" />
    <div className="language-switcher__content"><span className="language-switcher__label">Idioma</span><div id="google_translate_element"><span className="language-switcher__placeholder">Português</span></div></div>
  </div>;
}

function Brand({ onClick }) {
  return <a className="reference-brand" href="#inicio" onClick={onClick} aria-label="VersosMusicais — Início">
    <img className="reference-brand__logo" src="/versos-musicais-logo.svg" alt="VersosMusicais — Letras que tocam você" />
  </a>;
}


const genreSlug = (value) => normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const genreFromSlug = (slug) => genres.find((item) => item !== "Todos" && genreSlug(item) === slug) || "";

function ArtistPortrait({ name, genre, index }) {
  const [image, setImage] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const lookup = async () => {
      for (const lang of ["pt", "en"]) {
        try {
          const searchUrl = new URL(`https://${lang}.wikipedia.org/w/api.php`);
          searchUrl.search = new URLSearchParams({ action: "query", format: "json", origin: "*", generator: "search", gsrsearch: name, gsrnamespace: "0", gsrlimit: "1", prop: "pageimages", piprop: "thumbnail", pithumbsize: "500" }).toString();
          const searchResponse = await fetch(searchUrl);
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const page = Object.values(searchData.query?.pages || {})[0];
            const imageUrl = page?.thumbnail?.source || "";
            if (imageUrl && !cancelled) { setImage(imageUrl); return; }
          }
          const summaryResponse = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/ /g, "_"))}`, { headers: { Accept: "application/json" } });
          if (summaryResponse.ok) {
            const summary = await summaryResponse.json();
            const imageUrl = summary.thumbnail?.source || summary.originalimage?.source || "";
            if (imageUrl && !cancelled) { setImage(imageUrl); return; }
          }
        } catch {}
      }
      if (!cancelled) setFailed(true);
    };
    lookup();
    return () => { cancelled = true; };
  }, [name]);
  const colors = ["#e9dffb", "#f8e2d8", "#dcecf7", "#f7edce", "#dcefe5", "#f4ddeb"];
  return image
    ? <img className="genre-portrait" src={image} alt={`Foto de ${name}`} loading="lazy" />
    : <div className="genre-portrait genre-portrait--fallback" style={{ background: colors[index % colors.length] }} aria-label={failed ? `Foto indisponível para ${name}` : `Carregando foto de ${name}`}><span>{name.split(/\\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span></div>;
}

function GenreDirectoryPage({ name, onBack, onViewArtist }) {
  const [artists, setArtists] = useState([]);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [remoteArtistResults, setRemoteArtistResults] = useState([]);
  const [remoteArtistLoading, setRemoteArtistLoading] = useState(false);
  const [remoteArtistError, setRemoteArtistError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError("");
    fetch(`/api/genre-artists?genre=${encodeURIComponent(name)}`)
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Não foi possível carregar os artistas."); return data; })
      .then((data) => { if (!cancelled) { setArtists(Array.isArray(data.items) ? data.items : []); setSource(data.source || "Catálogo musical"); } })
      .catch((err) => { if (!cancelled) setError(err.message || "Falha ao carregar os artistas."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [name]);
  useEffect(() => {
    const query = filter.trim();
    if (query.length < 2) { setRemoteArtistResults([]); setRemoteArtistError(""); setRemoteArtistLoading(false); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setRemoteArtistLoading(true); setRemoteArtistError("");
      try {
        const response = await fetch("/api/artists?q=" + encodeURIComponent(query) + "&page=1");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Não foi possível pesquisar esse artista.");
        if (!cancelled) setRemoteArtistResults(Array.isArray(data.items) ? data.items : []);
      } catch (err) {
        if (!cancelled) { setRemoteArtistResults([]); setRemoteArtistError(err.message || "A busca de artistas está temporariamente indisponível."); }
      } finally { if (!cancelled) setRemoteArtistLoading(false); }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [filter]);
  const localMatches = artists.filter((artist) => normalize(artist.name || artist.title).includes(normalize(filter)));
  const visibleArtists = filter.trim().length >= 2
    ? [...new Map([...localMatches, ...remoteArtistResults].map((artist) => [normalize(artist.name || artist.title), artist])).values()]
    : localMatches;
  return <div className="genre-directory">
    <header className="genre-directory-hero">
      <div className="genre-directory-hero__texture" />
      <div className="genre-directory-hero__top"><a href="/" onClick={(event) => { event.preventDefault(); onBack(); }}>⌂ Início</a><ChevronRight size={15}/><span>Gêneros</span><ChevronRight size={15}/><span>{name}</span></div>
      <div className="genre-directory-hero__main"><div><span className="genre-directory-kicker">EXPLORE O UNIVERSO MUSICAL</span><h1>Artistas de <em>{name}</em></h1><p>{loading ? "Carregando artistas..." : filter.trim().length >= 2 ? (remoteArtistLoading ? `Buscando “${filter.trim()}” em catálogos musicais...` : `${visibleArtists.length} resultados para “${filter.trim()}”.`) : `${artists.length} artistas encontrados no gênero ${name}.`}</p><small>Fonte consultada: {source || "Catálogo de artistas brasileiros"}</small></div>
      <label className="genre-directory-search"><Search size={19}/><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Digite qualquer nome de artista..." aria-label="Buscar qualquer artista" autoComplete="off"/></label>
      <button className="genre-directory-clear" onClick={() => setFilter("")}>Limpar pesquisa <X size={16}/></button></div>
    </header>
    <main className="genre-directory-content">
      {loading ? <div className="genre-directory-status"><AudioLines size={24}/> Carregando artistas brasileiros...</div> :
       error ? <div className="genre-directory-status">{error}<button onClick={() => window.location.reload()}>Tentar novamente</button></div> :
       remoteArtistLoading && filter.trim().length >= 2 && !visibleArtists.length ? <div className="genre-directory-status"><AudioLines size={24}/> Buscando artistas em catálogos musicais...</div> :
       visibleArtists.length ? <div className="genre-directory-grid">{visibleArtists.map((artist, index) => {
         const artistName = artist.name || artist.title;
         return <article className="genre-directory-card" key={artist.id || artistName}>
           <ArtistPortrait name={artistName} genre={name} index={index}/>
           <div className="genre-directory-card__body"><h2>{artistName}</h2><p>Cantor(a) ou banda · {name}</p><small>{artist.provider || "Seleção de artistas brasileiros"}{artist.country ? ` · ${artist.country === "BR" ? "Brasil" : artist.country}` : " · Brasil"}</small>
           <button onClick={() => onViewArtist(artistName)}>Ver músicas <ChevronRight size={17}/></button></div>
         </article>;
       })}</div> : <div className="genre-directory-status">{remoteArtistError || (filter.trim().length >= 2 && remoteArtistLoading ? "Buscando artista..." : "Nenhum artista encontrado com esse nome. Tente outra grafia.")}</div>}
      {remoteArtistError && visibleArtists.length > 0 && <div className="genre-directory-status">{remoteArtistError}</div>}
    </main>
    <footer className="genre-directory-footer"><button onClick={onBack}><ChevronRight size={16}/> Voltar à página inicial</button><span>VersosMusicais · Letras que tocam você</span></footer>
  </div>;
}


const siteSections = {
  letras: { title: "Letras de músicas", kicker: "PESQUISA MUSICAL", description: "Encontre letras, músicas e artistas em um só lugar.", intro: "Busque por música, cantor ou trecho da letra." },
  artistas: { title: "Explore artistas", kicker: "ARTISTAS", description: "Descubra cantores e bandas que fazem parte da sua trilha sonora.", intro: "Pesquise um artista para encontrar suas músicas." },
  albuns: { title: "Álbuns musicais", kicker: "DISCOGRAFIA", description: "Explore lançamentos e álbuns dos seus artistas favoritos.", intro: "Encontre álbuns e músicas por artista." },
  playlists: { title: "Playlists para cada momento", kicker: "SUA TRILHA SONORA", description: "Descubra estilos e ideias para montar sua próxima playlist.", intro: "Escolha um estilo ou busque suas músicas favoritas." },
  "em-alta": { title: "Em alta agora", kicker: "RANKINGS MUSICAIS", description: "Veja músicas populares no Brasil e no mundo.", intro: "Abra uma música para consultar sua letra." },
  generos: { title: "Explore os gêneros", kicker: "GÊNEROS MUSICAIS", description: "Cada estilo tem sua história. Encontre os artistas do seu gênero favorito.", intro: "Escolha um gênero para abrir sua página exclusiva." },
  loja: { title: "Loja de Produtos Som & Estilo", kicker: "OFERTAS PARA QUEM AMA MÚSICA", description: "Encontre instrumentos, acessórios e equipamentos para tocar, gravar e curtir música.", intro: "Explore nossa vitrine e veja os produtos selecionados no Mercado Livre." }
};
const sectionSlug = (value) => normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const affiliateProducts = [
  { id: "violao-estudo", name: "Violões para começar", category: "Instrumentos", description: "Modelos acústicos para estudo, prática e rodas de música.", icon: "guitar", affiliateUrl: "" },
  { id: "guitarra-baixo", name: "Guitarras e baixos", category: "Instrumentos", description: "Opções para montar seu som, do ensaio ao palco.", icon: "guitar", affiliateUrl: "" },
  { id: "teclados-pianos", name: "Teclados e pianos digitais", category: "Instrumentos", description: "Teclas para estudar, compor e tocar ao vivo.", icon: "keys", affiliateUrl: "" },
  { id: "bateria-percussao", name: "Baterias e percussão", category: "Instrumentos", description: "Ritmo, prática e acessórios para bateristas.", icon: "package", affiliateUrl: "" },
  { id: "cordas-palhetas", name: "Cordas e palhetas", category: "Acessórios", description: "Itens de reposição para manter seu instrumento pronto.", icon: "package", affiliateUrl: "" },
  { id: "afinadores-capotraste", name: "Afinadores e capotrastes", category: "Acessórios", description: "Pequenos acessórios que facilitam a rotina musical.", icon: "package", affiliateUrl: "" },
  { id: "cabos-suportes", name: "Cabos, correias e suportes", category: "Acessórios", description: "Organize seu setup para estudar, ensaiar e tocar.", icon: "package", affiliateUrl: "" },
  { id: "audio-home-studio", name: "Áudio e home studio", category: "Áudio", description: "Fones, microfones e equipamentos para gravação.", icon: "audio", affiliateUrl: "" }
];

function StorefrontPage() {
  const [category, setCategory] = useState("Todos");
  const [term, setTerm] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const categories = ["Todos", "Instrumentos", "Acessórios", "Áudio"];
  const products = affiliateProducts.filter((item) =>
    (category === "Todos" || item.category === category) &&
    (!onlyAvailable || Boolean(item.affiliateUrl)) &&
    normalize(item.name + " " + item.description + " " + item.category).includes(normalize(term))
  );
  const iconFor = (item) => item.icon === "guitar" ? <Guitar size={28}/> : item.icon === "keys" ? <Piano size={28}/> : item.icon === "audio" ? <Headphones size={28}/> : <Package size={28}/>;
  return <div className="storefront">
    <section className="storefront-hero">
      <div className="storefront-hero__orb storefront-hero__orb--one"/><div className="storefront-hero__orb storefront-hero__orb--two"/>
      <div className="storefront-hero__content"><span className="storefront-eyebrow"><Sparkles size={14}/> LOJA OFICIAL DE OFERTAS · SOM & ESTILO</span><h2>Loja de Produtos<br/><em>para sua paixão musical.</em></h2><p>Descubra instrumentos, acessórios e equipamentos para tocar, estudar, ensaiar e gravar. Confira nossa vitrine no Mercado Livre.</p><div className="storefront-hero__pills"><span><Guitar size={14}/> Instrumentos</span><span><Package size={14}/> Acessórios</span><span><Headphones size={14}/> Áudio</span></div><a className="storefront-hero__cta" href="https://meli.la/27Zigov" target="_blank" rel="sponsored nofollow noopener"><ShoppingBag size={18}/> VER OFERTAS NA VITRINE <ArrowUpRight size={17}/></a></div>
      <div className="storefront-hero__art" aria-hidden="true"><div className="storefront-record"><div/><span>♫</span></div><div className="storefront-note storefront-note--one">♪</div><div className="storefront-note storefront-note--two">♫</div></div>
    </section>
    <section className="storefront-toolbar"><div><span className="storefront-kicker">VITRINE SOM & ESTILO</span><h2>Explore por categoria</h2><p>Busque instrumentos e acessórios aqui ou veja todas as ofertas na vitrine do Mercado Livre.</p></div><label className="storefront-search"><Search size={18}/><input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Buscar instrumento ou acessório..." aria-label="Buscar produtos na loja"/></label></section>
    <div className="storefront-filters" role="group" aria-label="Filtrar produtos por categoria">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}<button className={onlyAvailable ? "active" : ""} onClick={() => setOnlyAvailable((value) => !value)}><SlidersHorizontal size={14}/> Com link afiliado</button></div>
    <div className="storefront-grid">{products.map((item, index) => <article className="storefront-card" key={item.id}><div className={"storefront-card__visual storefront-card__visual--" + item.icon}>{iconFor(item)}<span>{item.category}</span></div><div className="storefront-card__body"><small className="storefront-card__eyebrow">SOM & ESTILO · SELEÇÃO MUSICAL</small><h3>{item.name}</h3><p>{item.description}</p><div className="storefront-card__footer">{item.affiliateUrl ? <a href={item.affiliateUrl} target="_blank" rel="sponsored nofollow noopener">Ver oferta <ExternalLink size={14}/></a> : <span className="storefront-card__pending">Oferta em preparação</span>}<small>{String(index + 1).padStart(2,"0")}</small></div></div></article>)}</div>
    {!products.length && <div className="storefront-empty"><Search size={24}/><strong>Nenhum produto encontrado</strong><p>Tente outro termo ou categoria.</p></div>}
    <aside className="storefront-disclosure"><ShoppingBag size={18}/><p><strong>Transparência:</strong> o botão principal abre a vitrine compartilhada do Mercado Livre que você informou. A comissão depende das regras do programa e da elegibilidade da compra. Os cartões abaixo só terão botão de compra quando seus links individuais de afiliado forem configurados.</p></aside>
    <section className="storefront-next"><div><span className="storefront-kicker">COMPRE PELA NOSSA VITRINE</span><h2>Encontre sua próxima compra musical.</h2><p>Veja os produtos disponíveis na vitrine do Mercado Livre. Ao acessar uma oferta, confira as condições e os detalhes diretamente na plataforma.</p></div><a href="https://meli.la/27Zigov" target="_blank" rel="sponsored nofollow noopener">Abrir vitrine completa <ArrowRight size={16}/></a></section>
  </div>;
}

function SiteSectionPage({ section, chart, globalChart, onNavigate, onGenre, onSearch, onOpenSong, onAccount, onSupport }) {
  const config = siteSections[section] || siteSections.letras;
  const [term, setTerm] = useState("");
  const [chartRegion, setChartRegion] = useState("br");
  const [artistCatalog, setArtistCatalog] = useState([]);
  const [artistCatalogLoading, setArtistCatalogLoading] = useState(false);
  const [artistCatalogError, setArtistCatalogError] = useState("");
  const [artistCatalogPage, setArtistCatalogPage] = useState(1);
  const [artistCatalogHasMore, setArtistCatalogHasMore] = useState(false);
  const [artistCatalogTotal, setArtistCatalogTotal] = useState(0);
  useEffect(() => {
    if (section !== "artistas") return;
    let cancelled = false;
    const query = term.trim();
    const timer = setTimeout(async () => {
      setArtistCatalogLoading(true);
      setArtistCatalogError("");
      setArtistCatalogPage(1);
      try {
        const url = query.length >= 2 ? `/api/artists?q=${encodeURIComponent(query)}&page=1` : "/api/artists";
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Não foi possível carregar os artistas.");
        if (cancelled) return;
        setArtistCatalog(Array.isArray(data.items) ? data.items : []);
        setArtistCatalogTotal(Number(data.total || 0));
        setArtistCatalogHasMore(Boolean(data.hasMore));
      } catch (error) {
        if (!cancelled) {
          setArtistCatalogError(error.message || "Erro ao carregar artistas.");
          setArtistCatalog([]);
          setArtistCatalogTotal(0);
          setArtistCatalogHasMore(false);
        }
      } finally {
        if (!cancelled) setArtistCatalogLoading(false);
      }
    }, query.length >= 2 ? 350 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [section, term]);
  const loadMoreArtists = async () => {
    if (artistCatalogLoading || !artistCatalogHasMore) return;
    const nextPage = artistCatalogPage + 1;
    setArtistCatalogLoading(true);
    setArtistCatalogError("");
    try {
      const response = await fetch(`/api/artists?q=${encodeURIComponent(term.trim())}&page=${nextPage}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar mais artistas.");
      setArtistCatalog((current) => {
        const known = new Set(current.map((artist) => normalize(artist.name)));
        return [...current, ...(data.items || []).filter((artist) => !known.has(normalize(artist.name)))];
      });
      setArtistCatalogPage(nextPage);
      setArtistCatalogTotal(Number(data.total || artistCatalogTotal));
      setArtistCatalogHasMore(Boolean(data.hasMore));
    } catch (error) {
      setArtistCatalogError(error.message || "Erro ao carregar mais artistas.");
    } finally {
      setArtistCatalogLoading(false);
    }
  };
  const songs = section === "em-alta" ? (chartRegion === "br" ? chart : globalChart) : chart;
  const artists = [];
  for (const item of [...chart, ...globalChart]) {
    const name = item.artist || item.artistName;
    if (name && !artists.some((artist) => normalize(artist.name) === normalize(name))) artists.push({ name, artworkUrl: item.artworkUrl || item.artworkUrl100, item });
  }
  const allArtists = section === "artistas" ? artistCatalog : artists;
  const filteredArtists = allArtists.filter((artist) => normalize(artist.name).includes(normalize(term)));
  const albums = [];
  for (const item of [...chart, ...globalChart]) {
    const name = item.album;
    if (name && !albums.some((album) => normalize(album.name) === normalize(name))) albums.push({ name, artist: item.artist || item.artistName, artworkUrl: item.artworkUrl || item.artworkUrl100, item });
  }
  const submitSearch = (event) => { event.preventDefault(); if (term.trim()) onSearch(term.trim()); };
  const genresToShow = ["Gospel", "Sertanejo", "MPB", "Pop", "Rock", "Rap", "Funk", "Pagode", "Samba", "Forró", "Reggae", "Indie", "Jazz", "Música Latina"];
  const playlists = [
    { title: "Louvor e adoração", genre: "Gospel", desc: "Músicas para renovar a fé" },
    { title: "Sertanejo apaixonado", genre: "Sertanejo", desc: "Clássicos e sucessos atuais" },
    { title: "Brasil em canção", genre: "MPB", desc: "Grandes vozes da música brasileira" },
    { title: "Pop para animar", genre: "Pop", desc: "Hits para todos os momentos" },
    { title: "Pagode com amigos", genre: "Pagode", desc: "Samba e pagode para curtir junto" },
    { title: "Rap nacional", genre: "Rap", desc: "Rimas e vozes brasileiras" }
  ];
  return <div className="genre-directory site-section-page">
    <header className="genre-directory-hero">
      <div className="genre-directory-hero__texture" />
      <div className="section-page-header">
        <a className="section-page-brand" href="/" onClick={(event) => { event.preventDefault(); onNavigate("home"); }}><Music2 size={25} fill="currentColor"/><span>Site <em>Músicas</em><small>LETRAS QUE TOCAM VOCÊ</small></span></a>
        <nav className="section-page-nav" aria-label="Navegação principal">
          {[["home","Início"],["letras","Letras"],["artistas","Artistas"],["albuns","Álbuns"],["playlists","Playlists"],["em-alta","Em Alta"],["generos","Gêneros"],["loja","Loja de Produtos"]].map(([key,label]) => <button className={section === key ? "active" : ""} key={key} onClick={() => onNavigate(key)}>{key === "loja" && <ShoppingBag size={14}/>} {label}</button>)}
        </nav>
        <div className="section-page-actions"><button onClick={onAccount}>Entrar / Meus Dados</button><button onClick={onSupport}>Suporte</button></div>
      </div>
      <div className="section-page-hero">
        <span className="genre-directory-kicker">{config.kicker}</span>
        <h1>{config.title}</h1><p>{config.description}</p><small>{config.intro}</small>
        {["letras","artistas","albuns"].includes(section) && <form className="section-page-search" onSubmit={submitSearch}><Search size={19}/><input value={term} onChange={(event) => setTerm(event.target.value)} placeholder={section === "letras" ? "Buscar música, artista ou trecho da letra..." : section === "artistas" ? "Digite o nome do artista..." : "Digite o nome do álbum ou artista..."} aria-label={config.intro}/><button type="submit">Pesquisar <ArrowRight size={16}/></button></form>}
      </div>
    </header>
    <main className="section-page-content">
      {section === "loja" && <StorefrontPage />}
      {section === "generos" && <><div className="section-page-heading"><h2>Escolha seu gênero musical</h2><p>Abra uma página dedicada para conhecer os artistas de cada estilo.</p></div><div className="section-page-genre-grid">{genresToShow.map((name, index) => <button key={name} onClick={() => onGenre(name)}><span>{["✝","♫","♪","☆","♬","♩","◉","▤"][index%8]}</span><strong>{name}</strong><small>Ver artistas <ChevronRight size={14}/></small></button>)}</div></>}
      {section === "artistas" && <><div className="section-page-heading"><h2>{term.trim().length >= 2 ? `Resultados para “${term.trim()}”` : "Todos os artistas"}</h2><p>{artistCatalogLoading ? "Buscando artistas automaticamente..." : term.trim().length >= 2 ? `${artistCatalogTotal} artistas encontrados. Mostrando ${allArtists.length} nesta página.` : `${allArtists.length} artistas no catálogo inicial. Digite qualquer nome para consultar o catálogo completo.`}</p></div><div className="section-page-catalog-filter"><Search size={18}/><input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Digite qualquer nome de artista..." aria-label="Buscar qualquer artista" autoComplete="off"/><button type="button" onClick={() => { if (term.trim()) onSearch(term.trim()); }}>Buscar músicas</button></div>{term.trim().length >= 2 && artistCatalog.length > 0 && <div className="artist-autocomplete" role="listbox" aria-label="Sugestões de artistas">{artistCatalog.slice(0, 8).map((artist) => <button type="button" role="option" key={artist.id || artist.name} onClick={() => onSearch(artist.name)}><span className="artist-autocomplete__icon"><UserRound size={16}/></span><span className="artist-autocomplete__text"><strong>{artist.name}</strong><small>{artist.genre || artist.country || "Artista"}</small></span><span className="artist-autocomplete__action">Ver músicas <ChevronRight size={14}/></span></button>)}</div>}{artistCatalogError && <p className="section-page-empty">{artistCatalogError}</p>}<div className="section-page-cards">{filteredArtists.map((artist,index)=><button className="section-page-card" key={artist.id || artist.name} onClick={() => onSearch(artist.name)}><Cover item={{title:artist.name,artworkUrl:artist.artworkUrl}} index={index}/><strong>{artist.name}</strong><small>{artist.genre || "Artista brasileiro"}</small><span>Ver músicas <ChevronRight size={14}/></span></button>)}</div>{!artistCatalogLoading && !filteredArtists.length && <p className="section-page-empty">Nenhum artista encontrado com esse nome. Tente outra grafia.</p>}{artistCatalogHasMore && <div className="section-page-load-more"><button type="button" onClick={loadMoreArtists} disabled={artistCatalogLoading}>{artistCatalogLoading ? "Carregando..." : "Carregar mais artistas"}</button></div>}</>}
      {section === "albuns" && <><div className="section-page-heading"><h2>Álbuns do catálogo</h2><p>Explore álbuns encontrados nas músicas em destaque.</p></div><div className="section-page-cards">{albums.slice(0,32).map((album,index)=><button className="section-page-card" key={album.name} onClick={() => onSearch(album.name)}><Cover item={{title:album.name,artworkUrl:album.artworkUrl}} index={index}/><strong>{album.name}</strong><small>{album.artist || "Artista"}</small><span>Ver álbum <ChevronRight size={14}/></span></button>)}</div>{!albums.length && <p className="section-page-empty">Pesquise um artista ou álbum no campo acima para encontrar resultados.</p>}</>}
      {section === "playlists" && <><div className="section-page-heading"><h2>Encontre seu próximo som</h2><p>Seleções por estilo para você descobrir artistas e músicas.</p></div><div className="section-page-playlists">{playlists.map((playlist,index)=><button key={playlist.title} className={"section-page-playlist section-page-playlist--"+index%6} onClick={() => onGenre(playlist.genre)}><span className="section-page-playlist-icon"><ListMusic size={28}/></span><span><strong>{playlist.title}</strong><small>{playlist.desc}</small><em>Explorar músicas <ArrowRight size={14}/></em></span></button>)}</div></>}
      {section === "em-alta" && <><div className="section-page-heading"><h2>Rankings musicais: Brasil e mundo</h2><p>Descubra quais músicas estão em destaque nos rankings do Brasil e do cenário internacional.</p></div><section className="section-page-seo-copy" aria-label="Sobre os rankings musicais"><h2>As músicas que estão em alta</h2><p>Esta página reúne listas de músicas populares para ajudar você a descobrir novos sons, acompanhar artistas em destaque e encontrar sua próxima música favorita. Alterne entre <strong>Top Brasil</strong> e <strong>Top Global</strong> para explorar os rankings separadamente.</p><h3>Top Brasil</h3><p>Veja as faixas em destaque no mercado brasileiro e descubra artistas nacionais, lançamentos e estilos que estão chamando a atenção dos ouvintes.</p><h3>Top Global</h3><p>Explore músicas populares no cenário internacional e conheça artistas e tendências de diferentes países. A disponibilidade das listas depende da fonte musical consultada.</p><p>Os rankings podem mudar com o tempo. Use a lista abaixo para abrir uma música e consultar as informações disponíveis no Versos Musicais.</p><div className="section-page-seo-links"><button type="button" onClick={() => onNavigate("letras")}>Buscar letras de músicas</button><button type="button" onClick={() => onNavigate("artistas")}>Explorar artistas</button><button type="button" onClick={() => onNavigate("generos")}>Descobrir gêneros musicais</button></div></section><div className="portal-tabs" role="tablist" aria-label="Região do ranking"><button type="button" role="tab" aria-selected={chartRegion === "br"} className={chartRegion === "br" ? "active" : ""} onClick={() => setChartRegion("br")}>🇧🇷 Top Brasil</button><button type="button" role="tab" aria-selected={chartRegion === "global"} className={chartRegion === "global" ? "active" : ""} onClick={() => setChartRegion("global")}>🌐 Top Global</button></div><p className="section-page-chart-source">Fonte: {songs[0]?.source || "YouTube Charts"} · {chartRegion === "br" ? "Brasil" : "Global"}</p><div className="section-page-song-list">{songs.slice(0,40).map((item,index)=><button key={item.id || (item.title || item.name)+index} onClick={() => onOpenSong({...item,title:item.title || item.name,artist:item.artist || item.artistName,artworkUrl:item.artworkUrl || item.artworkUrl100})}><b>{item.rank || index+1}</b><Cover item={{...item,title:item.title || item.name,artworkUrl:item.artworkUrl || item.artworkUrl100}} index={index}/><span><strong>{item.title || item.name}</strong><small>{item.artist || item.artistName || "Artista não informado"}</small></span><ChevronRight size={17}/></button>)}</div>{!songs.length && <p className="section-page-empty">O ranking do YouTube para {chartRegion === "br" ? "o Brasil" : "o Global"} está indisponível no momento. Tente novamente mais tarde.</p>}</>}
      {section === "letras" && <><div className="section-page-heading"><h2>Encontre a letra que procura</h2><p>Digite o título, artista ou uma frase da música no campo acima.</p></div><div className="section-page-shortcuts">{["Ana Castela","Jorge & Mateus","Aline Barros","Marília Mendonça","Roberto Carlos","Gusttavo Lima"].map((name) => <button key={name} onClick={() => onSearch(name)}><Search size={15}/>{name}<ChevronRight size={14}/></button>)}</div></>}
    </main>
    <footer className="section-page-footer"><button onClick={() => onNavigate("home")}><Home size={15}/> Voltar para Início</button><span>© {new Date().getFullYear()} VersosMusicais · Letras que tocam você</span></footer>
  </div>;
}

function MusicPage({ lyrics, loading, video, videoLoading, videoError, onBack, onPrint, onDownload, onShare, onVideo, onListen, autoplayVideo, onNextTrack, nextTrackLoading, onSave, saved, catalog, onOpen, fontScale, setFontScale, account, comments, commentsLoading, commentText, setCommentText, onSubmitComment, commentError, commentNotice, audioRef, isPreviewPlaying, previewTime, previewDuration, onSeekPreview }) {
  const [artistItems, setArtistItems] = useState([]);
  const [relatedItems, setRelatedItems] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [songView, setSongView] = useState("lyrics");
  const [instrument, setInstrument] = useState("Violão");
  const [chordInput, setChordInput] = useState("");
  const [transposeBy, setTransposeBy] = useState(0);
  const [capo, setCapo] = useState(0);
  const [chordCatalogStatus, setChordCatalogStatus] = useState("idle");
  const [chordCatalogMessage, setChordCatalogMessage] = useState("");
  const [externalChordMatches, setExternalChordMatches] = useState([]);
  const uniqueExternalChordMatches = [...new Map(externalChordMatches.filter((match) => match?.url && match?.title).map((match) => [normalize(`${match.title} ${match.artist || ""} ${(match.instrumentTracks || []).join(" ")}`), match])).values()].slice(0, 5);
  const songsterrSearchUrl = `https://www.songsterr.com/?pattern=${encodeURIComponent([lyrics?.title, lyrics?.artist].filter(Boolean).join(" "))}`;
  const [savingChord, setSavingChord] = useState(false);
  const [generatingChord, setGeneratingChord] = useState(false);
  const chordNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const chordAliases = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#", "A#": "A#", "D#": "D#", "G#": "G#" };
  const transposeChordText = (text, steps) => String(text || "").replace(/\b([A-G])([#b]?)(maj7|maj|min|m7|m|dim|aug|sus2|sus4|sus|add9|7M|7|9|11|13|°|ø)?(\/[A-G][#b]?)?\b/g, (whole, root, accidental, quality = "", bass = "") => {
    const normalizedRoot = chordAliases[root + accidental] || (root + accidental);
    const index = chordNames.indexOf(normalizedRoot);
    if (index < 0) return whole;
    const newRoot = chordNames[(index + steps + 120) % 12];
    let newBass = bass;
    if (bass) {
      const match = bass.slice(1).match(/^([A-G])([#b]?)/);
      if (match) {
        const bassName = chordAliases[match[1] + match[2]] || (match[1] + match[2]);
        const bassIndex = chordNames.indexOf(bassName);
        if (bassIndex >= 0) newBass = "/" + chordNames[(bassIndex + steps + 120) % 12];
      }
    }
    return newRoot + quality + newBass;
  });
  const transposedChords = transposeChordText(chordInput, transposeBy);
  useEffect(() => {
    if (songView !== "chords" || !lyrics?.title || !lyrics?.artist) return;
    let cancelled = false;
    setChordCatalogStatus("loading");
    setChordCatalogMessage("");
    fetch(`/api/chords?title=${encodeURIComponent(lyrics.title)}&artist=${encodeURIComponent(lyrics.artist)}&instrument=${encodeURIComponent(instrument)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Não foi possível consultar as cifras do site.");
        if (cancelled) return;
        setExternalChordMatches(Array.isArray(data.externalMatches) ? data.externalMatches : []);
        if (data.chord) {
          setChordInput(adaptChordContentForInstrument(data.chord.content || "", instrument, data.chord.source || ""));
          setChordCatalogStatus("found");
          setChordCatalogMessage("Cifra carregada do catálogo do VersosMusicais.");
        } else {
          setChordInput("");
          setChordCatalogStatus("empty");
          setChordCatalogMessage(data.externalMatches?.length
            ? "Busca automática concluída: confira as fontes encontradas. A cifra só aparece aqui quando uma fonte autorizada fornece o conteúdo completo."
            : "Não encontramos uma cifra completa disponível para exibir aqui. A busca automática reuniu fontes para consultar sem cadastrar música por música.");
        }
        setTransposeBy(0);
      })
      .catch((error) => {
        if (cancelled) return;
        setChordCatalogStatus("error");
        setChordCatalogMessage(error.message || "Falha ao carregar o catálogo interno.");
      });
    return () => { cancelled = true; };
  }, [songView, lyrics?.title, lyrics?.artist, instrument]);

  const generateChordSuggestion = async () => {
    if (!lyrics?.title || !lyrics?.artist) return;
    setChordCatalogStatus("loading");
    setChordCatalogMessage("Consultando o catálogo interno do VersosMusicais...");
    try {
      const response = await fetch(`/api/chords?title=${encodeURIComponent(lyrics.title)}&artist=${encodeURIComponent(lyrics.artist)}&instrument=${encodeURIComponent(instrument)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível consultar o catálogo interno.");
      setExternalChordMatches(Array.isArray(data.externalMatches) ? data.externalMatches : []);
      if (data.chord?.content) {
        setChordInput(adaptChordContentForInstrument(data.chord.content, instrument, data.chord.source || ""));
        setTransposeBy(0);
        setChordCatalogStatus("found");
        setChordCatalogMessage("Acordes carregados diretamente no VersosMusicais.");
      } else {
        setChordCatalogStatus("empty");
        setChordCatalogMessage(data.externalMatches?.length
          ? "Busca automática concluída. As fontes encontradas podem ter cifras ou tablaturas; o conteúdo completo nem sempre pode ser importado para o site."
          : "Ainda não há cifra completa cadastrada. Use a referência abaixo ou salve uma cifra confiável.");
      }
    } catch (error) {
      setChordCatalogStatus("error");
      setChordCatalogMessage(error.message || "Falha ao consultar o catálogo interno.");
    }
  };

  const publishChordToCatalog = async () => {
    if (!chordInput.trim()) {
      setChordCatalogMessage("Cole a cifra ou os acordes antes de publicar.");
      return;
    }
    setSavingChord(true);
    setChordCatalogMessage("");
    try {
      const response = await fetch("/api/chords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: lyrics.title, artist: lyrics.artist, instrument, content: chordInput.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar a cifra.");
      setChordCatalogStatus("found");
      setChordCatalogMessage("Cifra publicada no catálogo do Som & Letra e disponível nesta música.");
    } catch (error) {
      setChordCatalogMessage(error.message || "Não foi possível salvar a cifra.");
    } finally {
      setSavingChord(false);
    }
  };
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setRecommendationsLoading(true);
      const norm = (value) => normalize(value).replace(/[^a-z0-9 ]/g, " ").replace(/\\s+/g, " ").trim();
      const request = async (term) => {
        if (!term) return [];
        const response = await fetch(`/api/music-search?q=${encodeURIComponent(term)}&page=1`);
        const raw = await response.text();
        let data;
        try { data = JSON.parse(raw); } catch { return []; }
        return response.ok && Array.isArray(data.items) ? data.items : [];
      };
      try {
        const artistQuery = await request(lyrics.artist);
        const sameArtist = [...catalog, ...artistQuery].filter((item) =>
          (norm(item.artist) === norm(lyrics.artist) || norm(item.artist).includes(norm(lyrics.artist)) || norm(lyrics.artist).includes(norm(item.artist))) &&
          norm(item.title) !== norm(lyrics.title)
        ).filter((item, index, list) => list.findIndex((x) => norm(x.title) === norm(item.title) && norm(x.artist) === norm(item.artist)) === index).slice(0, 6);
        const genreName = lyrics.genre || "";
        const isGospel = /gospel|relig|christ|crist|louvor|adora/i.test(genreName) || /gospel|louvor|adora/i.test(`${lyrics.title} ${lyrics.artist}`);
        const genreQueries = isGospel ? ["Gospel", "Christian & Gospel", "louvor gospel"] :
          genreName ? [genreName, `música ${genreName}`] : ["músicas populares Brasil"];
        const relatedLists = await Promise.all(genreQueries.map(request));
        const searchedRelated = relatedLists.flat();
        const relatedPool = [...catalog, ...searchedRelated].filter((item) =>
          norm(item.title) !== norm(lyrics.title) &&
          norm(item.artist) !== norm(lyrics.artist)
        );
        const genreMatches = relatedPool.filter((item) => {
          const tags = norm([item.genre, ...(item.genres || []).map((g) => typeof g === "string" ? g : g.name), item.title, item.artist, item.album].filter(Boolean).join(" "));
          return isGospel ? /gospel|christian|relig|louvor|adora|worship|evangel/i.test(tags) :
            genreName ? tags.includes(norm(genreName)) : false;
        });
        // A busca pelo termo de gênero é relevante mesmo quando a API não preenche o campo genre.
        const sourceForPicks = isGospel || genreName ? [...genreMatches, ...searchedRelated] : relatedPool;
        const picks = sourceForPicks.filter((item) =>
          norm(item.title) !== norm(lyrics.title) && norm(item.artist) !== norm(lyrics.artist)
        ).filter((item, index, list) =>
          list.findIndex((x) => norm(x.title) === norm(item.title) && norm(x.artist) === norm(item.artist)) === index
        ).slice(0, 8);
        if (!cancelled) { setArtistItems(sameArtist); setRelatedItems(picks); }
      } catch {
        if (!cancelled) { setArtistItems([]); setRelatedItems([]); }
      } finally {
        if (!cancelled) setRecommendationsLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [lyrics.id, lyrics.title, lyrics.artist, lyrics.genre, catalog]);
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
        <div className="reference-song-grid">
          <section className="reference-lyrics-card reference-song-workspace">
            <div className="reference-song-tabs" role="tablist" aria-label="Conteúdo da música">
              <button type="button" role="tab" aria-selected={songView === "lyrics"} className={songView === "lyrics" ? "is-active" : ""} onClick={() => setSongView("lyrics")}><BookOpen size={16}/> Letra</button>
              <button type="button" role="tab" aria-selected={songView === "chords"} className={songView === "chords" ? "is-active" : ""} onClick={() => setSongView("chords")}><Music2 size={16}/> Cifras e acordes</button>
            </div>
            {songView === "lyrics" ? <><h2>Letra de {lyrics.title}</h2><div className="reference-lyrics-text" style={{fontSize:`calc(14px * ${fontScale})`}}>{loading ? "Carregando letra..." : lyrics.text}</div><small className="reference-rights-note">As letras são exibidas somente quando disponíveis no provedor consultado.</small></> : <div className="reference-chords-panel">
              <span className="portal-kicker">PARA QUEM TOCA</span>
              <h2>Cifras de {lyrics.title}</h2>
              <p className="reference-chords-intro">Escolha o instrumento e veja a cifra aqui mesmo no Som & Letra. Você também pode contribuir com uma cifra para o catálogo interno.</p>
              <div className="reference-instrument-picker" role="group" aria-label="Escolha o instrumento">
                {["Violão","Guitarra","Teclado","Piano","Baixo","Bateria","Ukulele"].map((item) => <button type="button" key={item} className={instrument === item ? "is-active" : ""} onClick={() => { if (instrument !== item) { setChordInput(""); setTransposeBy(0); setChordCatalogMessage(""); setChordCatalogStatus("loading"); setInstrument(item); } }}>{item === "Violão" ? "🎸" : item === "Guitarra" ? "🎸" : item === "Teclado" ? "🎹" : item === "Piano" ? "🎹" : item === "Baixo" ? "🎸" : item === "Bateria" ? "🥁" : "🪕"} <span>{item}</span></button>)}
              </div>
              <div className="reference-chords-catalog-status" role="status"><Music2 size={18}/><span>{chordCatalogStatus === "loading" ? "Consultando catálogo interno..." : chordCatalogMessage || (chordCatalogStatus === "found" ? "Cifra disponível no site." : "Catálogo interno de cifras")}</span></div>
              <section className="reference-chords-external" aria-label="Referências de tablaturas">
                <h3>{uniqueExternalChordMatches.length ? "Referências encontradas" : "Pesquisar referências gratuitas"}</h3>
                <p>{uniqueExternalChordMatches.length ? "Encontramos opções externas relacionadas. Confira o nome e o artista antes de abrir; essas referências não garantem que a cifra completa esteja disponível aqui." : "A busca automática reúne fontes gratuitas relacionadas à música. A cifra completa só será exibida aqui quando houver conteúdo disponível para uso autorizado."}</p>
                {uniqueExternalChordMatches.length > 0 && <div className="reference-chords-external-list">{uniqueExternalChordMatches.map((match, index) => <article key={match.url + index}>
                  <div><strong>{match.title}</strong><span>{match.artist}</span>{match.instrumentTracks?.length > 0 && <small>Instrumentos: {match.instrumentTracks.join(", ")}</small>}</div>
                  <a href={match.url} target="_blank" rel="noreferrer">Abrir referência <ArrowRight size={14}/></a>
                </article>)}</div>}
                <a className="reference-chords-external-search" href={songsterrSearchUrl} target="_blank" rel="noreferrer">Buscar “{lyrics.title}” no Songsterr <ArrowRight size={14}/></a>
              </section>
              <div className="reference-chords-editor">
                <button type="button" className="reference-chords-generate" onClick={generateChordSuggestion}>Consultar catálogo do site</button>
                <small className="reference-chords-ai-note">As cifras disponíveis são exibidas aqui no site. Você pode editar os acordes e salvá-los no catálogo interno.</small>
                <label htmlFor="chord-input">Se já tiver os acordes, cole aqui</label>
                <textarea id="chord-input" value={chordInput} onChange={(event) => { setChordInput(event.target.value); setTransposeBy(0); }} placeholder={"Ex.: Am  F  C  G\nCole aqui a sequência de acordes ou a cifra com a letra."} rows={4}/>
                <div className="reference-chords-tools">
                  <div className="reference-transpose-controls"><span>Transpor tom</span><button type="button" onClick={() => setTransposeBy((v) => Math.max(-11, v - 1))} aria-label="Baixar um semitom">−</button><strong>{transposeBy === 0 ? "Original" : transposeBy > 0 ? "+" + transposeBy + " semitom(ns)" : transposeBy + " semitom(ns)"}</strong><button type="button" onClick={() => setTransposeBy((v) => Math.min(11, v + 1))} aria-label="Subir um semitom">+</button><button type="button" onClick={() => setTransposeBy(0)}>Reset</button></div>
                  <label className="reference-capo-control">Capotraste <select value={capo} onChange={(event) => setCapo(Number(event.target.value))}>{Array.from({length:13},(_,i)=><option key={i} value={i}>{i === 0 ? "Sem capotraste" : "Casa " + i}</option>)}</select></label>
                </div>
                {chordInput.trim() ? <div className="reference-transposed-output"><strong>{instrument === "Bateria" ? "Guia rítmico de bateria" : instrument === "Baixo" ? "Linha de baixo / notas-guia" : `Cifra para ${instrument}`}</strong><pre>{transposedChords}</pre><button type="button" onClick={() => navigator.clipboard?.writeText(transposedChords)}>Copiar {instrument === "Bateria" ? "guia" : "cifra"}</button></div> : <div className="reference-chords-note"><Music2 size={22}/><div><strong>{`Cifra ainda não cadastrada para ${instrument}`}</strong><p>O catálogo interno não encontrou conteúdo específico para este instrumento. Selecione outro instrumento ou cadastre uma referência adequada antes de publicar.</p></div></div>}
                <div className="reference-chords-publish"><button type="button" onClick={publishChordToCatalog} disabled={savingChord || !chordInput.trim()}>{savingChord ? "Publicando..." : "Salvar cifra no Som & Letra"}</button><small>Ao publicar, a cifra fica disponível no catálogo interno desta música e instrumento.</small></div>
                <div className="reference-instrument-tip"><strong>{instrument}:</strong> {instrument === "Bateria" ? "procure a levada, o andamento (BPM) e o padrão de viradas da música." : instrument === "Teclado" || instrument === "Piano" ? "procure os acordes com inversões, notas da mão direita e baixo da mão esquerda." : instrument === "Baixo" ? "procure as notas fundamentais, linhas de baixo e marcação rítmica." : "use o controle de transposição para adaptar os acordes ao seu tom confortável."}</div>
              </div>
            </div>}
          </section>
          <section className="reference-video-column">
            <div className="reference-video-card"><h2>Vídeo relacionado</h2>
              {video ? <><div className="reference-video-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.videoId)}?rel=0${autoplayVideo ? "&autoplay=1" : ""}`} title={`${lyrics.title} — vídeo relacionado`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/></div><div className="reference-video-details"><strong>{video.title}</strong><span>{video.channel || lyrics.artist}</span><a href={youtubeUrl} target="_blank" rel="noreferrer">Assistir no YouTube <ArrowRight size={14}/></a></div></>
              : <div className="reference-video-empty"><Youtube size={40}/><strong>{videoLoading ? "Localizando vídeo..." : "Vídeo oficial ou relacionado"}</strong><p>{videoError || "Busque um vídeo correspondente a esta música."}</p><button className="reference-yellow" onClick={onVideo} disabled={videoLoading}><Play size={15} fill="currentColor"/> {videoLoading ? "Buscando..." : "Carregar vídeo"}</button></div>}
            </div>
            {video && <div className="reference-video-channel"><div className="reference-video-channel__icon"><Youtube size={25}/></div><div><strong>{video.channel || lyrics.artist}</strong><span>{video.title}</span></div><a href={youtubeUrl} target="_blank" rel="noreferrer">Assistir no YouTube <ArrowRight size={14}/></a></div>}
            <a className="reference-listen-promo" href={youtubeUrl} target="_blank" rel="noreferrer"><span className="reference-listen-promo__icon"><Music2 size={29}/></span><span><strong>Ouça agora no YouTube</strong><small>Assista ao clipe e curta essa emoção.</small></span><ChevronRight size={23}/></a>
          </section>
        </div>
      </div>
      <aside className="reference-song-sidebar">
        {(artistItems.length > 0 || recommendationsLoading) && <section className="reference-related-card"><h2>Mais de {lyrics.artist}</h2>{artistItems.map((item,i)=><button key={item.id || item.title} onClick={()=>onOpen(item)}><Cover item={item} index={i}/><span><strong>{item.title}</strong><small>{item.artist}</small></span><ChevronRight size={14}/></button>)}{recommendationsLoading && !artistItems.length && <p>Buscando outras músicas deste artista…</p>}</section>}
        {(relatedItems.length > 0 || recommendationsLoading) && <section className="reference-related-card"><h2>{/gospel|relig|christ|crist|louvor|adora/i.test(lyrics.genre || "") ? "Mais artistas gospel" : `Mais de ${lyrics.genre || "este estilo"}`}</h2>{relatedItems.map((item,i)=><button key={item.id || item.title} onClick={()=>onOpen(item)}><Cover item={item} index={i}/><span><strong>{item.title}</strong><small>{item.artist}</small></span><ChevronRight size={14}/></button>)}{recommendationsLoading && !relatedItems.length && <p>Buscando músicas e artistas relacionados…</p>}</section>}
      </aside>
    </div>
    <section className="reference-comments-card">
      <div className="reference-comments-heading"><div><h2>Comentários sobre a música</h2><p>Compartilhe sua opinião com a comunidade VersosMusicais.</p></div><span>{comments.length} {comments.length === 1 ? "comentário" : "comentários"}</span></div>
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
  const [genrePage, setGenrePage] = useState("");
  const [genreRoute, setGenreRoute] = useState(() => { const match = window.location.pathname.match(/^\/generos\/([^/]+)/); return match ? genreFromSlug(decodeURIComponent(match[1])) : ""; });
  const [sectionRoute, setSectionRoute] = useState(() => { const path = window.location.pathname.split("/").filter(Boolean)[0] || ""; return ["letras","artistas","albuns","playlists","em-alta","generos","loja"].includes(path) ? path : ""; });
  const [genreArtists, setGenreArtists] = useState([]);
  const [genreArtistsLoading, setGenreArtistsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [chart, setChart] = useState([]);
  const [globalChart, setGlobalChart] = useState([]);
  const [chartSource, setChartSource] = useState("");
  const [chartNote, setChartNote] = useState("");
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState("");
  const [chartReloadKey, setChartReloadKey] = useState(0);
  const [chartRegion, setChartRegion] = useState("br");
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
  const [autoplayVideo, setAutoplayVideo] = useState(false);
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
  const [legalDoc, setLegalDoc] = useState("");
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState("");
  const [commentNotice, setCommentNotice] = useState("");
  const audioRef = useRef(null);

  // Mantém título, descrição e canonical alinhados à rota real para evitar
  // que todas as páginas da aplicação sejam apresentadas como a página inicial.
  useEffect(() => {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    const genreMatch = path.match(/^\/generos\/([^/]+)/);
    const songMatch = path.match(/^\/musica\/([^/]+)/);
    const routeMeta = {
      "/": ["Versos Musicais — Letras de músicas, artistas e gêneros", "Encontre letras de músicas, descubra cantores, artistas e gêneros musicais no Versos Musicais."],
      "/letras": ["Letras de músicas — Versos Musicais", "Pesquise letras de músicas e encontre suas canções favoritas no Versos Musicais."],
      "/artistas": ["Artistas e cantores — Versos Musicais", "Explore artistas, cantores e suas músicas no Versos Musicais."],
      "/albuns": ["Álbuns musicais — Versos Musicais", "Descubra álbuns e músicas de diferentes artistas no Versos Musicais."],
      "/playlists": ["Playlists musicais — Versos Musicais", "Explore seleções e playlists musicais no Versos Musicais."],
      "/em-alta": ["Músicas em alta — Brasil e mundo | Versos Musicais", "Confira músicas em alta no Brasil e no ranking global."],
      "/generos": ["Gêneros musicais — Versos Musicais", "Explore gêneros musicais e encontre artistas de cada estilo."],
      "/loja": ["Loja — Versos Musicais", "Produtos e acessórios para quem ama música."]
    };
    let meta = routeMeta[path] || routeMeta["/"];
    if (genreMatch) {
      const genreName = genreFromSlug(decodeURIComponent(genreMatch[1])) || decodeURIComponent(genreMatch[1]).replace(/-/g, " ");
      meta = [genreName + " — artistas e músicas | Versos Musicais", "Explore artistas e músicas do gênero " + genreName + " no Versos Musicais."];
    }
    if (songMatch) {
      const params = new URLSearchParams(window.location.search);
      const songTitle = lyrics?.title || params.get("title") || decodeURIComponent(songMatch[1]).replace(/-/g, " ");
      const songArtist = lyrics?.artist || params.get("artist") || "";
      meta = [songTitle + (songArtist ? " — " + songArtist : "") + " | Versos Musicais", "Consulte informações e disponibilidade da letra de " + songTitle + (songArtist ? " de " + songArtist : "") + " no Versos Musicais."];
      let schema = document.querySelector("script[data-versos-music-schema]");
      if (!schema) {
        schema = document.createElement("script");
        schema.type = "application/ld+json";
        schema.dataset.versosMusicSchema = "true";
        document.head.appendChild(schema);
      }
      schema.textContent = JSON.stringify({"@context":"https://schema.org","@type":"MusicRecording",name:songTitle,byArtist:songArtist ? {"@type":"MusicGroup",name:songArtist} : undefined,url:"https://versosmusicais.com.br"+path});
    } else {
      document.querySelector("script[data-versos-music-schema]")?.remove();
    }
    document.title = meta[0];
    let description = document.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement("meta");
      description.name = "description";
      document.head.appendChild(description);
    }
    description.content = meta[1];
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = "https://versosmusicais.com.br" + path;
  }, [sectionRoute, genreRoute, lyrics]);

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
    setChartLoading(true);
    setChartError("");
    const loadOne = async (region) => {
      const response = await fetch("/api/charts?country=" + region, { headers: { Accept: "application/json" } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "A fonte musical está temporariamente indisponível.");
      if (!Array.isArray(data.items) || !data.items.length) throw new Error("A fonte não retornou músicas.");
      return data;
    };
    Promise.allSettled([loadOne("br"), loadOne("us")]).then((settled) => {
      if (!active) return;
      const [brResult, globalResult] = settled;
      const br = brResult.status === "fulfilled" ? brResult.value : null;
      const global = globalResult.status === "fulfilled" ? globalResult.value : null;
      setChart(br ? br.items : []);
      setGlobalChart(global ? global.items : []);
      setChartSource([br?.source, global?.source].filter(Boolean).join(" · "));
      setChartNote(br?.note || global?.note || "");
      const errors = [];
      if (!br) errors.push("Brasil: " + (brResult.reason?.message || "não foi possível carregar."));
      if (!global) errors.push("Global: " + (globalResult.reason?.message || "não foi possível carregar."));
      setChartError(errors.join(" "));
    }).catch(() => {
      if (active) setChartError("Não foi possível consultar as listas musicais agora.");
    }).finally(() => { if (active) setChartLoading(false); });
    return () => { active = false; };
  }, [chartReloadKey]);

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
    // O botão principal prioriza o vídeo oficial incorporado, em vez da prévia curta do catálogo.
    if (video?.videoId) {
      setAutoplayVideo(true);
      document.querySelector(".reference-video-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!videoLoading) {
      await loadMusicVideo(true);
      window.setTimeout(() => document.querySelector(".reference-video-card")?.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
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
  const loadMusicVideo = async (shouldAutoplay = false) => {
    if (!lyrics) return;
    setAutoplayVideo(shouldAutoplay);
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
      const pathParts = window.location.pathname.split("/").filter(Boolean);
      const routeGenre = pathParts[0] === "generos" && pathParts[1] ? genreFromSlug(decodeURIComponent(pathParts[1])) : "";
      const section = ["letras","artistas","albuns","playlists","em-alta","generos"].includes(pathParts[0]) ? pathParts[0] : "";
      setGenreRoute(routeGenre);
      setSectionRoute(section && !routeGenre ? section : "");
      if (routeGenre || section && !new URLSearchParams(window.location.search).has("title")) { setLyrics(null); setVideo(null); setVideoError(""); setLyricsLoading(false); return; }
      const params = new URLSearchParams(window.location.search);
      let title = params.get("title");
      let artist = params.get("artist");
      if ((!title || !artist) && pathParts[0] === "musica" && pathParts[1]) {
        const slug = decodeURIComponent(pathParts[1]);
        const separator = slug.lastIndexOf("-por-");
        if (separator > 0) {
          title = slug.slice(0, separator).replace(/-/g, " ");
          artist = slug.slice(separator + 5).replace(/-/g, " ");
        }
      }
      if (title && artist) {
        openLyrics({ id: "itunes-direct", title, artist, artworkUrl: params.get("artwork") || "", album: params.get("album") || "", releaseDate: params.get("releaseDate") || "", genre: params.get("genre") || "" });
      } else {
        setLyrics(null);
        setVideo(null);
        setVideoError("");
        setLyricsLoading(false);
      }
    };
    if ((new URLSearchParams(window.location.search).has("title") && new URLSearchParams(window.location.search).has("artist")) || window.location.pathname.startsWith("/musica/")) openFromAddress();
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
      const slugify = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "musica";
      const slug = slugify(item.title) + "-por-" + slugify(item.artist);
      window.history.pushState({ song: true }, "", "/musica/" + slug + "?" + params.toString());
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setIsPreviewPlaying(false); setPreviewTime(0); setPreviewDuration(0);
    setVideo(null);
    setVideoError("");
    setLyricsLoading(true);
    setLyrics({ title: item.title, artist: item.artist, text: "Carregando letra...", previewUrl: item.previewUrl || "" });
    try {
      // Try the catalog ID first when it is a numeric LRCLIB ID; otherwise search by title/artist.
      const isLrclibId = /^\\d+$/.test(String(item.id || ""));
      let response = null;
      let data = {};
      if (isLrclibId) {
        try {
          response = await fetch(`/api/lyrics/${encodeURIComponent(item.id)}`);
          data = await response.json();
        } catch { /* Fall back to a title/artist search below. */ }
      }
      if (!response?.ok || !String(data.lyrics || "").trim()) {
        response = await fetch(`/api/lyrics/search?title=${encodeURIComponent(item.title)}&artist=${encodeURIComponent(item.artist)}`);
        data = await response.json();
      }
      const text = String(data.lyrics || "").trim();
      setLyrics({
        ...item,
        title: data.trackName || item.title,
        artist: data.artistName || item.artist,
        text: text || data.error || (response.status === 503 || response.status === 502
          ? "O serviço de letras está temporariamente instável. Tente novamente mais tarde."
          : "Não encontramos a letra desta música nas fontes disponíveis."),
        previewUrl: item.previewUrl || ""
      });
    } catch (error) {
      setLyrics({ ...item, title: item.title, artist: item.artist, text: "Não foi possível carregar a letra agora. Tente novamente em instantes.", previewUrl: item.previewUrl || "" });
    }
    finally { setLyricsLoading(false); }
  };

  const songCatalog = useMemo(() => [...results, ...chart.map((item) => ({...item, title:item.title || item.name, artist:item.artist || item.artistName, artworkUrl:item.artworkUrl || item.artworkUrl100}))], [results, chart]);
  const navigateSection = (section) => {
    if (section === "loja") { window.location.href = "https://meli.la/27Zigov"; return; }
    setLyrics(null); setVideo(null); setVideoError(""); setGenreRoute(""); setGenrePage("");
    setSectionRoute(section === "home" ? "" : section);
    const path = section === "home" ? "/" : `/${section}`;
    window.history.pushState({ section }, "", path);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setMobileOpen(false);
  };
  const openGenrePage = (name) => {
    setGenre(name); setGenrePage(name); setGenreRoute(name); setSectionRoute(""); setQuery(name); setSubmittedQuery("");
    setResults([]); setGenreArtists([]); setLyrics(null); setVideo(null); setVideoError("");
    window.history.pushState({ genre: name }, "", `/generos/${genreSlug(name)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const backFromGenre = () => {
    setGenreRoute(""); setSectionRoute(""); setGenrePage(""); setSubmittedQuery(""); setLyrics(null); setVideo(null);
    window.history.pushState({}, "", "/"); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openArtistSongs = (name) => {
    setGenreRoute(""); setSectionRoute(""); setGenrePage(""); window.history.pushState({}, "", "/");
    setQuery(name); search(name, 1); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const searchFromSection = (term) => {
    setGenreRoute(""); setSectionRoute(""); setGenrePage(""); setQuery(term);
    window.history.pushState({}, "", "/"); search(term, 1); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const backToPortal = () => { window.history.replaceState({}, "", window.location.pathname); setLyrics(null); setVideo(null); setVideoError(""); setLyricsLoading(false); };
  const shareCurrentSong = async () => { try { if (navigator.share) await navigator.share({title:lyrics?.title || "VersosMusicais", text:`${lyrics?.title || ""} — ${lyrics?.artist || ""}`, url:window.location.href}); else if (navigator.clipboard) await navigator.clipboard.writeText(window.location.href); } catch {} };
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
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — VersosMusicais</title><style>
      @page{size:A4;margin:16mm 17mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#182036;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      body{max-width:800px;margin:0 auto;padding:26px 30px 35px}.brand{display:flex;align-items:center;gap:13px;border-bottom:3px solid #ffd633;padding-bottom:16px;margin-bottom:24px}.logo{width:48px;height:48px;display:grid;place-items:center;border-radius:13px;background:#ffd633;color:#151a2d;font-size:31px;font-weight:900}.brand strong{display:block;font-size:23px;letter-spacing:-.7px}.brand em{font-style:normal;color:#7451dd}.brand small{display:block;margin-top:5px;color:#747b8c;font-size:9px;letter-spacing:1.2px;text-transform:uppercase}.song{display:flex;align-items:center;gap:18px;padding:0 0 20px;border-bottom:1px solid #e2e6ef;margin-bottom:23px}.cover{width:94px;height:94px;object-fit:cover;border-radius:10px;background:#f0edff}.song h1{font-size:25px;line-height:1.2;margin:0 0 7px;letter-spacing:-.6px;overflow-wrap:anywhere}.artist{font-size:14px;color:#5d6478;margin:0 0 5px}.album{font-size:11px;color:#858b9a;margin:0}.section-title{font-size:15px;margin:0 0 16px;color:#7251d9;text-transform:uppercase;letter-spacing:1px}.lyrics{font-size:12px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere;color:#242b3d}.foot{margin-top:26px;padding-top:12px;border-top:1px solid #e6e9f1;color:#8a90a0;font-size:9px;display:flex;justify-content:space-between;gap:12px}.print{position:fixed;right:22px;top:18px;border:0;border-radius:9px;background:#5f43cf;color:white;font-weight:700;padding:11px 17px;cursor:pointer}@media print{body{max-width:none;padding:0}.print{display:none}.brand,.song{break-inside:avoid}.lyrics{orphans:3;widows:3}}@media(max-width:600px){body{padding:16px}.song h1{font-size:20px}.cover{width:72px;height:72px}.brand strong{font-size:20px}}
      </style></head><body><button class="print" onclick="window.print()">Imprimir / Salvar em PDF</button><header class="brand"><div class="logo">♫</div><div><strong>Site <em>Músicas</em></strong><small>Letras que tocam você</small></div></header><section class="song">${cover ? '<img class="cover" src="'+escapeHtml(cover)+'" alt="Capa da música">' : '<div class="cover"></div>'}<div><h1>${title}</h1><p class="artist">${artist}</p>${album ? '<p class="album">'+album+'</p>' : ''}</div></section><h2 class="section-title">Letra da música</h2><main class="lyrics">${body}</main><footer class="foot"><span>VersosMusicais · Conteúdo conforme disponibilidade da fonte consultada</span><span>${escapeHtml(new Date().toLocaleDateString("pt-BR"))}</span></footer><script>window.addEventListener('load',()=>{setTimeout(()=>window.print(),450)});<\/script></body></html>`);
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
      commands.push("BT /F1 8 Tf 54 28 Td (" + pdfEscape("VersosMusicais - conteúdo fornecido pela fonte consultada") + ") Tj ET");
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

  if (genreRoute) return <GenreDirectoryPage key={genreRoute} name={genreRoute} onBack={backFromGenre} onViewArtist={openArtistSongs} />;
  if (sectionRoute) return <SiteSectionPage key={sectionRoute} section={sectionRoute} chart={chart} globalChart={globalChart} onNavigate={navigateSection} onGenre={openGenrePage} onSearch={searchFromSection} onOpenSong={(item) => { setSectionRoute(""); window.history.pushState({}, "", "/"); openLyrics(item); }} onAccount={() => { navigateSection("home"); setAuthMode("login"); setProfileOpen(true); }} onSupport={() => { navigateSection("home"); setSupportOpen(true); }} />;

  return <div className={lyrics ? "portal portal--song-open" : "portal"}>
    <div className="portal-topline"><span><Sparkles size={13}/> Descubra a história por trás de cada música</span><span className="portal-topline__right">Música conecta pessoas</span></div>
    {lyrics && <header className="reference-site-header"><div className="reference-site-header__top"><Brand onClick={backToPortal}/><div className="reference-quick-actions"><button onClick={()=>{setAuthMode("login");setProfileOpen(true);}}><UserRound size={15}/> Entrar</button><button className="reference-yellow" onClick={()=>setProfileOpen(true)}>Meus Dados</button></div></div><nav className="reference-site-nav"><a href="/" onClick={(e)=>{e.preventDefault();navigateSection("home");}}><Home size={15}/> Início</a><a href="/letras" onClick={(e)=>{e.preventDefault();navigateSection("letras");}}><Music2 size={15}/> Letras</a><a href="/artistas" onClick={(e)=>{e.preventDefault();navigateSection("artistas");}}><UserRound size={15}/> Artistas</a><a href="/albuns" onClick={(e)=>{e.preventDefault();navigateSection("albuns");}}><Disc3 size={15}/> Álbuns</a><a href="/playlists" onClick={(e)=>{e.preventDefault();navigateSection("playlists");}}><ListMusic size={15}/> Playlists</a><a href="/em-alta" onClick={(e)=>{e.preventDefault();navigateSection("em-alta");}}><Music2 size={15}/> Em Alta</a><a href="/generos" onClick={(e)=>{e.preventDefault();navigateSection("generos");}}>Gêneros⌄</a><a className="reference-site-nav__shop" href="https://meli.la/27Zigov" target="_blank" rel="sponsored nofollow noopener"><ShoppingBag size={15}/> Loja de Produtos <ArrowRight size={13}/></a><button onClick={()=>{navigateSection("home");setSupportOpen(true);}}><Headphones size={16}/> Suporte</button></nav></header>}
    <header className="portal-header">
      <a className="portal-brand" href="/" onClick={(e) => { e.preventDefault(); navigateSection("home"); }} aria-label="VersosMusicais início"><img className="portal-brand__logo" src="/versos-musicais-logo.svg" alt="VersosMusicais — Letras que tocam você" /></a>
      
      <div className="portal-header-actions"><LanguageSwitcher /><button className="portal-login-link" onClick={() => {setAuthMode("login");setProfileOpen(true);}}><UserRound size={14}/> Entrar</button><button className="portal-account-button" onClick={() => setProfileOpen(true)}>{account ? account.name.split(" ")[0] : "Meus Dados"}</button><button className="portal-mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Abrir menu">{mobileOpen ? <X/> : <Menu/>}</button></div>
      <nav className={mobileOpen ? "portal-nav portal-nav--open" : "portal-nav"}><a href="/" onClick={(e) => { e.preventDefault(); navigateSection("home"); }}><Home size={15}/> Início</a><a href="/letras" onClick={(e) => { e.preventDefault(); navigateSection("letras"); }}><Music2 size={15}/> Letras</a><a href="/artistas" onClick={(e) => { e.preventDefault(); navigateSection("artistas"); }}><UserRound size={15}/> Artistas</a><a href="/albuns" onClick={(e) => { e.preventDefault(); navigateSection("albuns"); }}><Disc3 size={15}/> Álbuns</a><a href="/playlists" onClick={(e) => { e.preventDefault(); navigateSection("playlists"); }}><ListMusic size={15}/> Playlists</a><a href="/em-alta" onClick={(e) => { e.preventDefault(); navigateSection("em-alta"); }}><Music2 size={15}/> Em Alta</a><a href="/generos" onClick={(e) => { e.preventDefault(); navigateSection("generos"); }}>Gêneros⌄</a><a href="/loja" onClick={(e) => { e.preventDefault(); navigateSection("loja"); }}><ShoppingBag size={15}/> Loja de Produtos</a><button onClick={() => { setSupportOpen(true); setMobileOpen(false); }}><Headphones size={15}/> Suporte</button></nav>
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

      <section className="portal-shop-feature" aria-label="Loja de instrumentos e acessórios" style={{boxSizing:"border-box",width:"min(1440px, calc(100% - 48px))",margin:"28px auto 38px",padding:"clamp(20px, 2.2vw, 32px)",border:"1px solid #292b40",borderRadius:18,background:"linear-gradient(115deg,#090d1d 0%,#12162b 55%,#21183a 100%)",boxShadow:"0 18px 45px #080b1c24",overflow:"hidden",color:"#fff"}}>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:20,marginBottom:22}}>
          <div style={{minWidth:0,flex:"1 1 360px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><span style={{display:"inline-block",width:26,height:2,background:"#ffd400"}}/><span style={{fontSize:10,fontWeight:850,letterSpacing:".19em",color:"#ffd400"}}>SOM & ESTILO · SELEÇÃO MUSICAL</span></div>
            <h2 style={{margin:"0 0 9px",fontSize:"clamp(25px,3.2vw,40px)",lineHeight:1.08,fontWeight:850,letterSpacing:"-.045em",color:"#fff"}}>Equipamentos para quem <span style={{color:"#ffd400"}}>vive música.</span></h2>
            <p style={{margin:0,maxWidth:580,color:"#b9bfd2",fontSize:13,lineHeight:1.7}}>Encontre instrumentos e acessórios para o próximo ensaio, palco ou estúdio.</p>
          </div>
          <a href="https://meli.la/27Zigov" target="_blank" rel="sponsored nofollow noopener" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:10,flexShrink:0,minHeight:48,padding:"0 20px",borderRadius:8,background:"#ffd400",color:"#111426",fontSize:11,fontWeight:950,letterSpacing:".07em",textDecoration:"none",boxShadow:"0 8px 24px #ffd40020"}}><ShoppingBag size={17}/> EXPLORAR A LOJA <ArrowRight size={16}/></a>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,230px),1fr))",gap:12}}>
          <a href="https://meli.la/27Zigov" target="_blank" rel="sponsored nofollow noopener" style={{position:"relative",isolation:"isolate",boxSizing:"border-box",display:"flex",minWidth:0,minHeight:190,flexDirection:"column",justifyContent:"flex-end",gap:6,padding:18,border:"1px solid #ffffff20",borderRadius:10,overflow:"hidden",color:"#fff",textDecoration:"none",background:"#171a2c"}}><span style={{position:"absolute",inset:0,zIndex:-2,backgroundImage:"linear-gradient(0deg,#080b18f5 0%,#080b1880 45%,#080b1810 100%),url(https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=800&q=85)",backgroundPosition:"center",backgroundSize:"cover",transition:"transform .3s"}}/><span style={{fontSize:9,fontWeight:850,letterSpacing:".16em",color:"#ffd400"}}>01 / INSTRUMENTOS</span><strong style={{fontSize:19,lineHeight:1.15,letterSpacing:"-.025em"}}>Violões & guitarras</strong><span style={{display:"inline-flex",alignItems:"center",gap:7,marginTop:4,color:"#e4e7f0",fontSize:11,fontWeight:750}}>Ver na vitrine <ArrowRight size={14}/></span></a>
          <a href="https://meli.la/27Zigov" target="_blank" rel="sponsored nofollow noopener" style={{position:"relative",isolation:"isolate",boxSizing:"border-box",display:"flex",minWidth:0,minHeight:190,flexDirection:"column",justifyContent:"flex-end",gap:6,padding:18,border:"1px solid #ffffff20",borderRadius:10,overflow:"hidden",color:"#fff",textDecoration:"none",background:"#171a2c"}}><span style={{position:"absolute",inset:0,zIndex:-2,backgroundImage:"linear-gradient(0deg,#080b18f5 0%,#080b1880 45%,#080b1810 100%),url(https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=85)",backgroundPosition:"center",backgroundSize:"cover"}}/><span style={{fontSize:9,fontWeight:850,letterSpacing:".16em",color:"#ffd400"}}>02 / ÁUDIO</span><strong style={{fontSize:19,lineHeight:1.15,letterSpacing:"-.025em"}}>Fones & equipamentos</strong><span style={{display:"inline-flex",alignItems:"center",gap:7,marginTop:4,color:"#e4e7f0",fontSize:11,fontWeight:750}}>Ver na vitrine <ArrowRight size={14}/></span></a>
          <a href="https://meli.la/27Zigov" target="_blank" rel="sponsored nofollow noopener" style={{position:"relative",isolation:"isolate",boxSizing:"border-box",display:"flex",minWidth:0,minHeight:190,flexDirection:"column",justifyContent:"flex-end",gap:6,padding:18,border:"1px solid #ffffff20",borderRadius:10,overflow:"hidden",color:"#fff",textDecoration:"none",background:"#171a2c"}}><span style={{position:"absolute",inset:0,zIndex:-2,backgroundImage:"linear-gradient(0deg,#080b18f5 0%,#080b1880 45%,#080b1810 100%),url(https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=800&q=85)",backgroundPosition:"center",backgroundSize:"cover"}}/><span style={{fontSize:9,fontWeight:850,letterSpacing:".16em",color:"#ffd400"}}>03 / TECLAS</span><strong style={{fontSize:19,lineHeight:1.15,letterSpacing:"-.025em"}}>Teclados & pianos</strong><span style={{display:"inline-flex",alignItems:"center",gap:7,marginTop:4,color:"#e4e7f0",fontSize:11,fontWeight:750}}>Ver na vitrine <ArrowRight size={14}/></span></a>
          <a href="https://meli.la/27Zigov" target="_blank" rel="sponsored nofollow noopener" style={{position:"relative",isolation:"isolate",boxSizing:"border-box",display:"flex",minWidth:0,minHeight:190,flexDirection:"column",justifyContent:"flex-end",gap:6,padding:18,border:"1px solid #ffffff20",borderRadius:10,overflow:"hidden",color:"#fff",textDecoration:"none",background:"#171a2c"}}><span style={{position:"absolute",inset:0,zIndex:-2,backgroundImage:"linear-gradient(0deg,#080b18f5 0%,#080b1880 45%,#080b1810 100%),url(https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=85)",backgroundPosition:"center",backgroundSize:"cover"}}/><span style={{fontSize:9,fontWeight:850,letterSpacing:".16em",color:"#ffd400"}}>04 / ESTÚDIO</span><strong style={{fontSize:19,lineHeight:1.15,letterSpacing:"-.025em"}}>Microfones & gravação</strong><span style={{display:"inline-flex",alignItems:"center",gap:7,marginTop:4,color:"#e4e7f0",fontSize:11,fontWeight:750}}>Ver na vitrine <ArrowRight size={14}/></span></a>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginTop:17,paddingTop:14,borderTop:"1px solid #ffffff1a",color:"#aeb5ca",fontSize:10}}><span>Produtos, preços e condições são consultados diretamente no Mercado Livre.</span><span style={{display:"inline-flex",alignItems:"center",gap:6,color:"#d7dced"}}><span style={{width:6,height:6,borderRadius:"50%",background:"#ffd400"}}/> Acesse nossa vitrine</span></div>
      </section>

      {submittedQuery && <section className="portal-results portal-section" id="busca-resultados"><div className="portal-section-heading"><div><span className="portal-kicker">PESQUISA MUSICAL</span><h2>{genrePage && normalize(genrePage) === normalize(submittedQuery) ? <>Artistas de <em>{genrePage}</em></> : <>Resultados para <em>“{submittedQuery}”</em></>}</h2><p>{message || "Buscando no catálogo musical..."}</p>{source && <small>Fonte consultada: {source}</small>}</div><button className="portal-text-button" onClick={() => { setSubmittedQuery(""); setResults([]); setMessage(""); }}>Limpar pesquisa <X size={15}/></button></div>
        {genrePage && normalize(genrePage) === normalize(submittedQuery) ? (
          genreArtists.length ? <div className="portal-result-list portal-artist-list">{genreArtists.map((item, i) => <article className="portal-result portal-artist-result" key={item.id || item.name}>
            <div className="portal-artist-avatar"><Cover item={item} index={i}/></div>
            <div className="portal-result__info"><h3>{item.name || item.title}</h3><p>Cantor(a) ou banda · {genrePage}</p><small>{item.provider || "Catálogo de artistas"}{item.country ? ` · ${item.country}` : ""}</small></div>
            <button className="portal-result__open" onClick={() => { setGenrePage(""); setQuery(item.name || item.title); search(item.name || item.title, 1); }}>Ver músicas <ChevronRight size={16}/></button>
          </article>)}</div> : <div className="portal-empty"><Search size={25}/><strong>{genreArtistsLoading ? "Buscando cantores e bandas deste gênero..." : "Nenhum artista encontrado"}</strong><p>{message}</p></div>
        ) : results.length > 0 ? <><div className="portal-result-list">{results.map((item, i) => <article className="portal-result" key={item.id || `${item.title}-${i}`}><Cover item={item} index={i}/><div className="portal-result__info"><h3>{item.title}</h3><p>{item.artist}</p><small>{item.album || item.genre || "Faixa musical"}{item.releaseDate ? ` · ${String(item.releaseDate).slice(0,4)}` : ""}</small></div><button className="portal-icon-button" onClick={() => toggleSaved(item)} aria-label="Salvar música"><Heart size={18} fill={saved.some((x) => x.id === item.id) ? "currentColor" : "none"}/></button><button className="portal-result__open" onClick={() => openLyrics(item)}>Ver letra <ChevronRight size={16}/></button></article>)}</div>{(page > 1 || hasMore) && <div className="portal-pagination"><button disabled={page <= 1 || loading} onClick={() => search(submittedQuery, page - 1)}>Anterior</button><span>Página {page}</span><button disabled={!hasMore || loading} onClick={() => search(submittedQuery, page + 1)}>Próxima <ArrowRight size={15}/></button></div>}</> : <div className="portal-empty"><Search size={25}/><strong>{loading ? "Pesquisando..." : "Nenhum resultado relevante"}</strong><p>{message}</p></div>}
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
            <div className="portal-section-heading"><div><span className="portal-kicker">RANKINGS MUSICAIS</span><h2>Em alta agora.</h2><p>Top 10 por região, com base nas atualizações identificadas.</p></div><div className="portal-tabs" role="tablist" aria-label="Região do ranking"><button type="button" role="tab" aria-selected={chartRegion === "br"} className={chartRegion === "br" ? "active" : ""} onClick={() => setChartRegion("br")}>🇧🇷 Brasil</button><button type="button" role="tab" aria-selected={chartRegion === "global"} className={chartRegion === "global" ? "active" : ""} onClick={() => setChartRegion("global")}>🌐 Global</button></div></div>
            <p className="portal-chart-source"><span className="portal-chart-source__info">ⓘ</span> {chartRegion === "br" ? "Ranking musical do Brasil." : "Ranking musical global."}<span className="portal-chart-source__name">Fonte: {(chartRegion === "br" ? chart[0]?.source : globalChart[0]?.source) || "YouTube Charts"}</span></p>
            {chartError && <div className="portal-chart-retry" role="status"><span>{chartError}</span><button type="button" onClick={() => setChartReloadKey((key) => key + 1)} disabled={chartLoading}>{chartLoading ? "Carregando..." : "Tentar novamente"}</button></div>}
            <div className="portal-ranking-columns">
              {chartRegion === "br" ? <section className="portal-ranking-country"><h3>Top 10 Brasil</h3>{visibleChart.length ? <div className="portal-ranking-list">{visibleChart.map((item,i)=><button className="portal-ranking-row" key={item.id || item.title || item.name} onClick={()=>openLyrics({...item,title:item.title || item.name,artist:item.artist || item.artistName,artworkUrl:item.artworkUrl || item.artworkUrl100})}><span className="portal-ranking-number">{item.rank || i+1}</span><Cover item={{...item,title:item.title || item.name,artworkUrl:item.artworkUrl || item.artworkUrl100}} index={i}/><span className="portal-ranking-meta"><strong>{item.title || item.name}</strong><small>{item.artist || item.artistName}</small></span><span className="portal-ranking-trend" aria-label="posição no ranking">↑</span></button>)}</div> : <div className="portal-ranking-empty"><Disc3 size={18}/><span>{chartLoading ? "Carregando ranking do YouTube no Brasil..." : "Ranking do YouTube no Brasil indisponível no momento."}</span></div>}</section> : <section className="portal-ranking-country"><h3>Top 10 Global</h3>{visibleGlobalChart.length ? <div className="portal-ranking-list">{visibleGlobalChart.map((item,i)=><button className="portal-ranking-row" key={item.id || item.title || item.name} onClick={()=>openLyrics({...item,title:item.title || item.name,artist:item.artist || item.artistName,artworkUrl:item.artworkUrl || item.artworkUrl100})}><span className="portal-ranking-number">{item.rank || i+1}</span><Cover item={{...item,title:item.title || item.name,artworkUrl:item.artworkUrl || item.artworkUrl100}} index={i}/><span className="portal-ranking-meta"><strong>{item.title || item.name}</strong><small>{item.artist || item.artistName}</small></span><span className="portal-ranking-trend" aria-label="posição no ranking">↑</span></button>)}</div> : <div className="portal-ranking-empty"><Disc3 size={18}/><span>{chartLoading ? "Carregando ranking global do YouTube..." : "Ranking global do YouTube indisponível no momento."}</span></div>}</section>}
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
      <section className="portal-genres portal-genres--compact portal-genres--reference" id="generos"><div className="portal-section-heading"><div><h2>Principais gêneros musicais</h2></div><button className="portal-text-button" onClick={()=>document.querySelector(".portal-hero .portal-search input")?.focus()}>Ver todos <ArrowRight size={14}/></button></div><div className="portal-genre-grid">{["Gospel","Sertanejo","MPB","Pop","Rock","Rap","Funk","Pagode","Samba","Forró"].map((g,i)=><button key={g} className={`portal-genre portal-genre--reference portal-genre--tile-${i}`} onClick={()=>openGenrePage(g)}><span className={`portal-genre__icon portal-genre__icon--${i%6}`}>{i===0?"✝":i===1?"♧":i===2?"♫":i===3?"☆":i===4?"♆":i===5?"♬":i===6?"♛":i===7?"◉":i===8?"▤":"▥"}</span><span>{g}</span></button>)}</div></section>
    </main>
    <footer className="portal-footer reference-footer"><div className="reference-footer__grid"><div className="reference-footer__brand"><a className="portal-brand" href="#inicio" aria-label="VersosMusicais início"><img className="portal-brand__logo" src="/versos-musicais-logo.svg" alt="VersosMusicais — Letras que tocam você" /></a><p>Descubra as músicas que fazem parte da sua história.</p></div><div><h3>Navegação</h3><nav><a href="#inicio">Início</a><a href="#busca">Letras</a><a href="#artistas">Artistas</a><a href="#generos">Álbuns e playlists</a><a href="#destaques">Em Alta</a></nav></div><div><h3>Suporte</h3><nav><a href="#ajuda" onClick={(e)=>{e.preventDefault();setSupportOpen(true);}}>Central de Ajuda</a><a href="#ajuda" onClick={(e)=>{e.preventDefault();setSupportOpen(true);}}>Fale Conosco</a><a href="#termos" onClick={(e)=>{e.preventDefault();setLegalDoc("terms");}}>Termos de Uso</a><a href="#privacidade" onClick={(e)=>{e.preventDefault();setLegalDoc("privacy");}}>Política de Privacidade</a></nav></div><div><h3>Receba novidades</h3><form className="reference-newsletter" onSubmit={(e)=>{e.preventDefault();setNewsletterNotice("Cadastro ainda não ativado: falta configurar um serviço de envio de e-mails.");}}><input type="email" required placeholder="Seu e-mail" aria-label="Seu e-mail"/><button>Cadastro</button></form>{newsletterNotice && <small className="reference-newsletter-notice">{newsletterNotice}</small>}</div></div><div className="portal-footer__bottom"><span>© {new Date().getFullYear()} VersosMusicais. Todos os direitos reservados.</span><span>Dados e letras exibidos conforme disponibilidade das fontes e autorizações aplicáveis.</span></div></footer>

    {legalDoc && <div className="portal-overlay" role="dialog" aria-modal="true" aria-label={legalDoc === "terms" ? "Termos de Uso" : "Política de Privacidade"} onClick={(e)=>{if(e.target===e.currentTarget)setLegalDoc("");}}><section className="portal-panel portal-legal-panel"><button className="portal-panel-close" onClick={()=>setLegalDoc("")} aria-label="Fechar"><X/></button><span className="portal-kicker">SITE MÚSICAS · INFORMAÇÕES LEGAIS</span>{legalDoc === "terms" ? <><h2>Termos de Uso</h2><p><strong>Última atualização:</strong> 21 de outubro de 2026</p><h3>1. Sobre o serviço</h3><p>O VersosMusicais oferece recursos de descoberta musical, busca de informações sobre músicas e artistas, consulta de letras quando disponíveis, favoritos e outros recursos apresentados na plataforma.</p><h3>2. Uso adequado</h3><p>Use o site de forma lícita, sem tentar comprometer sua segurança, interferir no funcionamento, automatizar acessos abusivos ou violar direitos de terceiros.</p><h3>3. Conteúdo e direitos autorais</h3><p>Nomes, marcas, músicas, letras, imagens e demais conteúdos podem pertencer a seus respectivos titulares e fontes. A disponibilidade de um conteúdo não significa que o VersosMusicais seja titular dos direitos. Se você representa um titular e deseja reportar conteúdo, entre em contato pelo canal de suporte.</p><h3>4. Fontes externas e afiliados</h3><p>Links podem direcionar a plataformas de terceiros, que possuem termos, políticas, preços e condições próprios. O VersosMusicais pode receber comissão por compras elegíveis realizadas por links de afiliado, sem custo adicional ao comprador. Preços, estoque, entrega e compra são geridos pela plataforma de destino.</p><h3>5. Disponibilidade</h3><p>O catálogo, as letras e os recursos podem variar ou ficar temporariamente indisponíveis. Buscamos manter as informações úteis e atualizadas, mas não garantimos disponibilidade contínua nem ausência de erros.</p><h3>6. Alterações e contato</h3><p>Estes termos podem ser atualizados para refletir mudanças no serviço ou exigências legais. Em caso de dúvidas ou solicitações, use o botão Suporte disponível no site.</p></> : <><h2>Política de Privacidade</h2><p><strong>Última atualização:</strong> 21 de outubro de 2026</p><h3>1. Dados que podem ser tratados</h3><p>Dependendo dos recursos utilizados, podemos tratar informações fornecidas por você, como nome e e-mail de cadastro, músicas salvas como favoritas, consultas feitas no site e mensagens enviadas ao suporte.</p><h3>2. Para que usamos os dados</h3><p>Os dados são utilizados para disponibilizar funcionalidades, manter suas preferências, responder solicitações, proteger a plataforma e melhorar a experiência. Não informe dados pessoais sensíveis em campos livres.</p><h3>3. Armazenamento e segurança</h3><p>As informações podem ser armazenadas no navegador ou nos sistemas necessários ao funcionamento do serviço. Adotamos medidas razoáveis de segurança, mas nenhum sistema conectado à internet pode garantir risco zero.</p><h3>4. Serviços de terceiros</h3><p>Buscas musicais, conteúdo incorporado e links externos podem envolver outros provedores. Ao acessar um site externo, consulte a política de privacidade e os termos desse provedor. Não controlamos as práticas de privacidade de terceiros.</p><h3>5. Cookies e tecnologias locais</h3><p>O site ou seus provedores podem utilizar recursos técnicos necessários para funcionamento, preferências, segurança ou análise, conforme a configuração implementada. As opções disponíveis podem variar de acordo com o navegador.</p><h3>6. Seus direitos</h3><p>Nos termos da legislação aplicável, incluindo a LGPD, você pode solicitar informações sobre o tratamento, correção ou eliminação de dados quando cabível. Para fazer uma solicitação, abra o Suporte e descreva o pedido sem incluir senhas.</p><h3>7. Atualizações e contato</h3><p>Esta política pode ser revisada quando os recursos ou obrigações legais mudarem. Para dúvidas e solicitações de privacidade, entre em contato pelo canal de Suporte do site.</p></>}<button className="portal-legal-close" onClick={()=>setLegalDoc("")}>Entendi</button></section></div>}
    <button className="portal-support-fab" onClick={() => setSupportOpen(true)} aria-label="Abrir suporte"><LifeBuoy size={20}/><span>Suporte</span></button>
    {profileOpen && <div className="portal-overlay" role="dialog" aria-modal="true" aria-label="Meus Dados"><section className="portal-panel"><button className="portal-panel-close" onClick={() => setProfileOpen(false)} aria-label="Fechar"><X/></button>{account ? <><div className="portal-profile-heading"><div className="portal-avatar"><CircleUserRound size={32}/></div><div><span className="portal-kicker">SEU ESPAÇO MUSICAL</span><h2>Olá, {account.name}</h2><p>{account.email}</p></div></div><div className="portal-profile-stats"><div><Heart size={18}/><strong>{saved.length}</strong><span>Favoritos</span></div><div><ListMusic size={18}/><strong>—</strong><span>Playlists</span></div></div><h3>Minhas músicas favoritas</h3>{saved.length ? <div className="portal-saved-list">{saved.map((item) => <div key={item.id} className="portal-saved-item"><Cover item={item}/><div><strong>{item.title}</strong><span>{item.artist}</span></div><button onClick={() => toggleSaved(item)} aria-label="Remover dos favoritos"><X size={16}/></button></div>)}</div> : <p className="portal-muted">Ainda não há favoritos salvos na sua conta.</p>}<button className="portal-primary-button" onClick={signOut}><LogOut size={17}/> Sair da conta</button></> : <><div className="portal-profile-heading"><div className="portal-avatar"><UserRound size={30}/></div><div><span className="portal-kicker">MEUS DADOS</span><h2>{authMode === "register" ? "Entre no seu universo musical" : "Bem-vindo de volta"}</h2><p>Salve favoritos e personalize sua experiência.</p></div></div><div className="portal-auth-tabs"><button className={authMode === "register" ? "active" : ""} onClick={() => {setAuthMode("register");setAuthError("");}}>Criar conta</button><button className={authMode === "login" ? "active" : ""} onClick={() => {setAuthMode("login");setAuthError("");}}>Já tenho conta</button></div><form className="portal-form" onSubmit={submitAuth}>{authMode === "register" && <label>Nome<input value={authName} onChange={e=>setAuthName(e.target.value)} autoComplete="name" required minLength={2} maxLength={80}/></label>}<label>E-mail<input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} autoComplete="email" required/></label><label>Senha<input type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} autoComplete={authMode === "register" ? "new-password" : "current-password"} minLength={authMode === "register" ? 10 : 1} required/><small>{authMode === "register" ? "Use pelo menos 10 caracteres." : "Digite sua senha para entrar."}</small></label><p className="portal-muted">Ao continuar, você concorda com os termos de uso e a política de privacidade.</p>{authError && <p className="portal-form-error">{authError}</p>}<button className="portal-primary-button" disabled={authBusy}>{authBusy ? "Aguarde..." : authMode === "register" ? "Criar minha conta" : "Entrar"} <ArrowRight size={17}/></button></form><p className="portal-muted portal-small-note">A recuperação de senha por e-mail depende da configuração de um serviço de envio.</p></>}</section></div>}
    {supportOpen && <div className="portal-overlay portal-overlay--support" role="dialog" aria-modal="true" aria-label="Central de suporte"><section className="portal-panel"><button className="portal-panel-close" onClick={() => setSupportOpen(false)} aria-label="Fechar"><X/></button><div className="portal-profile-heading"><div className="portal-avatar"><LifeBuoy size={28}/></div><div><span className="portal-kicker">CENTRAL DE ATENDIMENTO</span><h2>Como podemos ajudar?</h2><p>Envie sua solicitação e receba um protocolo.</p></div></div>{ticketResult ? <div className="portal-ticket-success"><span>Chamado registrado</span><strong>{ticketResult.protocol}</strong><p>Status: {ticketResult.status}</p><button className="portal-primary-button" onClick={() => setTicketResult(null)}>Abrir outro chamado</button></div> : <form className="portal-form" onSubmit={submitSupport}><label>Assunto<select value={supportSubject} onChange={e=>setSupportSubject(e.target.value)}>{["Problemas com músicas ou letras","Ajuda com cadastro e login","Minhas músicas favoritas","Problemas técnicos","Sugestões de melhorias","Direitos autorais e conteúdo","Outros assuntos"].map(x=><option key={x}>{x}</option>)}</select></label>{!account && <label>E-mail para contato<input type="email" value={supportEmail} onChange={e=>setSupportEmail(e.target.value)} required/></label>}<label>Descreva como podemos ajudar<textarea value={supportDescription} onChange={e=>setSupportDescription(e.target.value)} minLength={10} maxLength={5000} rows={5} required placeholder="Conte o que aconteceu..."/></label>{supportError && <p className="portal-form-error">{supportError}</p>}<button className="portal-primary-button" disabled={supportBusy}>{supportBusy ? "Enviando..." : "Enviar solicitação"} <Send size={17}/></button></form>}<div className="portal-support-help"><strong>Consultar chamado</strong><form className="portal-ticket-lookup" onSubmit={lookupTicket}><input value={ticketProtocol} onChange={e=>setTicketProtocol(e.target.value)} placeholder="Protocolo SL-..." required={!account}/>{!account && <input type="email" value={ticketEmailLookup} onChange={e=>setTicketEmailLookup(e.target.value)} placeholder="E-mail usado no chamado" required/>}<button className="portal-primary-button">Consultar status</button></form>{ticketLookupError && <p className="portal-form-error">{ticketLookupError}</p>}{ticketLookupResult && (ticketLookupResult.length ? ticketLookupResult.map(t=><div className="portal-ticket-status" key={t.protocol}><strong>{t.protocol} · {t.status}</strong><span>{t.subject}</span>{t.messages?.map((m,i)=><p key={i}>{m.text}</p>)}</div>) : <p>Nenhum chamado encontrado com esses dados.</p>)}</div></section></div>}
    {lyrics && <MusicPage key={lyrics.id || lyrics.title} lyrics={lyrics} loading={lyricsLoading} video={video} videoLoading={videoLoading} videoError={videoError} onBack={backToPortal} onPrint={printCurrentSong} onDownload={downloadCurrentSong} onShare={shareCurrentSong} onVideo={()=>loadMusicVideo(true)} onListen={listenToCurrentSong} autoplayVideo={autoplayVideo} onNextTrack={nextTrackFromArtist} nextTrackLoading={nextTrackLoading} onSave={saveCurrentSong} saved={saved.some(item=>item.id===lyrics.id)} catalog={songCatalog} onOpen={openLyrics} fontScale={songFontScale} setFontScale={setSongFontScale} account={account} comments={comments} commentsLoading={commentsLoading} commentText={commentText} setCommentText={setCommentText} onSubmitComment={submitSongComment} commentError={commentError} commentNotice={commentNotice} audioRef={audioRef} isPreviewPlaying={isPreviewPlaying} previewTime={previewTime} previewDuration={previewDuration} onSeekPreview={seekPreview}/>}

  </div>;
}
