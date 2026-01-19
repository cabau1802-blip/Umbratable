// frontend/src/App.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import { useAuth } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";

import Navbar from "./components/Navbar";
import GlobalChat from "./components/GlobalChat";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Home from "./pages/Home";
import PersonagemPage from "./pages/Personagem";
import CampanhasPage from "./pages/Campanhas";
import AmigosPage from "./pages/Amigos";
import CampaignSession from "./pages/CampaignSession";
import Perfil from "./pages/Perfil/Perfil";

// Import/Export (Premium)
import ImportCampaign from "./pages/ImportCampaign";

// NOVO
import Sugestoes from "./pages/Sugestoes";
import AdminDashboard from "./pages/AdminDashboard";

import { useActivityPing } from "./hooks/useActivityPing";

import HelpFloatingButton from "./components/help/HelpFloatingButton";
import HelpCenterModal from "./components/help/HelpCenterModal";
import OnboardingGuideModal from "./components/OnboardingGuideModal";

import { getSuggestedArticles } from "./help/helpContent";
import helpButtonImg from "./assets/help-button.png";

const LS_ONBOARDING_SEEN = "umbraltable:onboarding_seen:v1";

function pickTransition(prevPath, nextPath) {
  if ((prevPath || "").startsWith("/login") && (nextPath || "").startsWith("/home")) return "fog";
  if ((prevPath || "").startsWith("/home") && (nextPath || "").includes("/session")) return "zoom";
  return "scroll";
}

function App() {
  const { isAuthenticated, user, loading } = useAuth();
  const isAdmin = String(user?.role || "").toUpperCase() === "ADMIN";

  
  // Dashboard v1: registra presença/sessão (apenas quando há token)
  useActivityPing();
const [authMode, setAuthMode] = useState("login");
  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = location.pathname;
  const isAuthPage = currentPath === "/login" || currentPath === "/register" || currentPath === "/reset-password";
  const isSession = currentPath.includes("/session");

  // NOVO: rota pública permitida
  const isPublicSuggestions = currentPath === "/sugestoes";

  const [helpOpen, setHelpOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const hasHelpSuggestion = useMemo(() => {
    try {
      return getSuggestedArticles(currentPath, 1).length > 0;
    } catch {
      return false;
    }
  }, [currentPath]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (isSession) return;

    try {
      const seen = localStorage.getItem(LS_ONBOARDING_SEEN);
      if (!seen) setOnboardingOpen(true);
    } catch {}
  }, [isAuthenticated, isSession]);

  const handleNavigate = (to) => {
    setHelpOpen(false);
    setOnboardingOpen(false);
    navigate(to);
  };

  const prevPathRef = useRef(location.pathname);
  const transitionType = useMemo(() => {
    const prev = prevPathRef.current;
    const next = location.pathname;
    const t = pickTransition(prev, next);
    prevPathRef.current = next;
    return t;
  }, [location.pathname]);

  if (loading) {
    return (
      <div style={{ height: "100vh", background: "#020617", color: "#94a3b8", display: "grid", placeItems: "center" }}>
        Preparando o portal...
      </div>
    );
  }

  // Gate simples: se não autenticado, força /login (exceto reset e /sugestoes)
  if (!isAuthenticated && !isAuthPage && !isPublicSuggestions) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ChatProvider>
      {isAuthenticated && !isAuthPage && <Navbar user={user} />}

      <AnimatedRouteShell location={location} transitionType={transitionType}>
        <Routes location={location}>
          {/* Auth */}
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/home" replace /> : <Login onToggleMode={() => navigate("/register")} />}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/home" replace /> : <Register onToggleMode={() => navigate("/login")} />}
          />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Público */}
          <Route path="/sugestoes" element={<Sugestoes />} />

          {/* Admin */}
          <Route path="/admin" element={isAuthenticated && isAdmin ? <AdminDashboard /> : <Navigate to={isAuthenticated ? "/home" : "/login"} replace />} />

          {/* App */}
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/personagem" element={<PersonagemPage />} />

          {/* Import de campanha (Premium/Admin). Mantido fora do Admin para uso normal. */}
          <Route path="/campanhas/import" element={<ImportCampaign />} />

          <Route path="/campanhas" element={<CampanhasPage />} />
          <Route path="/amigos" element={<AmigosPage />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/session/:id" element={<CampaignSession />} />

          {/* fallback */}
          <Route path="*" element={<Navigate to={isAuthenticated ? "/home" : "/login"} replace />} />
        </Routes>
      </AnimatedRouteShell>

      {isAuthenticated && !isAuthPage && <GlobalChat />}

      {isAuthenticated && !isAuthPage && (
        <HelpFloatingButton onClick={() => setHelpOpen(true)} imageSrc={helpButtonImg} />
      )}

      {helpOpen && (
        <HelpCenterModal
          isOpen={helpOpen}
          onClose={() => setHelpOpen(false)}
          currentPath={currentPath}
          onNavigate={handleNavigate}
          onOpenQuickGuide={() => {
            setHelpOpen(false);
            setOnboardingOpen(true);
          }}
        />
      )}

      {onboardingOpen && (
        <OnboardingGuideModal
          isOpen={onboardingOpen}
          onClose={() => setOnboardingOpen(false)}
          onNavigate={handleNavigate}
        />
      )}

      <div style={{ display: "none" }} data-help-suggest={hasHelpSuggestion ? "1" : "0"} />
    </ChatProvider>
  );
}

export default App;

function AnimatedRouteShell({ children, location, transitionType }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        style={{ minHeight: "100vh" }}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={getVariants(transitionType)}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        {transitionType === "fog" && <FogOverlay />}
        {transitionType === "scroll" && <ScrollEdges />}
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function getVariants(type) {
  if (type === "zoom") {
    return {
      initial: { opacity: 0, scale: 1.03, filter: "blur(4px)" },
      animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
      exit: { opacity: 0, scale: 0.98, filter: "blur(3px)" },
    };
  }

  if (type === "scroll") {
    return {
      initial: { opacity: 0, x: 40 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -40 },
    };
  }

  return {
    initial: { opacity: 0.25 },
    animate: { opacity: 1 },
    exit: { opacity: 0.25 },
  };
}

function FogOverlay() {
  return (
    <motion.div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20000,
        pointerEvents: "none",
        background:
          "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.10) 0%, transparent 45%), radial-gradient(circle at 70% 60%, rgba(255,255,255,0.08) 0%, transparent 50%), linear-gradient(180deg, rgba(2,6,23,0.25), rgba(2,6,23,0.55))",
        backdropFilter: "blur(10px)",
        mixBlendMode: "screen",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28 }}
    />
  );
}

function ScrollEdges() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 15000,
        background:
          "linear-gradient(90deg, rgba(250,204,21,0.05) 0%, transparent 18%), linear-gradient(270deg, rgba(250,204,21,0.05) 0%, transparent 18%)",
      }}
    />
  );
}
