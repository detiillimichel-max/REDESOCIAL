import { useEffect, useState } from "react";
import {
  Bell,
  Bookmark,
  ChevronLeft,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Search,
  Send,
  UserRound,
  Video,
} from "lucide-react";

type Tab = "videos" | "profile";

const demoVideo = {
  title: "Terra vista do espaço em 4K",
  description: "Imagens impressionantes mostrando nosso planeta em tempo real.",
  source: "NASA",
  category: "Espaço",
  likes: "12,4K",
  comments: "320",
  shares: "1,2K",
  image:
    "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1200&q=85",
};

function App() {
  const [tab, setTab] = useState<Tab>("videos");

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" aria-label="RedeSOCIOLOCAL">
          <span>REDE</span>
          <strong>SOCIOLOCAL</strong>
        </button>

        <div className="top-actions">
          <button className="icon-button" aria-label="Abrir Telegrafo">
            <MessageCircle />
          </button>
          <button className="icon-button notification" aria-label="Notificações">
            <Bell />
            <span>9+</span>
          </button>
          <button className="icon-button" aria-label="Pesquisar">
            <Search />
          </button>
        </div>
      </header>

      {tab === "videos" ? <VideosView /> : <ProfileView />}

      <nav className="bottom-nav" aria-label="Navegação principal">
        <button
          className={tab === "videos" ? "nav-item active" : "nav-item"}
          onClick={() => setTab("videos")}
        >
          <Video />
          <span>Vídeos</span>
        </button>
        <button
          className={tab === "profile" ? "nav-item active" : "nav-item"}
          onClick={() => setTab("profile")}
        >
          <UserRound />
          <span>Perfil</span>
        </button>
      </nav>
    </main>
  );
}

function VideosView() {
  type NaraItem = {
    id: string;
    title: string;
    description?: string;
    mediaUrl: string;
    sourceUrl: string;
    author?: string;
    publishedAt?: string;
  };

  const [naraItems, setNaraItems] = useState<NaraItem[]>([]);
  const [naraState, setNaraState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let active = true;

    async function loadNara() {
      try {
        const response = await fetch("/api/nara-videos?q=history&rows=10", {
          cache: "no-store",
        });
        const data = await response.json();

        if (!active) return;

        if (response.ok && data.ok === true && Array.isArray(data.items)) {
          setNaraItems(data.items);
          setNaraState("ok");
        } else {
          setNaraItems([]);
          setNaraState("error");
        }
      } catch {
        if (!active) return;
        setNaraItems([]);
        setNaraState("error");
      }
    }

    loadNara();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="feed">
      <div className="category-row">
        {["Para você", "Ciência", "Espaço", "Natureza"].map((item, index) => (
          <button className={index === 0 ? "chip selected" : "chip"} key={item}>
            {item}
          </button>
        ))}
      </div>

      {naraItems.length > 0 ? (
        naraItems.map((item) => (
          <article className="video-card" key={item.id}>
            <video
              src={item.mediaUrl}
              controls
              playsInline
              preload="metadata"
              poster={demoVideo.image}
              aria-label={item.title}
            />
            <div className="video-overlay" />
            <div className="video-content">
              <div className="source-line">
                <div className="source-avatar">N</div>
                <div>
                  <strong>NARA</strong>
                  <small>{item.author || "National Archives"} · fonte pública</small>
                </div>
              </div>
              <h1>{item.title}</h1>
              <p>{item.description || "Conteúdo audiovisual do National Archives Catalog."}</p>
              <div className="tags">
                <span>#NARA</span>
                <span>#História</span>
                <span>#NationalArchives</span>
              </div>
            </div>

            <aside className="engagement">
              <button aria-label="Curtir"><Heart /></button>
              <small>0</small>
              <button aria-label="Comentar"><MessageCircle /></button>
              <small>0</small>
              <button aria-label="Compartilhar"><Send /></button>
              <small>0</small>
              <button aria-label="Salvar"><Bookmark /></button>
              <button aria-label="Mais opções"><MoreHorizontal /></button>
            </aside>
          </article>
        ))
      ) : (
        <article className="video-card">
          <img src={demoVideo.image} alt="Terra vista do espaço" />
          <div className="video-overlay" />
          <div className="video-content">
            <div className="source-line">
              <div className="source-avatar">N</div>
              <div>
                <strong>{demoVideo.source}</strong>
                <small>Há 2 dias · fonte pública</small>
              </div>
            </div>
            <h1>{demoVideo.title}</h1>
            <p>{demoVideo.description}</p>
            <div className="tags">
              <span>#NASA</span>
              <span>#Terra</span>
              <span>#Espaço</span>
              <span>#Ciência</span>
            </div>
          </div>

          <aside className="engagement">
            <button aria-label="Curtir"><Heart /></button>
            <small>{demoVideo.likes}</small>
            <button aria-label="Comentar"><MessageCircle /></button>
            <small>{demoVideo.comments}</small>
            <button aria-label="Compartilhar"><Send /></button>
            <small>{demoVideo.shares}</small>
            <button aria-label="Salvar"><Bookmark /></button>
            <button aria-label="Mais opções"><MoreHorizontal /></button>
          </aside>
        </article>
      )}

      {naraState === "loading" && (
        <p style={{ padding: "12px 16px", opacity: 0.7 }}>Carregando conteúdos do NARA…</p>
      )}
      {naraState === "error" && (
        <p style={{ padding: "12px 16px", opacity: 0.7 }}>
          NARA indisponível no momento. O feed continua com as outras fontes.
        </p>
      )}
    </section>
  );
}

