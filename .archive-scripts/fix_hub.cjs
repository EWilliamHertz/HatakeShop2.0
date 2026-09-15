const fs = require('fs');
let code = fs.readFileSync('src/pages/RFQHub.tsx', 'utf8');

// Add VideoTour import if not present
if (!code.includes('VideoTour')) {
    code = code.replace(`import { Link, useLocation } from 'react-router-dom';`, `import { Link, useLocation } from 'react-router-dom';\nimport { VideoTour } from '../components/VideoTour.tsx';\nimport { Socket } from 'socket.io-client';`);
}

// Modify uniqueUsers map to include latestInquiryId
const uniqueUsersOld = `       const uniqueUsers = new Map();
       inquiries.forEach(inq => {
          if (inq.buyer?.uid !== user.uid && inq.buyer) uniqueUsers.set(inq.buyer.companyName || inq.buyer.id, inq.buyer);
          if (inq.seller?.uid !== user.uid && inq.seller) uniqueUsers.set(inq.seller.companyName || inq.seller.id, inq.seller);
       });`;

const uniqueUsersNew = `       const uniqueUsers = new Map();
       inquiries.forEach(inq => {
          if (inq.buyer?.uid !== user.uid && inq.buyer) {
             if (!uniqueUsers.has(inq.buyer.id)) uniqueUsers.set(inq.buyer.id, { ...inq.buyer, latestInquiryId: inq.id });
          }
          if (inq.seller?.uid !== user.uid && inq.seller) {
             if (!uniqueUsers.has(inq.seller.id)) uniqueUsers.set(inq.seller.id, { ...inq.seller, latestInquiryId: inq.id });
          }
       });`;
code = code.replace(uniqueUsersOld, uniqueUsersNew);

// Add state for VideoTour inside RFQHub component
const rfqHubStart = `export function RFQHub() {`;
const rfqHubNewState = `export function RFQHub() {
  const [activeCall, setActiveCall] = useState<{inquiryId: number, recipientName: string, isAudioOnly: boolean} | null>(null);
  const socketRef = React.useRef<any>(null);
  
  useEffect(() => {
     socketRef.current = io();
     return () => { socketRef.current?.disconnect(); };
  }, []);`;
code = code.replace(rfqHubStart, rfqHubNewState);

// Replace the placeholder buttons with actual functionality
const oldButtons = `                     <button onClick={() => alert("Video call feature coming soon!")} className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-colors" title="Video Call">
                       <Video className="w-4 h-4" />
                     </button>
                     <button onClick={() => alert("Voice call feature coming soon!")} className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-colors" title="Voice Call">
                       <Phone className="w-4 h-4" />
                     </button>
                     <button onClick={() => alert("Direct messaging feature coming soon! You can chat with this contact through your shared RFQs.")} className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-colors" title="Message">
                       <MessageSquare className="w-4 h-4" />
                     </button>`;

const newButtons = `                     <button 
                       onClick={() => {
                          if (contact.latestInquiryId) {
                             setActiveCall({ inquiryId: contact.latestInquiryId, recipientName: contact.companyName || contact.displayName, isAudioOnly: false });
                             socketRef.current?.emit("start_video_call", { inquiryId: contact.latestInquiryId, senderName: dbUser?.companyName || dbUser?.displayName || "User", isAudioOnly: false });
                          }
                       }} 
                       className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-colors" title="Video Call">
                       <Video className="w-4 h-4" />
                     </button>
                     <button 
                       onClick={() => {
                          if (contact.latestInquiryId) {
                             setActiveCall({ inquiryId: contact.latestInquiryId, recipientName: contact.companyName || contact.displayName, isAudioOnly: true });
                             socketRef.current?.emit("start_video_call", { inquiryId: contact.latestInquiryId, senderName: dbUser?.companyName || dbUser?.displayName || "User", isAudioOnly: true });
                          }
                       }} 
                       className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-colors" title="Voice Call">
                       <Phone className="w-4 h-4" />
                     </button>
                     {contact.latestInquiryId && (
                       <Link to={\`/rfq/\${contact.latestInquiryId}\`} className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-colors" title="Message">
                         <MessageSquare className="w-4 h-4" />
                       </Link>
                     )}`;

code = code.replace(oldButtons, newButtons);

// Add the VideoTour component rendering at the end of the RFQHub return statement
const endOfReturn = `    </div>
  );
}`;
const newEndOfReturn = `      {activeCall && (
        <VideoTour 
           inquiryId={activeCall.inquiryId}
           isInitiator={true}
           recipientName={activeCall.recipientName}
           isAudioOnly={activeCall.isAudioOnly}
           onClose={() => {
              setActiveCall(null);
              socketRef.current?.emit("end_video_call", { inquiryId: activeCall.inquiryId });
           }}
        />
      )}
    </div>
  );
}`;
code = code.replace(endOfReturn, newEndOfReturn);

fs.writeFileSync('src/pages/RFQHub.tsx', code);
