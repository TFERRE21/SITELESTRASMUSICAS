import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, AudioLines, Check, ChevronRight, Disc3, Headphones,
  Heart, Menu, Music2, Search, Sparkles, X
} from "lucide-react";
import { institutional } from "./config/institutional.js";
import { adsConfig } from "./config/ads.js";

const tracks = [
  { title: "Caminhos de Luz", artist: "Projeto Aurora", genre: "Gospel", color: "lilac", tag: "Em destaque" },
  { title: "Deixa Acontecer", artist: "Maré Alta", genre: "MPB", color: "coral", tag: "Popular" },
  { title: "No Mesmo Compasso", artist: "Lia Monte", genre: "Pop", color: "blue", tag: "Novidade" },
  { title: "Perto do Céu", artist: "Voz & Vida", genre: "Gospel", color: "gold", tag: "Para ouvir" },
  { title: "Cidade em Silêncio", artist: "Nilo Santos", genre: "Indie", color: "green", tag: "Descoberta" },
  { title: "Outra Estação", artist: "Clara Reis", genre: "MPB", color: "pink", tag: "Na sua lista" },
];
const categories = ["Todas", "Gospel", "Sertanejo", "MPB", "Pop", "Rock", "Rap", "Funk", "Pagode", "Samba", "Forró", "Reggae", "Eletrônica", "Indie", "Jazz", "Clássica", "Country", "Metal", "Bossa Nova", "Música Latina"];

function Artwork({ color, index }) {
  return (
    <div className={`artwork artwork--${color}`} aria-hidden="true">
      <span className="artwork__orb artwork__orb--one" />
      <span className="artwork__orb artwork__orb--two" />
      <span className="artwork__number">{String(index + 1).padStart(2, "0")}</span>
      <AudioLines size={35} strokeWidth={1.4} className="artwork__mark" />
    </div>
  );
}

