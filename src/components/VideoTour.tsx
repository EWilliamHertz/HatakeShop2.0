import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, Phone, Mic, MicOff, Globe2, Video as VideoIcon, VideoOff, X, PhoneMissed, MessageSquareText, MonitorUp } from 'lucide-react';
import { useAuth } from './AuthContext.tsx';
import { useTranslation } from 'react-i18next';
import { io, Socket } from 'socket.io-client';
import AgoraRTC, { ICameraVideoTrack, IMicrophoneAudioTrack, ILocalVideoTrack } from "agora-rtc-sdk-ng";

interface VideoTourProps {
  inquiryId: number;
  onClose: () => void;
  isInitiator: boolean;
  recipientName: string;
  isAudioOnly?: boolean;
}

export function VideoTour({ inquiryId, onClose, isInitiator, recipientName, isAudioOnly = false }: VideoTourProps) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(isAudioOnly);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const [caption, setCaption] = useState<{ text: string, sender: string } | null>(null);
  const [needsAgoraKey, setNeedsAgoraKey] = useState<string | false>(false);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const recognitionRef = useRef<any>(null);

  const clientRef = useRef<any>(null);
  if (!clientRef.current) { clientRef.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" }); }
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const screenVideoTrackRef = useRef<ILocalVideoTrack | null>(null);

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    socketRef.current = io();
    socketRef.current.emit("join_inquiry", inquiryId);
    
    // Live Captions via Socket
    socketRef.current.on("live_caption", async (data) => {
      if (data.sender !== user?.displayName) {
         try {
            let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
            const res = await fetch('/api-v2/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ text: data.text, targetLanguage: i18n.language })
            });
            const resData = await res.json();
            if (resData.translation) {
              setCaption({ text: resData.translation, sender: data.sender });
              setTimeout(() => setCaption(null), 5000);
            }
         } catch (e) {
            console.error("Failed to translate caption", e);
         }
      }
    });
    
    socketRef.current.on("video_call_ended", () => {
      handleClose(false); // don't re-emit
    });

    const initAgora = async () => {
      try {
        let appId = ((import.meta) as any).env.VITE_AGORA_APP_ID;

        // Initialize Speech Recognition for Captions
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = i18n.language;
           
          recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
              }
            }
            if (finalTranscript.trim() && socketRef.current) {
              socketRef.current.emit("live_caption", {
                inquiryId,
                text: finalTranscript.trim(),
                sender: user?.displayName || 'User',
                originalLang: i18n.language
              });
              setCaption({ text: finalTranscript.trim(), sender: 'You' });
              setTimeout(() => setCaption(null), 5000);
            }
          };
          recognition.start();
          recognitionRef.current = recognition;
        }

        // Fetch Token
        let token = null;
        try {
           let idToken; try { idToken = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
           const res = await fetch('/api-v2/agora-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
              body: JSON.stringify({ channelName: `inq_${inquiryId}` })
           });
           const data = await res.json();
           if (data.appId) {
              appId = data.appId;
           }
           if (data.token) {
              token = data.token;
           }
        } catch (e) {
           console.warn("Failed to fetch token, trying without one", e);
        }

        if (!appId) {
           setNeedsAgoraKey("The voice/video call feature uses Agora RTC for reliable connections. Please provide your VITE_AGORA_APP_ID in the settings to enable live calls.");
           return;
        }

        // Join Agora Channel
        if (clientRef.current.connectionState === "DISCONNECTED") {
           await clientRef.current.join(appId, `inq_${inquiryId}`, token, null);
        }
        
        // Create Local Tracks
        const tracks: any[] = [];
        
        try {
            if (!localAudioTrackRef.current) {
                const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
                localAudioTrackRef.current = audioTrack;
            }
            if (localAudioTrackRef.current) tracks.push(localAudioTrackRef.current);
        } catch (e) {
            console.warn("Could not acquire microphone", e);
        }
        
        if (!isAudioOnly) {
           try {
               if (!localVideoTrackRef.current) {
                   const videoTrack = await AgoraRTC.createCameraVideoTrack();
                   localVideoTrackRef.current = videoTrack;
               }
               if (localVideoTrackRef.current) tracks.push(localVideoTrackRef.current);
               if (localVideoRef.current && localVideoTrackRef.current) {
                  localVideoTrackRef.current.play(localVideoRef.current);
               }
           } catch (e) {
               console.warn("Could not acquire camera", e);
           }
        }
        
        // Unpublish existing tracks if any to prevent CAN_NOT_PUBLISH_MULTIPLE_VIDEO_TRACKS
        const existingTracks = clientRef.current.localTracks || [];
        if (existingTracks.length > 0) {
            await clientRef.current.unpublish(existingTracks);
        }
        
        if (tracks.length > 0) {
            await clientRef.current.publish(tracks);
        }

        // Handle Remote Users
        clientRef.current.on("user-published", async (remoteUser, mediaType) => {
           await clientRef.current.subscribe(remoteUser, mediaType);
           if (mediaType === "video" && remoteVideoRef.current) {
               remoteUser.videoTrack?.play(remoteVideoRef.current);
           }
           if (mediaType === "audio") {
               remoteUser.audioTrack?.play();
           }
        });
        
        clientRef.current.on("user-unpublished", (remoteUser, mediaType) => {
           if (mediaType === "video" && remoteVideoRef.current) {
               remoteUser.videoTrack?.stop();
           }
           if (mediaType === "audio") {
               remoteUser.audioTrack?.stop();
           }
        });

      } catch (err: any) {
        console.error("Failed to initialize Agora RTC", err);
        if (err?.code === 'CAN_NOT_GET_GATEWAY_SERVER' || err?.message?.includes('token')) {
           setNeedsAgoraKey("Agora connection failed. If your project has an App Certificate enabled, please disable it for testing, or ensure your App ID is correct.");
        }
      }
    };

    initAgora();

    return () => {
      handleClose(false);
    };
  }, [inquiryId, isInitiator]);

  const handleClose = async (emitEnd = true) => {
    try {
      if (localAudioTrackRef.current) {
         localAudioTrackRef.current.stop();
         localAudioTrackRef.current.close();
      }
      if (localVideoTrackRef.current) {
         localVideoTrackRef.current.stop();
         localVideoTrackRef.current.close();
      }
      if (screenVideoTrackRef.current) {
         screenVideoTrackRef.current.stop();
         screenVideoTrackRef.current.close();
      }
      await clientRef.current.leave();
    } catch (e) {}

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (socketRef.current) {
      if (emitEnd) socketRef.current.emit("end_video_call", { inquiryId });
      socketRef.current.disconnect();
    }
    
    onClose();
  };

  const toggleMute = () => {
    if (localAudioTrackRef.current) {
      const state = !isMuted;
      localAudioTrackRef.current.setMuted(state);
      setIsMuted(state);
    }
  };

  const toggleScreenShare = async () => {
    try {
       if (isScreenSharing) {
          // Stop screen share
          if (screenVideoTrackRef.current) {
             await clientRef.current.unpublish(screenVideoTrackRef.current);
             screenVideoTrackRef.current.stop();
             screenVideoTrackRef.current.close();
             screenVideoTrackRef.current = null;
          }
          if (localVideoTrackRef.current) {
             await clientRef.current.publish(localVideoTrackRef.current);
             if (localVideoRef.current) {
                localVideoTrackRef.current.play(localVideoRef.current);
             }
          }
          setIsScreenSharing(false);
       } else {
          // Start screen share
          const screenTrack = await AgoraRTC.createScreenVideoTrack({}, "auto");
          
          if (localVideoTrackRef.current) {
             await clientRef.current.unpublish(localVideoTrackRef.current);
          }
          
          // Handle screen share stop via browser UI
          if (Array.isArray(screenTrack)) {
              // Sometimes it returns [video, audio]
              screenVideoTrackRef.current = screenTrack[0];
          } else {
              screenVideoTrackRef.current = screenTrack;
          }
          
          screenVideoTrackRef.current!.on("track-ended", () => {
             toggleScreenShare();
          });
          
          await clientRef.current.publish(screenVideoTrackRef.current!);
          if (localVideoRef.current) {
             screenVideoTrackRef.current!.play(localVideoRef.current);
          }
          
          setIsScreenSharing(true);
       }
    } catch (err) {
       console.error("Failed to share screen", err);
    }
  };

  const toggleVideo = () => {
    if (localVideoTrackRef.current) {
      const state = !isVideoOff;
      localVideoTrackRef.current.setMuted(state);
      setIsVideoOff(state);
    }
  };

  if (needsAgoraKey) {
     return (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-slate-800 p-8 rounded-2xl max-w-md w-full shadow-2xl">
               <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <PhoneMissed className="w-8 h-8" />
               </div>
               <h2 className="text-2xl font-semibold tracking-tight text-slate-100 mb-2">API Key Required</h2>
               <p className="text-slate-400 mb-6">
                  {needsAgoraKey}
               </p>
               <button onClick={() => handleClose(true)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold tracking-tight hover:bg-slate-800 transition-colors">
                  Close Call
               </button>
            </div>
        </div>
     );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col">
      <div className="p-4 flex items-center justify-between text-white bg-slate-900/80 absolute top-0 w-full z-10">
        <div className="flex items-center gap-3">
          {isAudioOnly ? <Phone className="w-5 h-5 text-indigo-400" /> : <Camera className="w-5 h-5 text-indigo-400" />}
          <h2 className="font-semibold tracking-tight">{isAudioOnly ? 'Voice Call' : 'Live Video Call'} with {recipientName}</h2>
          <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold tracking-tight animate-pulse">Connected</span>
        </div>
        <button onClick={() => handleClose(true)} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 relative bg-black overflow-hidden flex items-center justify-center">
        {/* Remote Video Container for Agora */}
        <div ref={remoteVideoRef} className="w-full h-full object-cover" />
        
        {/* Local Video (PiP) */}
        {!isAudioOnly && (
           <div className="absolute bottom-24 right-6 w-48 h-72 bg-slate-800 rounded-xl overflow-hidden border-2 border-slate-700 shadow-2xl z-20">
             <div ref={localVideoRef} className="w-full h-full object-cover" />
           </div>
        )}

        {/* Live Translated Captions */}
        {caption && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 max-w-2xl w-full px-6 z-30">
            <div className="bg-black/70 backdrop-blur-md rounded-xl p-4 shadow-none border border-white/10 flex flex-col items-center">
               <div className="flex items-center gap-2 mb-1">
                 <MessageSquareText className="w-4 h-4 text-indigo-400" />
                 <span className="text-xs font-semibold tracking-tight text-slate-400 uppercase tracking-widest">{caption.sender}</span>
                 {caption.sender !== 'You' && <Globe2 className="w-3 h-3 text-emerald-400 ml-2" />}
               </div>
               <p className="text-white text-xl font-medium text-center">{caption.text}</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="h-20 bg-slate-900 flex items-center justify-center gap-6 z-10 relative">
        <button 
          onClick={toggleMute}
          className={`p-4 rounded-full ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-700 hover:bg-slate-600'} text-white transition-colors shadow-none`}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
        <button 
          onClick={() => handleClose(true)}
          className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors shadow-none px-8"
        >
          <PhoneMissed className="w-6 h-6" />
        </button>
        {!isAudioOnly && (
           <>
              <button 
                onClick={toggleVideo}
                className={`p-4 rounded-full ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-700 hover:bg-slate-600'} text-white transition-colors shadow-none`}
              >
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <VideoIcon className="w-6 h-6" />}
              </button>
              <button 
                onClick={toggleScreenShare}
                className={`p-4 rounded-full ${isScreenSharing ? 'bg-slate-7000 hover:bg-ink' : 'bg-slate-700 hover:bg-slate-600'} text-white transition-colors shadow-none`}
              >
                <MonitorUp className="w-6 h-6" />
              </button>
           </>
        )}
      </div>
    </div>
  );
}
