const fs = require('fs');
const file = 'src/components/VideoTour.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `        // Create Local Tracks
        const tracks: any[] = [];
        
        if (!localAudioTrackRef.current) {
            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            localAudioTrackRef.current = audioTrack;
        }
        tracks.push(localAudioTrackRef.current);
        
        if (!isAudioOnly) {
           if (!localVideoTrackRef.current) {
               const videoTrack = await AgoraRTC.createCameraVideoTrack();
               localVideoTrackRef.current = videoTrack;
           }
           tracks.push(localVideoTrackRef.current);
           if (localVideoRef.current) {
              localVideoTrackRef.current.play(localVideoRef.current);
           }
        }`;

const replacement = `        // Create Local Tracks
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
        }`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
