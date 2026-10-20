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
    const term = query.trim();
    if (term.length < 2) return undefined;
    let active = true;
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/catalog?q=${encodeURIComponent(term)}&page=1`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Falha na pesquisa.");
        if (active && Array.isArray(data.items)) {
          setCatalogItems(data.items);
          setCatalogMessage(data.source === "LRCLIB" ? "Resultados encontrados no LRCLIB." : "Resultados do catálogo local.");
        }
      } catch (error) {
        if (active) setCatalogMessage(error.message || "Não foi possível pesquisar no catálogo externo.");
      }
    }, 350);
    return () => { active = false; clearTimeout(timeout); };
  }, [query]);

  const sourceTracks = catalogItems.length
    ? catalogItems.map((track, index) => ({
        ...track,
        color: ["lilac", "coral", "blue", "gold", "green", "pink"][index % 6],
        tag: track.provider === "LRCLIB" ? "LRCLIB" : "Exemplo",
        genre: track.genre || "Música",
      }))
    : tracks;

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

        <section className="discover section-wrap" id="descobrir">
          <div className="section-heading">
            <div><span className="eyebrow"><span className="eyebrow__line" /> EXPLORE NO SEU RITMO</span><h2>Descubra seu próximo <span>favorito.</span></h2><p>Pesquise músicas do catálogo conectado e descubra novos artistas.</p><p className="catalog-status" role="status">{catalogMessage}</p></div>
            <div className="discover__count"><span className="count-dot" /> {filteredTracks.length} resultados</div>
          </div>
          <div className="filters">
            <div className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar música, artista ou estilo..." aria-label="Buscar música, artista ou estilo" /><kbd>⌕</kbd></div>
            <div className="category-list" id="generos" aria-label="Filtrar por gênero">
              {categories.map((item) => <button key={item} className={category === item ? "category category--active" : "category"} onClick={() => { setCategory("Todas"); setQuery(item === "Todas" ? "" : item); }}>{item}</button>)}
            </div>
          </div>
          {notice && <div className="inline-notice" role="status"><Check size={15} />{notice}<button onClick={() => setNotice("")} aria-label="Dispensar aviso"><X size={14} /></button></div>}
          {filteredTracks.length ? <div className="track-grid">{filteredTracks.map((track) => {
            const isSaved = saved.includes(track.title);
            return <article className="track-card" key={track.title}>
              <div className="track-card__image"><Artwork color={track.color} index={sourceTracks.indexOf(track)} /><span className="track-tag">{track.tag}</span><button className={isSaved ? "save-button save-button--active" : "save-button"} onClick={() => toggleSaved(track.title)} aria-label={isSaved ? `Remover ${track.title} dos salvos` : `Salvar ${track.title}`} aria-pressed={isSaved}><Heart size={17} fill={isSaved ? "currentColor" : "none"} /></button></div>
              <div className="track-card__body"><div><span className="track-genre">{track.genre}</span><h3>{track.title}</h3><p>{track.artist}</p></div><button className="track-card__arrow" aria-label={`Ver detalhes de ${track.title}`} onClick={async () => { if (!track.id) { setNotice("Esta faixa é apenas um exemplo demonstrativo."); return; } try { const response = await fetch(`/api/lyrics/${track.id}`); const data = await response.json(); setLyricsModal({ title: track.title, artist: track.artist, text: data.lyrics || data.error || "Letra indisponível.", copyright: data.copyright || "" }); } catch { setLyricsModal({ title: track.title, artist: track.artist, text: "Não foi possível consultar a fonte de letras." }); } }}><ArrowRight size={18} /></button></div>
            </article>;
          })}</div> : <div className="empty-state"><Search size={25} /><h3>Nenhuma música encontrada</h3><p>Tente outro termo ou escolha uma categoria diferente.</p><button className="button button--secondary" onClick={() => { setQuery(""); setCategory("Todas"); }}>Limpar filtros</button></div>}
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
