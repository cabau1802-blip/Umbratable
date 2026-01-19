import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";

// Hooks
import { useCampaignSocket } from "../../hooks/useCampaignSocket";
import { useAuth } from "../../context/AuthContext";

// Components
import { CSS_STYLES } from "../../components/UI/CampaignStyles";
import MapCanvas from "../../components/Map/MapCanvas";
import MapToolbar from "../../components/Map/MapToolbar"; // Criar baseado no código original
import ChatPanel from "../../components/Panels/ChatPanel";
import ToolsPanel from "../../components/Panels/ToolsPanel"; // (Dice, Initative, Events)

// Modals
import LegacyModal from "../../components/Modals/LegacyModal"; 
// Importar outros modais aqui...

export default function CampaignSession() {
  const { id: campaignId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Dados iniciais
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [maps, setMaps] = useState([]);
  const [currentMapIndex, setCurrentMapIndex] = useState(0);

  // Hook de Socket (conecta a lógica)
  const socketData = useCampaignSocket(campaignId);
  
  // UI State
  const [tool, setTool] = useState("move"); // move, select, fog, ruler
  const [gridEnabled, setGridEnabled] = useState(true);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [isLegacyModalOpen, setIsLegacyModalOpen] = useState(false);

  // Carregar dados iniciais (HTTP)
  useEffect(() => {
    async function load() {
        try {
            const res = await api.get(`/campaigns/${campaignId}`);
            setCampaign(res.data);
            // Carregar estado da sessão (markers, fog, etc) se estiver salvo no backend
            if(res.data.session_state) {
                // setMaps, setMarkers, etc.
            }
        } catch(e) { console.error(e); } 
        finally { setLoading(false); }
    }
    load();
  }, [campaignId]);

  if (loading) return <div>Carregando mesa...</div>;

  const isGM = campaign?.owner_id === user?.id;
  const currentMap = maps[currentMapIndex] || { src: "" }; // Fallback

  return (
    <div className="session-container">
      <style>{CSS_STYLES}</style>
      
      {/* Header */}
      <header className="glass-header">
         <div style={{display:'flex', gap:10}}>
             <button onClick={() => setShowLeftPanel(!showLeftPanel)}>💬 Chat</button>
             <span style={{fontWeight:'bold', color:'#facc15'}}>{campaign?.name}</span>
         </div>
         <div style={{display:'flex', gap:10}}>
             {isGM && <button onClick={() => setIsLegacyModalOpen(true)}>🏛️ Legado</button>}
             <button onClick={() => setShowRightPanel(!showRightPanel)}>🛠️ Ferramentas</button>
             <button onClick={() => navigate(-1)} style={{color:'#ef4444'}}>✕ Sair</button>
         </div>
      </header>

      {/* Main Area */}
      <div style={{flex:1, display:'flex', overflow:'hidden'}}>
          
          {/* Esquerda: Chat */}
          {showLeftPanel && (
              <ChatPanel 
                 logs={socketData.logs} 
                 onSend={socketData.sendLog} 
                 user={user}
              />
          )}

          {/* Centro: Mapa */}
          <div style={{flex:1, position:'relative', display:'flex', flexDirection:'column'}}>
              
              <MapToolbar 
                  tool={tool} 
                  setTool={setTool} 
                  gridEnabled={gridEnabled}
                  setGridEnabled={setGridEnabled}
                  isGM={isGM}
                  // Passar funções de limpar fog, adicionar token, etc
                  onClearFog={socketData.clearFog}
              />

              <MapCanvas 
                  mapSrc={currentMap.src}
                  markers={socketData.markers}
                  onUpdateMarkers={socketData.emitMarkers}
                  fogStrokes={socketData.fogStrokes}
                  onFogStroke={socketData.emitFogStroke}
                  tool={tool}
                  gridEnabled={gridEnabled}
                  gridDivisions={20}
                  role={isGM ? 'GM' : 'PLAYER'}
              />
          </div>

          {/* Direita: Ferramentas (Dados, Iniciativa) */}
          {showRightPanel && (
              <ToolsPanel 
                  socketData={socketData} 
                  isGM={isGM}
              />
          )}
      </div>

      {/* Modais */}
      {isLegacyModalOpen && (
          <LegacyModal 
              isOpen={isLegacyModalOpen} 
              onClose={() => setIsLegacyModalOpen(false)} 
              campaignId={campaignId}
          />
      )}

    </div>
  );
}