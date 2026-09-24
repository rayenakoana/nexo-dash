import { NavLink, useNavigate } from "react-router-dom";
import {
  BarChart3, ShoppingCart, CalendarPlus, Layers,
  DollarSign, Target, Settings, Users, Map,
  Radio, GitMerge, LogOut, Sun, Moon, Maximize, Minimize, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";

const publicItems = [
  { title: "Dashboard",       url: "/",            icon: BarChart3,   end: true },
  { title: "Mapa Geográfico", url: "/mapa",        icon: Map },
  { title: "Nexo Live",         url: "/live",        icon: Radio },
  { title: "Funil XPTO",      url: "/funil-xpto",  icon: GitMerge },
  { title: "Marketing",        url: "/marketing",    icon: TrendingUp },
];

const adminItems = [
  { title: "Comercial",        url: "/admin/comercial",     icon: ShoppingCart },
  { title: "Input Diário",     url: "/admin/input-diario",  icon: CalendarPlus },
  { title: "Gestão de Safras", url: "/admin/safras",        icon: Layers },
  { title: "Marketing",        url: "/admin/marketing",     icon: DollarSign },
  { title: "Metas",            url: "/admin/metas",         icon: Target },
  { title: "Configurações",    url: "/admin/configuracoes", icon: Settings },
  { title: "Usuários",         url: "/admin/usuarios",      icon: Users },
];

export function AppSidebar() {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    navigate("/login");
  }

  const navItemClass = (active: boolean) =>
    cn(
      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all relative",
      active
        ? "bg-primary/10 text-primary before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[2.5px] before:rounded-r-sm before:bg-primary"
        : "text-muted-foreground hover:bg-primary/6 hover:text-foreground"
    );

  return (
    <aside className="flex flex-col w-56 shrink-0 border-r border-border bg-sidebar h-screen sticky top-0">

      {/* Logo */}
      <div className="flex items-center justify-center px-4 py-4 border-b border-border">
        <img
          src="/logo-nexo.svg"
          alt="Nexo Dash"
          className="h-10 w-auto object-contain logo-adaptive"
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">

        {/* Visão geral */}
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60 px-3 pt-1 pb-1.5">
          Visão geral
        </p>
        {publicItems.map(({ title, url, icon: Icon, end }) => (
          <NavLink
            key={url}
            to={url}
            end={end}
            className={({ isActive }) => navItemClass(isActive)}
          >
            <Icon className="w-[15px] h-[15px] shrink-0" />
            {title}
          </NavLink>
        ))}

        {/* Divider */}
        <div className="my-2 border-t border-border/60 mx-1" />

        {/* Admin */}
        {user && (
          <>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60 px-3 pb-1.5">
              Comercial &amp; Marketing
            </p>
            {adminItems.map(({ title, url, icon: Icon }) => (
              <NavLink
                key={url}
                to={url}
                className={({ isActive }) => navItemClass(isActive)}
              >
                <Icon className="w-[15px] h-[15px] shrink-0" />
                {title}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-2 py-2 space-y-0.5">
        {/* Theme + fullscreen */}
        <div className="flex items-center gap-1 px-1 pb-1">
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Tema claro" : "Tema escuro"}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          >
            {theme === "dark"
              ? <Sun className="h-3.5 w-3.5" />
              : <Moon className="h-3.5 w-3.5" />}
            {theme === "dark" ? "Claro" : "Escuro"}
          </button>
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          >
            {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* User row */}
        {user ? (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg group cursor-default">
            <div className="w-7 h-7 rounded-full bg-gradient-red flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              {user.email?.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-foreground truncate">{user.email}</div>
              <div className="text-[10px] text-muted-foreground">Admin</div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sair"
              className="text-muted-foreground hover:text-destructive transition-colors p-1"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <NavLink
            to="/login"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          >
            <LogOut className="w-[15px] h-[15px]" />
            Login
          </NavLink>
        )}
      </div>
    </aside>
  );
}
