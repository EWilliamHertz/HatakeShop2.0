import { Whiteboard } from "../components/Whiteboard.tsx";
import { EyeOff, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext.tsx';
import { collection, query, orderBy, onSnapshot, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.ts';
import { ArrowLeft, Send, Paperclip } from 'lucide-react';
import { io } from 'socket.io-client';
import { VideoTour } from '../components/VideoTour.tsx';
import { Video, Phone, PhoneIncoming, Check, X as XIcon } from 'lucide-react';



import { CheckCheck } from 'lucide-react'; // Ensure this gets added to imports
import { useCurrency } from '../components/CurrencyContext.tsx';
import { ContractModal } from '../components/ContractModal.tsx';

function ChatMessage({ msg, user, dbUser, onImageClick }: { msg: any, user: any, dbUser: any, onImageClick?: (url: string) => void }) {
  const { t } = useTranslation();
   const { formatPrice } = useCurrency();
   const [translatedText, setTranslatedText] = useState<string | null>(null);
   const [isTranslating, setIsTranslating] = useState(false);
   
   const isMine = msg.senderId === dbUser?.id;

   useEffect(() => {
      if (dbUser?.autoTranslate && dbUser?.preferredLanguage && !isMine && msg.messageContent && !translatedText && !isTranslating) {
         translateText(msg.messageContent, dbUser.preferredLanguage);
      }
   }, [dbUser?.autoTranslate, dbUser?.preferredLanguage, msg.messageContent]);

   const translateText = async (originalText: string, targetLanguage: string) => {
      setIsTranslating(true);
      try {
         const token = await user?.getIdToken();
         const res = await fetch('/api-v2/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ text: originalText, targetLanguage })
         });
         const data = await res.json();
         if (data.translation) setTranslatedText(data.translation);
      } catch (err) {
         console.error("Translation failed:", err);
      } finally {
         setIsTranslating(false);
      }
   };

   return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${isMine ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-200 border border-slate-700 shadow-sm'}`}>
          <div className="font-semibold tracking-tight text-xs opacity-75 mb-1 text-slate-400">
            {msg.sender ? `${msg.sender.displayName || 'User'} (${msg.sender.companyName || 'Company'})` : (msg.senderName || 'User')}
          </div>
          <div className="whitespace-pre-wrap">{msg.messageContent}</div>
          
          {msg.attachmentUrl && (
             <div className="mt-3">
               {msg.attachmentUrl.endsWith('.pdf') || msg.messageContent.includes('.pdf') ? (
                 <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 bg-black/20 p-2 rounded-xl hover:bg-black/30 transition">
                   <Package className="w-5 h-5" />
                   <span className="text-sm font-medium">{t('View Attached PDF')}</span>
                 </a>
               ) : (
                 <img 
                    src={msg.attachmentUrl} 
                    alt="Attachment" 
                    className="max-w-full h-auto rounded-xl border border-white/10 cursor-zoom-in hover:opacity-90 transition-opacity" 
                    onClick={() => onImageClick?.(msg.attachmentUrl)}
                 />
               )}
             </div>
          )}
          
          {msg.isOfficialQuote && (
             <div className="mt-3 bg-black/20 p-3 rounded-xl text-sm border border-white/10">
                <div className="font-semibold tracking-tight mb-1 text-cyan-300">{t('Official Quote')}</div>
                <div className="grid grid-cols-2 gap-2 text-slate-200">
                   <div>{t('Unit Price: ')}<span className="font-mono text-white">{formatPrice(msg.unitPriceProposed)}</span></div>
                   <div>{t('MOQ: ')}<span className="font-mono text-white">{msg.moqProposed}</span></div>
                   <div>{t('Lead time: ')}<span className="font-mono text-white">{msg.leadTimeProposed} days</span></div>
                </div>
             </div>
          )}

          {translatedText && (
             <div className="mt-2 pt-2 border-t border-white/10 text-sm opacity-90 italic text-slate-400">
               <span className="font-semibold tracking-tight text-white">Auto-Translated ({dbUser.preferredLanguage}):</span> {translatedText}
             </div>
          )}
          
          <div className="flex items-center justify-end space-x-1 mt-2">
            <div className="text-[10px] opacity-60 text-right">
              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            {isMine && (
              <div className="text-[10px] opacity-60">
                {msg.readReceipt ? <CheckCheck className="w-3 h-3 text-cyan-200" /> : <Check className="w-3 h-3 text-white" />}
              </div>
            )}
          </div>
        </div>
      </div>
   );
}

export function RFQDetails() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user, dbUser } = useAuth();
  const { currency, formatPrice } = useCurrency();
  const [inquiry, setInquiry] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [showContract, setShowContract] = useState(false);
  
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteData, setQuoteData] = useState({ unitPrice: '', moq: '', leadTimeDays: '' });

  const [typists, setTypists] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const [videoCallActive, setVideoCallActive] = useState(false);
  const [isAudioOnlyCall, setIsAudioOnlyCall] = useState(false);
  const [isInitiator, setIsInitiator] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ senderName: string, isAudioOnly?: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'whiteboard'>('chat');
  const socketRef = useRef<any>(null);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchInquiry = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api-v2/inquiries/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const fetchedInquiry = await res.json();
        
        // Fetch signatures from Firestore
        if (id) {
           const sigDoc = await getDoc(doc(db, 'inquiry_signatures', id));
           if (sigDoc.exists()) {
              fetchedInquiry.inquiry = {
                 ...fetchedInquiry.inquiry,
                 ...sigDoc.data()
              };
           }
        }
        
        setInquiry(fetchedInquiry);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  
  useEffect(() => {
    if (!user) return;
    fetchInquiry();
    
    // Connect to Socket.io for Real-Time Status Updates
    if (!socketRef.current) socketRef.current = io();
    const socket = socketRef.current;
    socket.emit("join_inquiry", id);
    
    socket.on("inquiry_updated", (data) => {
       setInquiry((prev: any) => {
          if (!prev) return prev;
          return { ...prev, inquiry: { ...prev.inquiry, ...data } };
       });
    });
    
    socket.on("video_call_incoming", (data) => {
       setIncomingCall({ senderName: data.senderName, isAudioOnly: data.isAudioOnly });
    });
    
    socket.on("video_call_accepted", (data) => {
       setVideoCallActive(true);
    });
    
    socket.on("video_call_ended", () => {
       setVideoCallActive(false);
       setIncomingCall(null);
    });
    
    return () => {
       socket.off("inquiry_updated");
       socket.off("video_call_incoming");
       socket.off("video_call_accepted");
       socket.off("video_call_ended");
       socket.disconnect();
       socketRef.current = null;
    };
  }, [id, user]);
  
  useEffect(() => {
    if (!id || !user) return;
    if (!socketRef.current) socketRef.current = io();
    const socket = socketRef.current;
    const fetchMessages = async () => {
      try {
        const token = await user?.getIdToken();
        const res = await fetch(`/api-v2/inquiries/${id}/messages`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } else {
          console.error('Failed to fetch messages');
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMessages();

    socket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    socket.on('typing_indicator', (data) => {
      if (data.userId !== user.uid) {
         setTypists(prev => {
            if (data.isTyping && !prev.includes(data.userId)) return [...prev, data.userId];
            if (!data.isTyping) return prev.filter(u => u !== data.userId);
            return prev;
         });
      }
    });

    socket.on('messages_read', (data) => {
      if (data.byUserId !== user.uid) {
         setMessages(prev => prev.map(m => (m.senderId !== data.byUserId ? { ...m, readReceipt: true } : m)));
      }
    });
    
    // Mark messages read when entering
    socket.emit('mark_read', { inquiryId: id, userId: dbUser?.id });

    return () => {
      socket.off('new_message');
      socket.off('typing_indicator');
      socket.off('messages_read');
    };
  }, [id, user]);

  // Keep a reference to socket emit
  
  
  const handleTyping = () => {
    if (!id || !user) return;
    
    setDoc(doc(db, 'inquiries', id, 'typing', user.uid), {
      isTyping: true,
      timestamp: serverTimestamp()
    });
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setDoc(doc(db, 'inquiries', id, 'typing', user.uid), {
        isTyping: false,
        timestamp: serverTimestamp()
      });
    }, 2000);
  };
  
  
  
  const handleAction = async (action: 'accept' | 'decline') => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api-v2/inquiries/${id}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
         setInquiry((prev: any) => ({ ...prev, inquiry: { ...prev.inquiry, status: action === 'accept' ? 'Accepted' : 'Declined' } }));
      }
    } catch(e) { console.error(e); }
  };

  const handleAcceptQuote = async (messageId: string) => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api-v2/inquiries/${id}/accept-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ messageId })
      });
      if (res.ok) {
         fetchInquiry();
         setShowContract(true);
      } else {
         toast.error("Failed to accept quote");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSignContract = async (signature: string) => {
     try {
        const isBuyer = dbUser?.id === inquiry.buyerId;
        const sigDoc = doc(db, 'inquiry_signatures', id!);
        await setDoc(sigDoc, {
           [isBuyer ? 'buyerSignature' : 'sellerSignature']: signature,
           updatedAt: serverTimestamp()
        }, { merge: true });
        
        // Optimistically update the UI so it shows instantly
        setInquiry((prev: any) => ({
           ...prev,
           inquiry: {
              ...prev.inquiry,
              [isBuyer ? 'buyerSignature' : 'sellerSignature']: signature
           }
        }));
     } catch (err) {
        console.error("Sign error:", err);
     }
  };

  
  const sendQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !quoteData.unitPrice) return;
    
    setShowQuoteForm(false);
    const messageText = text;
    setText('');
    
    try {
      const token = await user?.getIdToken();
      await fetch(`/api-v2/inquiries/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
           text: messageText, 
           type: 'quote', 
           quoteData: {
             unitPrice: parseFloat(quoteData.unitPrice),
             moq: parseInt(quoteData.moq) || inquiry?.inquiry?.quantity || 1,
             leadTimeDays: parseInt(quoteData.leadTimeDays) || 7,
             status: 'pending'
           }
        })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const socket = socketRef.current;
    if ((!text.trim() && !attachment) || !id) return;
    
    const messageText = text;
    const currentAttachment = attachment;
    setAttachmentName(null);
    setText('');
    setAttachment(null);
    setAttachmentName(null);
    
    // Clear typing status
    setDoc(doc(db, 'inquiries', id, 'typing', user!.uid), {
      isTyping: false,
      timestamp: serverTimestamp()
    });
    
    try {
      const token = await user?.getIdToken();
      await fetch(`/api-v2/inquiries/${id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: messageText, attachment: currentAttachment })
      });
    } catch (error) {
      console.error(error);
      setText(messageText);
    }
  };
  
  if (loading) return <div className="min-h-screen bg-slate-950 p-8 text-center text-slate-400">{t('Loading RFQ details...')}</div>;
  if (!inquiry) return <div className="min-h-screen bg-slate-950 p-8 text-center text-red-500">{t('RFQ not found')}</div>;
  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-7xl mx-auto space-y-6 px-4 md:px-6 lg:px-8 py-8">
        <Link to="/rfq" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to RFQ Hub
        </Link>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight text-white mb-6">{t('RFQ Details')}</h2>
            <div className="space-y-6">
              <div>
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">{t('Status')}</div>
                <div className="inline-flex px-3 py-1 rounded-full bg-cyan-950 border border-cyan-900 text-cyan-400 text-xs font-semibold tracking-wide shadow-sm">
                  {inquiry.inquiry.status}
                </div>
                {inquiry.inquiry.status === 'Pending' && inquiry.seller?.companyName && dbUser?.id === inquiry.product?.sellerId && (
                  <div className="mt-5 flex gap-3">
                     <button onClick={() => handleAction('accept')} className="flex-1 py-2.5 bg-cyan-600 text-white rounded-lg font-medium text-sm hover:bg-cyan-500 transition-colors shadow-sm">{t('Accept Order')}</button>
                     <button onClick={() => handleAction('decline')} className="flex-1 py-2.5 bg-slate-800 border border-slate-700 text-rose-400 rounded-lg font-medium text-sm hover:bg-slate-700 transition-colors">{t('Decline')}</button>
                  </div>
                )}

                {inquiry.inquiry.status === 'Accepted' && (
                  <div className="mt-5 p-4 bg-cyan-950/50 border border-cyan-900/50 rounded-xl flex flex-col gap-3">
                     <span className="font-semibold text-cyan-400 text-sm text-center">{t('Order Accepted')}</span>
                     
                     <button
                        onClick={() => setShowContract(true)}
                        className="py-2.5 border border-cyan-900/50 text-cyan-400 bg-slate-800 rounded-lg hover:bg-slate-700 flex justify-center items-center gap-2 font-medium text-sm transition-colors shadow-sm"
                     >
                        View & Sign Contract PO
                     </button>

                     {(inquiry.inquiry.paymentStatus === 'Paid' || inquiry.inquiry.paymentStatus === 'Escrow Funded' || inquiry.inquiry.paymentStatus === 'Escrow Released') ? (
                        <>
                          <div className="py-2.5 bg-cyan-600 text-white rounded-lg text-center font-medium text-sm shadow-sm flex items-center justify-center gap-2">
                            {inquiry.inquiry.paymentStatus} <Check className="w-4 h-4" />
                          </div>
                          {inquiry.inquiry.paymentStatus === 'Escrow Funded' && dbUser?.id === inquiry.inquiry.buyerId && (
                             <button
                               onClick={async () => {
                                 if (!confirm("Are you sure you want to release the funds to the seller?")) return;
                                 try {
                                   const token = await user?.getIdToken();
                                   await fetch(`/api-v2/inquiries/${inquiry.inquiry.id}/escrow/release`, {
                                      method: 'POST',
                                      headers: { 'Authorization': `Bearer ${token}` }
                                   });
                                   window.location.reload();
                                 } catch(e) { toast.error("Failed to release funds") }
                               }}
                               className="py-2.5 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white mt-2 font-medium text-sm transition-colors shadow-sm"
                             >
                               Confirm Delivery & Release Funds
                             </button>
                          )}
                        </>
                     ) : (
                        dbUser?.id === inquiry.inquiry.buyerId ? (
                           <button 
                             onClick={async () => {
                                try {
                                   const token = await user?.getIdToken();
                                   const res = await fetch('/api-v2/stripe/create-checkout-session', {
                                     method: 'POST',
                                     headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                     body: JSON.stringify({ inquiryId: inquiry.inquiry.id })
                                   });
                                   const data = await res.json();
                                   if (data.url) window.location.href = data.url;
                                   else if (data.error) toast.error("Stripe Error: " + data.error);
                                } catch(e) { toast.error("Failed to initiate checkout") }
                             }}
                             className="w-full py-3 bg-[#635BFF] text-white rounded-lg font-medium text-sm hover:bg-[#524BDE] transition-colors flex items-center justify-center space-x-2 shadow-sm mt-2"
                           >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                              <span>{t('Pay with Stripe')}</span>
                           </button>
                        ) : (
                           <div className="text-center mt-2 p-3 bg-slate-800 border border-slate-700 rounded-lg">
                              <span className="text-sm font-medium text-slate-400">{t('Awaiting buyer payment...')}</span>
                           </div>
                        )
                     )}
                  </div>
                )}

              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">{t('Target Quantity')}</div>
                   <div className="font-semibold text-white text-sm">{inquiry.inquiry.quantity.toLocaleString()}</div>
                 </div>
                 <div>
                   <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">{t('Budget')}</div>
                   <div className="font-semibold text-white text-sm">{inquiry.inquiry.currency} {inquiry.inquiry.targetBudget}</div>
                 </div>
              </div>
              
              <div>
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">{t('Product')}</div>
                <div className="font-semibold text-slate-200 text-sm p-3 bg-slate-800 rounded-lg border border-slate-700">{inquiry.product?.title || 'Custom Request'}</div>
              </div>
              
              {inquiry.inquiry.isBlindDropship && (
                <div className="col-span-2 mt-4 p-4 bg-amber-950/30 rounded-xl border border-amber-900/50">
                  <div className="flex items-center text-amber-500 font-semibold mb-3 text-sm">
                    <EyeOff className="w-4 h-4 mr-2 text-amber-400" />
                    Blind Dropshipping Required
                  </div>
                  <div className="text-sm text-amber-200/80 space-y-2">
                    <p className="font-medium flex items-center text-amber-200"><Package className="w-4 h-4 mr-2"/> {t('Ships directly to end-consumer')}</p>
                    <p className="opacity-80 text-xs">{t('Do NOT include Hatake or supplier branding on packing slips.')}</p>
                    <div className="mt-3 pt-3 border-t border-amber-900/50 space-y-1.5">
                      <div><span className="font-medium text-amber-400">{t('Consumer Name:')}</span> {inquiry.inquiry.dropshipConsumerName}</div>
                      <div><span className="font-medium text-amber-400">{t('Shipping Address:')}</span> {inquiry.inquiry.dropshipConsumerAddress}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2 flex flex-col bg-slate-900 rounded-2xl shadow-sm border border-slate-800 h-[700px] overflow-hidden">
          <div className="flex border-b border-slate-800 bg-slate-950/50">
             <button 
                onClick={() => setActiveTab('chat')}
                className={`flex-1 p-4 font-medium text-sm transition-colors ${activeTab === 'chat' ? 'bg-slate-900 text-cyan-400 border-b-2 border-cyan-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
             >
                Negotiation Chat
             </button>
             <button 
                onClick={() => setActiveTab('whiteboard')}
                className={`flex-1 p-4 font-medium text-sm transition-colors ${activeTab === 'whiteboard' ? 'bg-slate-900 text-cyan-400 border-b-2 border-cyan-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
             >
                Collaborative Whiteboard
             </button>
          </div>
          {activeTab === 'chat' ? (
             <>
          <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center z-10 shadow-sm">
            <div className="flex items-center space-x-3">
              <span className="font-semibold text-white text-sm">
                Chat with {dbUser?.id === inquiry.inquiry.buyerId 
                  ? (inquiry.seller?.companyName || "Vendor") 
                  : (inquiry.buyer?.companyName || inquiry.buyer?.displayName || "Customer")}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-cyan-950 text-cyan-400 rounded-full flex items-center tracking-wider uppercase border border-cyan-900">
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full mr-1.5 animate-pulse"></span>
                Live
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                 onClick={() => {
                   setIsAudioOnlyCall(false);
                   setIsInitiator(true);
                   setVideoCallActive(true);
                   socketRef.current?.emit("start_video_call", { inquiryId: id, senderName: dbUser?.companyName || dbUser?.displayName || "User", isAudioOnly: false });
                 }}
                 className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors border border-transparent hover:border-cyan-500/20" title="Video Call">
                 <Video className="w-4 h-4" />
              </button>
              <button 
                 onClick={() => {
                   setIsAudioOnlyCall(true);
                   setIsInitiator(true);
                   setVideoCallActive(true);
                   socketRef.current?.emit("start_video_call", { inquiryId: id, senderName: dbUser?.companyName || dbUser?.displayName || "User", isAudioOnly: true });
                 }} 
                 className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors border border-transparent hover:border-cyan-500/20" title="Voice Call">
                 <Phone className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto space-y-6 flex flex-col bg-slate-950/50">
            {messages.length === 0 ? (
              <div className="m-auto text-center text-sm text-slate-400 bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm max-w-sm">
                No messages yet. Send a message to start negotiating!
              </div>
            ) : (
              (Array.isArray(messages) ? messages : []).map(m => {
                const isMe = m.senderUid === user?.uid;
                return (
                  <div key={m.id} className={`flex flex-col max-w-[85%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                    <div className="text-[11px] font-medium text-slate-400 mb-1.5 flex items-center gap-2">
                      <span>{isMe ? 'You' : m.senderName}</span>
                      {m.readReceipt && isMe && <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    
                    {m.type === 'quote' ? (
                      <div className={`w-full max-w-sm rounded-xl overflow-hidden border ${isMe ? 'border-cyan-500/20 bg-cyan-950/20' : 'border-slate-800 bg-slate-900'} shadow-sm`}>
                         <div className={`px-4 py-3 border-b flex items-center gap-2 ${isMe ? 'bg-cyan-950/40 border-cyan-500/20 text-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-200'}`}>
                            <Package className="w-4 h-4" />
                            <span className="font-semibold text-sm tracking-tight">{t('Official Quote')}</span>
                         </div>
                         <div className="p-4 space-y-4">
                           <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                             <div>
                               <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t('Unit Price')}</div>
                               <div className="font-semibold text-white text-base">{formatPrice(m.quoteData?.unitPrice)}</div>
                             </div>
                             <div>
                               <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t('MOQ')}</div>
                               <div className="font-medium text-white">{m.quoteData?.moq}</div>
                             </div>
                             <div>
                               <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t('Lead Time')}</div>
                               <div className="font-medium text-white">{m.quoteData?.leadTimeDays} Days</div>
                             </div>
                           </div>
                           
                           {m.text && (
                             <div 
                               className={`group relative p-3 rounded-lg text-sm ${isMe ? 'bg-slate-800/80 text-white' : 'bg-slate-800 text-white'}`}
                               title={m.originalText ? 'Original: ' + m.originalText : undefined}
                             >
                               {m.text}
                               {m.originalText && (
                                 <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-slate-300 text-xs p-2 rounded border border-slate-700 shadow-xl -top-10 left-0 pointer-events-none z-50 w-max max-w-xs break-words">
                                   <span className="text-cyan-400 font-bold block mb-1">Original Text</span>
                                   {m.originalText}
                                 </div>
                               )}
                             </div>
                           )}
                           
                           {m.attachment && (
                             <div className="mt-2">
                               <img src={m.attachment} className="max-w-full h-32 object-cover rounded-lg border border-slate-700/50" alt="Quote Attachment" />
                             </div>
                           )}
                           
                           {m.quoteData?.status === 'accepted' ? (
                              <div className="mt-2 py-2 bg-cyan-950 text-cyan-400 text-center rounded-lg font-bold uppercase text-[10px] tracking-wider border border-cyan-900 flex items-center justify-center gap-1.5">
                                <Check className="w-3.5 h-3.5" /> Accepted - PO Generated
                              </div>
                           ) : !isMe ? (
                              <button 
                                onClick={() => handleAcceptQuote(m.id)}
                                className="mt-2 w-full py-2.5 bg-cyan-600 text-white rounded-lg font-medium text-sm shadow-sm hover:bg-cyan-500 transition-colors flex items-center justify-center gap-2"
                              >
                                Accept & Generate PO
                              </button>
                           ) : (
                              <div className="mt-2 py-2 bg-slate-800 border border-slate-700 text-slate-400 text-center rounded-lg font-bold uppercase text-[10px] tracking-wider">
                                Pending Buyer Action
                              </div>
                           )}
                         </div>
                      </div>
                    ) : (
                      <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-cyan-600 text-white rounded-br-sm shadow-sm' : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-sm shadow-sm'}`}>
                        <div className="whitespace-pre-wrap">{m.text}</div>
                        {m.attachment && (
                          <div className="mt-3">
                             {m.attachment.startsWith('data:image') ? (
                                <img src={m.attachment} className="max-w-full max-h-48 rounded-lg border border-white/10" alt="Attachment" />
                             ) : (
                                <a href={m.attachment} download className={`flex items-center p-2 rounded-lg text-xs font-medium ${isMe ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-900 hover:bg-slate-950 text-slate-200'}`}>
                                  <Paperclip className="w-3.5 h-3.5 mr-1.5" /> Download Attachment
                                </a>
                             )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
            {typists.length > 0 && (
              <div className="self-start text-xs text-slate-400 italic flex items-center bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800 shadow-none">
                <span className="mr-1.5">{t('Someone is typing')}</span>
                <span className="flex space-x-1">
                  <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                  <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          
          {showQuoteForm && (
             <div className="p-4 bg-cyan-950/20 border-t border-cyan-900/50">
               <div className="font-semibold text-cyan-300 text-sm mb-3 flex items-center gap-2"><Package className="w-4 h-4"/> {t('Draft Official Quote')}</div>
               <div className="grid grid-cols-3 gap-3 mb-3">
                 <input type="number" placeholder="Unit Price" value={quoteData.unitPrice} onChange={e => setQuoteData({...quoteData, unitPrice: e.target.value})} className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                 <input type="number" placeholder="MOQ" value={quoteData.moq} onChange={e => setQuoteData({...quoteData, moq: e.target.value})} className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                 <input type="number" placeholder="Lead Time (Days)" value={quoteData.leadTimeDays} onChange={e => setQuoteData({...quoteData, leadTimeDays: e.target.value})} className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
               </div>
               <div className="flex gap-2">
                 <button onClick={sendQuote} className="px-4 py-2 bg-cyan-600 text-white rounded-lg font-medium shadow-sm hover:bg-cyan-500 text-sm transition-colors">{t('Send Quote')}</button>
                 <button onClick={() => setShowQuoteForm(false)} className="px-4 py-2 bg-slate-800 text-slate-400 rounded-lg border border-slate-700 font-medium hover:bg-slate-700 hover:text-white text-sm transition-colors">{t('Cancel')}</button>
               </div>
             </div>
          )}
          <div className="p-4 bg-slate-900 border-t border-slate-800 relative z-20">

            <form onSubmit={sendMessage} className="flex gap-2 items-center">

              
              <div className="relative">
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                       const reader = new FileReader();
                       reader.onload = (ev) => { setAttachment(ev.target?.result as string); setAttachmentName(file.name); };
                       reader.readAsDataURL(file);
                    }
                  }} 
                />
                <label htmlFor="file-upload" className="cursor-pointer p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center">
                   <Paperclip className="w-5 h-5" />
                </label>
                {attachment && <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-cyan-500 rounded-full border-2 border-slate-900"></div>}
              </div>

              <button 
                 type="button" 
                 onClick={() => setShowQuoteForm(!showQuoteForm)}
                 className={`p-2.5 rounded-xl transition-colors font-bold text-lg flex items-center justify-center min-w-[44px] ${showQuoteForm ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                 title="Live Counter-Offer"
              >
                {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '¥'}
              </button>

              <input 
                type="text" 
                value={text}
                onChange={e => {
                  setText(e.target.value);
                  handleTyping();
                }}
                placeholder="Type your message or draft a quote..." 
                className="flex-1 px-4 py-2.5 bg-slate-950/50 border border-slate-800 text-white placeholder-slate-500 rounded-xl focus:bg-slate-900 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all text-sm"
              />
              <button 
                type="submit" 
                disabled={(!text.trim() && !attachment)}
                className="p-2.5 bg-cyan-600 text-white rounded-xl hover:bg-cyan-500 disabled:opacity-50 disabled:hover:bg-cyan-600 transition-colors shadow-sm ml-1"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
          </>
          ) : (
             <Whiteboard inquiryId={id!} socket={socketRef.current} />
          )}
        </div>
      </div>
      {videoCallActive && (
        <VideoTour 
           inquiryId={parseInt(id!)}
           isInitiator={isInitiator}
           recipientName={dbUser?.id === inquiry.buyerId ? (inquiry.seller?.companyName || "Vendor") : (inquiry.buyer?.companyName || "Customer")}
           isAudioOnly={isAudioOnlyCall}
           onClose={() => {
              setVideoCallActive(false);
              socketRef.current?.emit("end_video_call", { inquiryId: id });
           }}
        />
      )}
      
      {incomingCall && !videoCallActive && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
           <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 p-8 max-w-sm w-full text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 animate-bounce border border-slate-700">
                 {incomingCall.isAudioOnly ? <PhoneIncoming className="w-10 h-10 text-cyan-400" /> : <Video className="w-10 h-10 text-cyan-400" />}
              </div>
              <h3 className="text-2xl font-semibold tracking-tight text-white mb-2">Incoming {incomingCall.isAudioOnly ? 'Voice' : 'Video'} Call</h3>
              <p className="text-slate-400 mb-8">{incomingCall.senderName} is calling you...</p>
              
              <div className="flex gap-4 w-full">
                 <button 
                    onClick={() => {
                       socketRef.current?.emit("end_video_call", { inquiryId: id });
                       setIncomingCall(null);
                    }}
                    className="flex-1 py-3 bg-red-950/50 text-red-400 border border-red-900 rounded-xl font-semibold tracking-tight hover:bg-red-900 transition-colors flex items-center justify-center gap-2"
                 >
                    <XIcon className="w-5 h-5" /> Decline
                 </button>
                 <button 
                    onClick={() => {
                       setIsAudioOnlyCall(incomingCall.isAudioOnly || false);
                       setIsInitiator(false);
                       setVideoCallActive(true);
                       setIncomingCall(null);
                       socketRef.current?.emit("accept_video_call", { inquiryId: id });
                    }}
                    className="flex-1 py-3 bg-cyan-600 text-white rounded-xl font-semibold tracking-tight hover:bg-cyan-500 transition-colors flex items-center justify-center gap-2 shadow-none"
                 >
                    <Phone className="w-5 h-5" /> Accept
                 </button>
              </div>
           </div>
        </div>
      )}

      {showContract && (
        <ContractModal 
           inquiry={inquiry} 
           onClose={() => setShowContract(false)} 
           isBuyer={dbUser?.id === inquiry.buyerId}
           onSign={handleSignContract}
        />
      )}
      
      {previewImage && (() => {
        const allImages = messages.filter(m => m.attachmentUrl && !m.attachmentUrl.endsWith('.pdf')).map(m => m.attachmentUrl);
        const currentIndex = allImages.indexOf(previewImage);
        
        const nextImage = () => {
           if (currentIndex < allImages.length - 1) setPreviewImage(allImages[currentIndex + 1]);
        };
        const prevImage = () => {
           if (currentIndex > 0) setPreviewImage(allImages[currentIndex - 1]);
        };
        
        return (
          <div 
             className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm outline-none" 
             onClick={() => setPreviewImage(null)}
             onKeyDown={(e) => {
                if (e.key === 'Escape') setPreviewImage(null);
                if (e.key === 'ArrowRight') nextImage();
                if (e.key === 'ArrowLeft') prevImage();
             }}
             tabIndex={-1}
             ref={el => el?.focus()}
          >
            <button className="absolute top-6 right-6 text-white/70 hover:text-white p-2 bg-black/50 rounded-full transition-colors z-[110]" onClick={() => setPreviewImage(null)}>
              <XIcon className="w-6 h-6" />
            </button>
            
            {currentIndex > 0 && (
               <button 
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 bg-black/50 hover:bg-black/80 rounded-full transition-colors z-[110]" 
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
               >
                  <ArrowLeft className="w-6 h-6" />
               </button>
            )}
            
            <img src={previewImage} className="max-w-full max-h-[90vh] object-contain shadow-2xl select-none" alt="Preview" onClick={e => e.stopPropagation()} />
            
            {currentIndex < allImages.length - 1 && (
               <button 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 bg-black/50 hover:bg-black/80 rounded-full transition-colors z-[110]" 
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
               >
                  <ArrowLeft className="w-6 h-6 rotate-180" />
               </button>
            )}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-sm bg-black/50 px-4 py-1.5 rounded-full z-[110]">
               {currentIndex + 1} of {allImages.length}
            </div>
          </div>
        );
      })()}
      </div>
    </div>
  );
}
