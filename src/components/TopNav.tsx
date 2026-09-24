import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3, Radio, Maximize, Minimize, GitMerge,
  Sun, Moon, Map, LogIn, LogOut, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

const publicItems = [
  { title: "Dashboard",   url: "/",           icon: BarChart3 },
  { title: "Funil XPTO",  url: "/funil-xpto", icon: GitMerge },
  { title: "Mapa",        url: "/mapa",        icon: Map },
  { title: "Live",        url: "/live",        icon: Radio },
];

const FULLSCREEN_PAGES = ["/", "/funil-xpto", "/live"];

export function TopNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const showFullscreen = FULLSCREEN_PAGES.includes(pathname);
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 backdrop-blur-xl bg-background/70">
      <div className="mx-auto max-w-[1600px] px-4 md:px-6 h-16 flex items-center justify-between gap-4">
        <NavLink to="/" className="flex items-center gap-2 shrink-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-red flex items-center justify-center font-display font-bold text-lg text-white glow-red">
            CS
          </div>
          <div className="hidden sm:block">
            <div className="font-display font-bold text-xl leading-none tracking-wide">
              <span className="text-gradient">CS</span>
              <span className="text-foreground"> DASH</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
              Nexo Dash
            </div>
          </div>
        </NavLink>

        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {publicItems.map(({ title, url, icon: Icon }) => {
            const active = url === "/" ? pathname === "/" : pathname.startsWith(url);
            return (
              <NavLink key={url} to={url} title={title}
                className={cn(
                  "group relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  active
                    ? "text-white bg-gradient-red shadow-[0_4px_20px_hsl(213_94%_55%/0.35)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{title}</span>
              </NavLink>
            );
          })}

          {user && (
            <NavLink
              to="/admin"
              title="Administrativo"
              className={cn(
                "group relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                pathname.startsWith("/admin")
                  ? "text-white bg-gradient-red shadow-[0_4px_20px_hsl(213_94%_55%/0.35)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden md:inline">Administrativo</span>
            </NavLink>
          )}
        </nav>

        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Tema claro" : "Tema escuro"}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-all text-xs font-medium shrink-0"
        >
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>

        {showFullscreen && (
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-all text-xs font-medium shrink-0"
          >
            {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? "Minimizar" : "Tela cheia"}</span>
          </button>
        )}

        {user ? (
          <button
            onClick={handleSignOut}
            title="Sair"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-destructive hover:border-destructive/60 transition-all text-xs font-medium shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        ) : (
          <NavLink
            to="/login"
            title="Login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-all text-xs font-medium shrink-0"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Login</span>
          </NavLink>
        )}
      </div>
    </header>
  );
}