function ProfileView() {
  return (
    <section className="profile">
      <div className="profile-header">
        <button className="back-button" aria-label="Voltar">
          <ChevronLeft />
        </button>
        <div className="profile-actions">
          <button className="icon-button" aria-label="Telegrafo"><MessageCircle /></button>
          <button className="icon-button notification" aria-label="Notificações"><Bell /><span>9+</span></button>
          <button className="icon-button" aria-label="Pesquisar"><Search /></button>
        </div>
      </div>

      <div className="cover">
        <img src="https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1400&q=85" alt="" />
      </div>

      <div className="profile-body">
        <div className="identity-row">
          <div className="avatar-wrap">
            <img src="https://i.pravatar.cc/240?img=12" alt="Avatar do perfil" />
            <button aria-label="Alterar foto"><span>+</span></button>
          </div>
          <button className="edit-profile">Editar perfil</button>
        </div>

        <h1>Michel <span className="verified">✓</span></h1>
        <p className="handle">@michel</p>

        <div className="profile-details">
          <p>📍 São Bernardo do Campo - SP</p>
          <p>🎯 Hobby: Tecnologia, Natureza, Viagens, Fotografia</p>
          <p>📄 Sobre mim: Apaixonado por conhecimento, natureza, tecnologia e por criar soluções que ajudam pessoas todos os dias. 🚀</p>
          <p>▣ Membro desde 2024</p>
        </div>

        <div className="stats">
          <div><strong>1,2K</strong><span>Seguidores</span></div>
          <div><strong>560</strong><span>Seguindo</span></div>
        </div>

        <div className="profile-tabs">
          <button>Publicações</button>
          <button className="active">Vídeos</button>
          <button>Salvos</button>
        </div>

        <div className="profile-grid">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div className="grid-item" key={item}>
              <img
                src={[
                  "https://images.unsplash.com/photo-1433086966358-54859d0ed716",
                  "https://images.unsplash.com/photo-1517976547714-720226b864c1",
                  "https://images.unsplash.com/photo-1500534623283-312aade485b7",
                  "https://images.unsplash.com/photo-1428908728789-d2de25dbd4e2",
                  "https://images.unsplash.com/photo-1462331940025-496dfbfc7564",
                  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429",
                ][item - 1] + "?auto=format&fit=crop&w=500&q=80"}
                alt=""
              />
              <span><Video /> {item === 3 ? "25K" : item === 2 ? "8,3K" : "12,4K"}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default App;
