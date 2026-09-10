const fs = require('fs');
const file = 'src/components/VideoTour.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the initAgora block
const target = `        // Join Agora Channel
        await clientRef.current.join(appId, \`inq_\${inquiryId}\`, null, null);
        
        // Create Local Tracks
        const tracks: any[] = [];
        
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localAudioTrackRef.current = audioTrack;
        tracks.push(audioTrack);
        
        if (!isAudioOnly) {
           const videoTrack = await AgoraRTC.createCameraVideoTrack();
           localVideoTrackRef.current = videoTrack;
           tracks.push(videoTrack);
           if (localVideoRef.current) {
              videoTrack.play(localVideoRef.current);
           }
        }
        
        await clientRef.current.publish(tracks);`;

const replacement = `        // Join Agora Channel
        if (clientRef.current.connectionState === "DISCONNECTED") {
           await clientRef.current.join(appId, \`inq_\${inquiryId}\`, null, null);
        }
        
        // Create Local Tracks
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
        }
        
        // Unpublish existing tracks if any to prevent CAN_NOT_PUBLISH_MULTIPLE_VIDEO_TRACKS
        const existingTracks = clientRef.current.localTracks || [];
        if (existingTracks.length > 0) {
            await clientRef.current.unpublish(existingTracks);
        }
        
        await clientRef.current.publish(tracks);`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
