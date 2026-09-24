import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  CalendarPlus, Layers, DollarSign, Target, Settings, Users, LogOut, ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const adminItems = [
  { title: "Comercial",        url: "/admin/comercial",     icon: ShoppingCart },
  { title: "Input Diário",     url: "/admin/input-diario", icon: CalendarPlus },
  { title: "Gestão de Safras", url: "/admin/safras",        icon: Layers },
  { title: "Marketing",        url: "/admin/marketing",     icon: DollarSign },
  { title: "Metas",            url: "/admin/metas",         icon: Target },
  { title: "Configurações",    url: "/admin/configuracoes", icon: Settings },
  { title: "Usuários",         url: "/admin/usuarios",      icon: Users },
];

export default function AdminLayout() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();

  return (
    <div className="flex gap-6 items-start">
      <aside className="w-48 shrink-0 rounded-xl border border-border/60 bg-card/40 backdrop-blur-xl p-2 flex flex-col gap-1 sticky top-20">
        {adminItems.map(({ title, url, icon: Icon }) => {
          const active = pathname === url || pathname.startsWith(url + "/");
          return (
            <NavLink
              key={url}
              to={url}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                active
                  ? "text-white bg-gradient-red shadow-[0_4px_20px_hsl(213_94%_55%/0.35)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Icon className="h-4 w-4" />
              {title}
            </NavLink>
          );
        })}

        <div className="mt-2 pt-2 border-t border-border/60 flex flex-col gap-1">
          <div className="px-3 py-1.5 text-xs text-muted-foreground truncate" title={user?.email ?? ""}>
            {user?.email}
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
