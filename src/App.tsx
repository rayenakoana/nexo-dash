import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Vendas from "./pages/Vendas";
import InputDiario from "./pages/InputDiario";
import GestaoSafras from "./pages/GestaoSafras";
import CustosMarketing from "./pages/CustosMarketing";
import Metas from "./pages/Metas";
import Configuracoes from "./pages/Configuracoes";
import CSLive from "./pages/CSLive";
import FunilXPTO from "./pages/FunilXPTO";
import MapaGeografico from "./pages/MapaGeografico";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Usuarios from "./pages/admin/Usuarios";
import NotFound from "./pages/NotFound";
import MarketingDashboard from "./pages/MarketingDashboard";
import ClubDashboard from "./pages/club/ClubDashboard";
import ClubMembros from "./pages/club/ClubMembros";
import ClubMembroPerfil from "./pages/club/ClubMembroPerfil";
import ClubFinanceiro from "./pages/club/ClubFinanceiro";
import ClubPlanos from "./pages/club/ClubPlanos";

const queryClient = new QueryClient();

function Shell() {
  const { pathname } = useLocation();
  const isLive = pathname.startsWith("/live");
  const isAuth = pathname === "/login" || pathname === "/reset-password";

  // Live e auth rodam sem sidebar
  if (isLive) {
    return (
      <Routes>
        <Route path="/live" element={<CSLive />} />
      </Routes>
    );
  }
  if (isAuth) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
        <Routes>
          {/* Club ERP */}
          <Route path="/club" element={<ClubDashboard />} />
          <Route path="/club/membros" element={<ClubMembros />} />
          <Route path="/club/membros/:id" element={<ClubMembroPerfil />} />
          <Route path="/club/financeiro" element={<ClubFinanceiro />} />
          <Route path="/club/planos" element={<ClubPlanos />} />

          {/* Públicas */}
          <Route path="/" element={<Index />} />
          <Route path="/funil-xpto" element={<FunilXPTO />} />
          <Route path="/mapa" element={<MapaGeografico />} />
          <Route path="/marketing" element={<MarketingDashboard />} />

          {/* Admin (protegidas) */}
          <Route path="/admin/comercial"     element={<ProtectedRoute><Vendas /></ProtectedRoute>} />
          <Route path="/admin/input-diario"  element={<ProtectedRoute><InputDiario /></ProtectedRoute>} />
          <Route path="/admin/safras"        element={<ProtectedRoute><GestaoSafras /></ProtectedRoute>} />
          <Route path="/admin/marketing"     element={<ProtectedRoute><CustosMarketing /></ProtectedRoute>} />
          <Route path="/admin/metas"         element={<ProtectedRoute><Metas /></ProtectedRoute>} />
          <Route path="/admin/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
          <Route path="/admin/usuarios"      element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            <Shell />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
