import { Routes, Route, useParams, Navigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { ImageConverter } from "./pages/ImageConverter";
import { PdfTools } from "./pages/PdfTools";
import { Home } from "./pages/Home";
import { Settings } from "./pages/Settings";
import { SeoHead } from "./components/SeoHead";
import TOOLS_CONFIG from './tools_config.json';
import { StudioPage } from "./pages/StudioPage";
import ActivationWrapper from "./components/ActivationWrapper";

// Tool Route Handler
function ToolHandler() {
  const { slug } = useParams();
  const config = TOOLS_CONFIG.find((c) => c.slug === slug);

  if (!config) {
    return <Navigate to="/" replace />;
  }

  if (config.tool === 'pdf') {
    return <PdfTools initialMode={config.mode} />;
  } else if (config.tool === 'image') {
    return <ImageConverter initialMode={config.mode} />;
  }

  return <Navigate to="/" replace />;
}

function App() {
  return (
    <ActivationWrapper>
      <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden relative selection:bg-primary/20">
        {/* Global Aurora Background - Teal/Sky Palette */}
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-teal-500/15 rounded-full blur-[128px] pointer-events-none z-0" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-sky-600/10 rounded-full blur-[128px] pointer-events-none z-0" />
        <div className="absolute top-[40%] left-[40%] w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[96px] pointer-events-none z-0" />

        <SeoHead />

        <Sidebar />

        <main className="flex-1 overflow-y-auto relative z-10">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/pdf-tools" element={<PdfTools />} />
            <Route path="/image-converter" element={<ImageConverter />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/studio" element={<StudioPage />} />
            <Route path="/tool/:slug" element={<ToolHandler />} />
          </Routes>
        </main>
      </div>
    </ActivationWrapper>
  );
}

export default App;