function AdSlot() {
  if (!adsConfig.enabled) return null;
  return (
    <aside className="ad-slot" aria-label="Espaço publicitário">
      <span>Publicidade</span>
      <p>O espaço publicitário será integrado quando os códigos reais forem configurados.</p>
    </aside>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [saved, setSaved] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [catalogItems, setCatalogItems] = useState([]);
  const [catalogMessage, setCatalogMessage] = useState("Carregando catálogo...");
  const [lyricsModal, setLyricsModal] = useState(null);
  const [chartCountry, setChartCountry] = useState("br");
  const [chartItems, setChartItems] = useState([]);
  const [chartMessage, setChartMessage] = useState("Carregando Top 20...");
  const [chartGenre, setChartGenre] = useState("Todos");
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [artworkById, setArtworkById] = useState({});

  useEffect(() => {
    let active = true;
    const refreshCatalog = async () => {
      try {
        const response = await fetch("/api/catalog?page=1&limit=100");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Catálogo indisponível.");
        if (!active) return;
        setCatalogItems(Array.isArray(data.items) ? data.items : []);
        setCatalogMessage(data.items?.length
          ? `Robô do catálogo ativo: ${data.total ?? data.items.length} músicas armazenadas. Atualização automática a cada minuto.`
          : "Robô do catálogo iniciado. As primeiras músicas serão adicionadas automaticamente.");
      } catch { if (active) setCatalogMessage("Catálogo temporariamente indisponível; o robô tentará novamente."); }
    };
    refreshCatalog();
    const interval = setInterval(refreshCatalog, 60_000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    let active = true;
    const loadChart = async () => {
      setChartMessage("Atualizando ranking musical...");
      try {
        const response = await fetch(`/api/charts?country=${chartCountry}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Ranking temporariamente indisponível.");
        if (!active) return;
        setChartItems(Array.isArray(data.items) ? data.items : []);
        setChartMessage(data.items?.length
          ? `Top 20 atualizado pela fonte ${data.source}. Atualização: ${data.updatedAt ? new Date(data.updatedAt).toLocaleString("pt-BR") : "data não informada"}.`
          : "Nenhuma música retornada pela fonte neste momento.");
      } catch (error) {
        if (active) setChartMessage(error.message || "Não foi possível carregar o ranking.");
      }
    };
    loadChart();
    return () => { active = false; };
  }, [chartCountry]);


  useEffect(() => {
    let active = true;
    const missing = catalogItems.filter((track) => track.id && !artworkById[track.id]).slice(0, 24);
    if (!missing.length) return undefined;
    Promise.all(missing.map(async (track) => {
      try {
        const response = await fetch(`/api/artwork?q=${encodeURIComponent(`${track.title} ${track.artist}`)}`);
        const data = await response.json();
        return [track.id, data.artworkUrl || ""];
      } catch { return [track.id, ""]; }
    })).then((pairs) => { if (active) setArtworkById((current) => ({ ...current, ...Object.fromEntries(pairs) })); });
    return () => { active = false; };
  }, [catalogItems]);

  const sourceTracks = catalogItems.map((track, index) => ({
    ...track,
    color: ["lilac", "coral", "blue", "gold", "green", "pink"][index % 6],
    tag: track.provider === "LRCLIB" ? "LRCLIB" : "Catálogo",
    genre: track.genre || "",
    artworkUrl: track.artworkUrl || artworkById[track.id] || "",
  }));

  const filteredTracks = useMemo(() => sourceTracks.filter((track) => {
    const matchesCategory = category === "Todas" || track.genre === category;
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    // Gêneros são termos de descoberta no LRCLIB, não metadados garantidos.
    const isGenreDiscovery = categories.some((genre) => genre.toLocaleLowerCase("pt-BR") === normalizedQuery);
    const searchable = `${track.title} ${track.artist} ${track.genre}`.toLocaleLowerCase("pt-BR");
    return matchesCategory && (!normalizedQuery || isGenreDiscovery || searchable.includes(normalizedQuery));
  }), [category, query, catalogItems]);

  const toggleSaved = (title) => {
    setSaved((current) => current.includes(title)
      ? current.filter((item) => item !== title)
      : [...current, title]);
  };

  const scrollToTracks = () => document.getElementById("descobrir")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="site-shell">
      <div className="announcement"><Sparkles size={14} /> Seu próximo som favorito começa aqui <span className="announcement__dot">✦</span></div>
      <header className="site-header">
        <a className="brand" href="#" aria-label="Som e Letra, início">
          <span className="brand__icon"><AudioLines size={21} /></span>
          <span>som<span className="brand__amp">&</span>letra</span>
        </a>
        <nav className={`main-nav ${menuOpen ? "main-nav--open" : ""}`} aria-label="Navegação principal">
          <a href="#descobrir" onClick={() => setMenuOpen(false)}>Descobrir</a>
          <a href="#top20" onClick={() => setMenuOpen(false)}>Top 20</a>
          <a href="#generos" onClick={() => setMenuOpen(false)}>Gêneros</a>
          <a href="#sobre" onClick={() => setMenuOpen(false)}>Sobre o projeto</a>
        </nav>
        <div className="header-actions">
          <button className="saved-pill" onClick={() => { setQuery(""); setCategory("Todas"); scrollToTracks(); setNotice(saved.length ? `Você salvou ${saved.length} música(s) neste navegador.` : "Suas músicas salvas aparecerão aqui nesta sessão."); }}><Heart size={16} /> <span>Salvas</span><b>{saved.length}</b></button>
          <button className="mobile-menu" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero__copy">
            <span className="eyebrow"><span className="eyebrow__line" /> MAIS QUE MÚSICA. SENTIMENTO.</span>
            <h1>Encontre a música<br />que <span>fala por você.</span></h1>
            <p>Explore sons, conheça artistas e encontre inspiração para a trilha sonora da sua vida.</p>
            <div className="hero__actions">
              <button className="button button--primary" onClick={scrollToTracks}>Explorar músicas <ArrowRight size={17} /></button>
              <a className="text-link" href="#sobre">Conheça o projeto <ChevronRight size={16} /></a>
            </div>
            <div className="hero__proof"><span className="proof-icons"><i><Music2 size={13} /></i><i><Headphones size={13} /></i><i><Disc3 size={13} /></i></span><span>Um espaço para quem vive música</span></div>
          </div>
          <div className="hero-art" aria-label="Ilustração abstrata de capas de música">
            <div className="hero-art__halo" />
            <div className="hero-art__disc"><div className="hero-art__disc-center"><AudioLines size={39} /></div></div>
            <div className="float-card float-card--main"><Artwork color="lilac" index={0} /><div className="float-card__caption"><span>SONS QUE INSPIRAM</span><strong>Encontre seu ritmo</strong></div></div>
            <div className="float-card float-card--small"><Artwork color="coral" index={1} /></div>
            <div className="sound-bars"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
            <span className="hero-art__spark hero-art__spark--one">✳</span><span className="hero-art__spark hero-art__spark--two">✦</span>
          </div>
        </section>

        <section className="stat-strip" aria-label="Destaques do site">
          <div><span className="stat-strip__icon"><Disc3 size={19} /></span><span><strong>Novas descobertas</strong><small>Encontre outros sons</small></span></div>
          <div><span className="stat-strip__icon"><Heart size={19} /></span><span><strong>Seu espaço musical</strong><small>Guarde seus favoritos</small></span></div>
          <div><span className="stat-strip__icon"><Headphones size={19} /></span><span><strong>Vários estilos</strong><small>Música para cada momento</small></span></div>
        </section>

        <AdSlot />

        <section className="charts-section section-wrap" id="top20">
          <div className="section-heading">
            <div><span className="eyebrow"><span className="eyebrow__line" /> RANKING MUSICAL</span><h2>Top 20 <span>do momento.</span></h2><p>Ranking de músicas populares, carregado de uma fonte musical externa.</p><p className="catalog-status" role="status">{chartMessage}</p></div>
          </div>
          <div className="chart-toolbar">
            <div className="chart-country-tabs" aria-label="Selecionar ranking por país">
              <button className={chartCountry === "br" ? "chart-tab chart-tab--active" : "chart-tab"} onClick={() => { setChartCountry("br"); setChartGenre("Todos"); }}>🇧🇷 Mais ouvidas no Brasil</button>
              <button className={chartCountry === "us" ? "chart-tab chart-tab--active" : "chart-tab"} onClick={() => { setChartCountry("us"); setChartGenre("Todos"); }}>🌎 Ranking internacional (EUA)</button>
            </div>
            <label className="chart-genre-select">Gênero
              <select value={chartGenre} onChange={(event) => setChartGenre(event.target.value)}>
                <option>Todos</option>
                {[...new Set(chartItems.flatMap((item) => item.genres || [item.genre]).filter(Boolean))].sort().map((genre) => <option key={genre}>{genre}</option>)}
              </select>
            </label>
          </div>
          {chartItems.filter((item) => chartGenre === "Todos" || (item.genres || [item.genre]).includes(chartGenre)).length ? (
            <div className="chart-list">
              {chartItems.filter((item) => chartGenre === "Todos" || (item.genres || [item.genre]).includes(chartGenre)).map((item) => (
                <article className="chart-row" key={item.id}>
                  <span className="chart-rank">{String(item.rank).padStart(2, "0")}</span>
                  {item.artworkUrl ? <img className="chart-cover" src={item.artworkUrl} alt="" loading="lazy" /> : <span className="chart-cover chart-cover--empty"><Music2 size={18} /></span>}
                  <div className="chart-track-info"><strong>{item.title}</strong><span>{item.artist}</span><small>{item.genre || "Gênero não informado"}</small></div>
                  {item.url && <a className="chart-open" href={item.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${item.title} na fonte musical`}><ArrowRight size={17} /></a>}
                </article>
              ))}
            </div>
          ) : <div className="empty-state"><Music2 size={25} /><h3>Ranking indisponível</h3><p>{chartMessage}</p></div>}
          <p className="chart-disclaimer">O ranking reflete os dados fornecidos pela fonte consultada e pode variar por país e horário. “Internacionais” usa o ranking dos Estados Unidos como referência, não uma lista mundial única.</p>
        </section>

        <section className="discover section-wrap" id="descobrir">
          <div className="section-heading">
            <div><span className="eyebrow"><span className="eyebrow__line" /> EXPLORE NO SEU RITMO</span><h2>Descubra seu próximo <span>favorito.</span></h2><p>Pesquise músicas do catálogo conectado e descubra novos artistas.</p><p className="catalog-status" role="status">{catalogMessage}</p></div>
            <div className="discover__count"><span className="count-dot" /> {filteredTracks.length} resultados</div>
          </div>
          <form className="filters" onSubmit={async (event) => { event.preventDefault(); const term = query.trim(); if (term.length < 2) return; try { const response = await fetch(`/api/music-search?q=${encodeURIComponent(term)}`); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Pesquisa indisponível."); setCatalogItems(Array.isArray(data.items) ? data.items : []); setSearchPage(1); setSearchTotal(data.total || data.items?.length || 0); setSearchHasMore(Boolean(data.hasMore)); setCatalogMessage(data.items?.length ? `${data.items.length} músicas nesta página; ${data.total || data.items.length} resultados informados pela fonte.` : "Nenhuma música encontrada. Tente outro nome ou artista."); } catch (error) { setCatalogMessage(error.message || "Não foi possível concluir a pesquisa agora."); } }}>
            <div className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Digite música ou artista..." aria-label="Buscar música ou artista" /><button className="search-submit" type="submit" disabled={query.trim().length < 2}><Search size={16} /><span>Pesquisar música</span></button></div>
             <div className="category-list" id="generos" aria-label="Filtrar por gênero">
              {categories.map((item) => <button type="button" key={item} className={category === item ? "category category--active" : "category"} onClick={() => { setCategory("Todas"); setQuery(item === "Todas" ? "" : item); }}>{item}</button>)}
            </div>
          </form>
          {notice && <div className="inline-notice" role="status"><Check size={15} />{notice}<button onClick={() => setNotice("")} aria-label="Dispensar aviso"><X size={14} /></button></div>}
          {filteredTracks.length ? <div className="track-grid">{filteredTracks.map((track) => {
            const isSaved = saved.includes(track.title);
            return <article className="track-card" key={track.title}>
              <div className="track-card__image">{track.artworkUrl ? <img className="track-artwork-photo" src={track.artworkUrl} alt={`Capa de ${track.title}`} loading="lazy" /> : <Artwork color={track.color} index={sourceTracks.indexOf(track)} />}<span className="track-tag">{track.tag}</span><button className={isSaved ? "save-button save-button--active" : "save-button"} onClick={() => toggleSaved(track.title)} aria-label={isSaved ? `Remover ${track.title} dos salvos` : `Salvar ${track.title}`} aria-pressed={isSaved}><Heart size={17} fill={isSaved ? "currentColor" : "none"} /></button></div>
              <div className="track-card__body"><div>{track.genre && <span className="track-genre">{track.genre}</span>}<h3>{track.title}</h3><p>{track.artist}</p></div><button className="track-card__arrow" aria-label={`Ver detalhes de ${track.title}`} onClick={async () => { if (!track.id || String(track.id).startsWith("itunes-")) { setNotice("Encontramos os dados e a capa desta música. A letra só será exibida quando houver uma fonte de letras disponível e autorizada."); if (track.providerUrl) window.open(track.providerUrl, "_blank", "noopener,noreferrer"); return; } try { const response = await fetch(`/api/lyrics/${track.id}`); const data = await response.json(); setLyricsModal({ title: track.title, artist: track.artist, text: data.lyrics || data.error || "Letra indisponível.", copyright: data.copyright || "" }); } catch { setLyricsModal({ title: track.title, artist: track.artist, text: "Não foi possível consultar a fonte de letras." }); } }}><ArrowRight size={18} /></button></div>
            </article>;
          })}</div> : <div className="empty-state"><Search size={25} /><h3>{catalogItems.length === 0 ? "Catálogo aguardando resultados reais" : "Nenhuma música encontrada"}</h3><p>{catalogItems.length === 0 ? "A fonte de músicas pode estar indisponível no momento. Tente novamente mais tarde ou pesquise diretamente no Letras.mus.br." : "Tente outro termo ou escolha uma categoria diferente."}</p>{query.trim().length >= 2 && <a className="button button--secondary" href={`https://www.letras.mus.br/?q=${encodeURIComponent(query.trim())}`} target="_blank" rel="noreferrer">Pesquisar no Letras.mus.br <ArrowRight size={15} /></a>}<button className="button button--secondary" onClick={() => { setQuery(""); setCategory("Todas"); }}>Limpar filtros</button></div>}
          {query.trim().length >= 2 && (searchPage > 1 || searchHasMore) && <nav className="pagination" aria-label="Paginação dos resultados"><button type="button" disabled={searchPage <= 1} onClick={async () => { const next = searchPage - 1; try { const response = await fetch(`/api/music-search?q=${encodeURIComponent(query.trim())}&page=${next}`); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Não foi possível carregar a página."); setCatalogItems(data.items || []); setSearchPage(next); setSearchTotal(data.total || searchTotal); setSearchHasMore(Boolean(data.hasMore)); document.getElementById("descobrir")?.scrollIntoView({ behavior: "smooth" }); } catch (error) { setCatalogMessage(error.message); } }}>Anterior</button><span>Página {searchPage}{searchTotal ? ` • ${searchTotal} resultados informados pela fonte` : ""}</span><button type="button" disabled={!searchHasMore} onClick={async () => { const next = searchPage + 1; try { const response = await fetch(`/api/music-search?q=${encodeURIComponent(query.trim())}&page=${next}`); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Não foi possível carregar a página."); setCatalogItems(data.items || []); setSearchPage(next); setSearchTotal(data.total || searchTotal); setSearchHasMore(Boolean(data.hasMore)); document.getElementById("descobrir")?.scrollIntoView({ behavior: "smooth" }); } catch (error) { setCatalogMessage(error.message); } }}>Próxima <ArrowRight size={15} /></button></nav>}
          <div className="catalog-note"><span><Sparkles size={15} /> Catálogo LRCLIB</span><p>Os resultados dependem da disponibilidade no LRCLIB. Confira os termos e direitos aplicáveis antes de republicar letras completas em um site comercial.</p></div>
        </section>

        <section className="about-band" id="sobre"><div className="about-band__icon"><AudioLines size={29} /></div><div><span className="eyebrow">NOSSO PROPÓSITO</span><h2>Música aproxima. A gente ajuda você a descobrir.</h2><p>Um projeto em construção para tornar a descoberta musical mais simples, acolhedora e organizada.</p></div><button className="button button--light" onClick={() => setNotice("Obrigado pelo interesse! O canal de contato oficial será publicado após a configuração do e-mail institucional.")}>Saiba mais <ArrowRight size={17} /></button></section>
      </main>

      <footer className="site-footer">
        <div className="footer-main"><div className="footer-brand"><a className="brand brand--footer" href="#"><span className="brand__icon"><AudioLines size={21} /></span><span>som<span className="brand__amp">&</span>letra</span></a><p>Descobrindo sons, conectando histórias.</p></div>
          <div className="footer-links"><div><strong>Explorar</strong><a href="#descobrir">Descobrir músicas</a><a href="#generos">Gêneros musicais</a></div><div><strong>Institucional</strong><a href="#sobre">Sobre nós</a><a href="mailto:contato-pendente@example.invalid" onClick={(event) => { event.preventDefault(); setNotice("Contato institucional ainda não configurado."); }}>Contato</a></div><div><strong>Informações</strong><a href="#termos" onClick={(event) => { event.preventDefault(); setNotice("Termos de uso devem ser revisados e publicados antes do lançamento."); }}>Termos de uso</a><a href="#privacidade" onClick={(event) => { event.preventDefault(); setNotice("Política de privacidade deve ser revisada e publicada antes do lançamento."); }}>Privacidade</a></div></div>
        </div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} {institutional.brandName}. Projeto em desenvolvimento.</span><span className="footer-status"><i /> Ambiente demonstrativo</span></div>
        <p className="footer-disclaimer">Faixas, artistas e artes nesta versão são demonstrativos. Letras completas e outros materiais protegidos só devem ser exibidos com autorização ou fundamento legal válido.</p>
      </footer>
      {lyricsModal && <div className="lyrics-overlay" role="dialog" aria-modal="true" aria-label={`Letra de ${lyricsModal.title}`}><section className="lyrics-panel"><button className="lyrics-close" onClick={() => setLyricsModal(null)} aria-label="Fechar"><X /></button><span className="eyebrow">CATÁLOGO MUSICAL</span><h2>{lyricsModal.title}</h2><p className="lyrics-artist">{lyricsModal.artist}</p><div className="lyrics-content">{lyricsModal.text}</div>{lyricsModal.copyright && <small>{lyricsModal.copyright}</small>}</section></div>}
      <div className="toast-region" aria-live="polite">{notice ? <div className="toast"><Check size={15} />{notice}<button onClick={() => setNotice("")} aria-label="Fechar mensagem"><X size={14} /></button></div> : null}</div>
    </div>
  );
}
