const fs = require('fs');
const file = 'src/components/VideoTour.tsx';
let content = fs.readFileSync(file, 'utf8');

// Remove from inside useEffect
content = content.replace('    const localStreamRef = { current: null as MediaStream | null };\n', '');

// Add to component scope
content = content.replace(
  '  const remoteVideoRef = useRef<HTMLVideoElement>(null);',
  '  const remoteVideoRef = useRef<HTMLVideoElement>(null);\n  const localStreamRef = useRef<MediaStream | null>(null);'
);

// Fix references inside handleClose
content = content.replace(/localStreamRef\.current\.getTracks/g, 'localStreamRef.current?.getTracks');
content = content.replace(/if \(localStreamRef\.current\) \{/g, 'if (localStreamRef.current) {'); // just in case

// Fix toggleMute and toggleVideo to use localStreamRef.current consistently
content = content.replace(/localStream\.getAudioTracks/g, 'localStreamRef.current!.getAudioTracks');
content = content.replace(/localStream\.getVideoTracks/g, 'localStreamRef.current!.getVideoTracks');
// Fix toggleScreenShare using localStream
content = content.replace(/localStream/g, 'localStreamRef.current');
// Except for setLocalStream!
content = content.replace(/setlocalStreamRef\.current/g, 'setLocalStream');

fs.writeFileSync(file, content);
