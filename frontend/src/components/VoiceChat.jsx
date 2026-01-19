import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';

// --- COLOQUE SUAS CHAVES AQUI ---
const APP_ID = 632979884; // Seu App ID
const SERVER_SECRET = "cbaa2993a89c54936fd85e628ab1ee49"; // Seu Server Secret

const VoiceChat = forwardRef(({ roomId, user, onLeave }, ref) => {
    const containerRef = useRef(null);
    const zpRef = useRef(null);
    
    // Expõe funções para o componente pai (CampaignSession)
    useImperativeHandle(ref, () => ({
        toggleMic: (shouldMute) => {
            if (zpRef.current) {
                // O Zego usa lógica invertida: turnMicrophoneOn vs Off
                if (shouldMute) {
                    zpRef.current.turnMicrophoneOff();
                } else {
                    zpRef.current.turnMicrophoneOn();
                }
            }
        }
    }));

    useEffect(() => {
        if (!containerRef.current) return;

        const myMeeting = async () => {
            const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
                APP_ID, 
                SERVER_SECRET, 
                roomId, 
                user.id.toString(), 
                user.username || user.name || "Jogador"
            );

            const zp = ZegoUIKitPrebuilt.create(kitToken);
            zpRef.current = zp;

            zp.joinRoom({
                container: containerRef.current,
                scenario: {
                    mode: ZegoUIKitPrebuilt.GroupVoiceCall, 
                },
                turnOnCameraWhenJoining: false,
                turnOnMicrophoneWhenJoining: true, // Entra com mic ligado por padrão
                showMyCameraToggleButton: false,
                showMyMicrophoneToggleButton: false, // Esconde botões nativos pois usaremos os nossos
                showAudioVideoSettingsButton: false,
                showUserList: false,
                showPreJoinView: false, 
                showLeavingView: false,
                layout: "Grid",
                
                // Callbacks
                onLeaveRoom: () => {
                    if (onLeave) onLeave();
                },
                // Aqui poderíamos capturar onSoundLevelUpdate no SDK Core para animar quem fala
            });
        };

        myMeeting();

        return () => {
            if (zpRef.current) {
                zpRef.current.destroy();
            }
        };
    }, [roomId, user, onLeave]);

    return (
        <div 
            style={{ 
                width: '0px', 
                height: '0px', 
                opacity: 0, 
                pointerEvents: 'none', 
                overflow: 'hidden' 
            }}
        >
            <div ref={containerRef} />
        </div>
    );
});

export default VoiceChat;