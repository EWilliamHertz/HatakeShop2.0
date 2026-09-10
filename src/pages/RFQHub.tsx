import { EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext.tsx';
import { MessageSquare, Clock, FileText, ArrowRight, Phone, Video, Users, User, Package } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { VideoTour } from '../components/VideoTour.tsx';
import { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { db } from '../lib/firebase.ts';


function RFQDraftForm({ stateObj, user, fetchInquiries }: any) {
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState<number>(100);
  const [targetBudget, setTargetBudget] = useState<number>(0);
  const [isBlindDropship, setIsBlindDropship] = useState(false);
  const [consumerName, setConsumerName] = useState('');
  const [consumerAddress, setConsumerAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
      const res = await fetch('/api-v2/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          targetProductId: stateObj.productId,
          quantity,
          targetBudget,
          isBlindDropship,
          dropshipConsumerName: isBlindDropship ? consumerName : null,
          dropshipConsumerAddress: isBlindDropship ? consumerAddress : null
        })
      });
      if (res.ok) {
        window.history.replaceState({}, document.title);
        fetchInquiries();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col gap-6">
      <div>
        <h3 className="text-3xl font-extrabold text-white mb-1">{t('Create New RFQ')}</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">{t('Product')}: <span className="font-semibold text-[var(--color-text-primary)]">{stateObj.title}</span></p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">{t('Target Quantity')}</label>
          <input type="number" min="1" required value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 w-full" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">{t('Target Budget (Per Unit, Optional)')}</label>
          <input type="number" min="0" value={targetBudget} onChange={e => setTargetBudget(parseInt(e.target.value))} className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 w-full" />
        </div>
      </div>

      <div className="p-4 bg-[var(--color-canvas)] rounded-xl border border-[var(--color-hairline)] space-y-3">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input type="checkbox" checked={isBlindDropship} onChange={e => setIsBlindDropship(e.target.checked)} className="w-5 h-5 text-[var(--color-accent)] rounded focus:ring-[var(--color-accent)]" />
          <div>
            <span className="font-semibold text-[var(--color-text-primary)] flex items-center"><EyeOff className="w-4 h-4 mr-2 text-[var(--color-accent)]"/> {t('Blind Dropshipping')}</span>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{t('Supplier will ship directly to your end-consumer with unbranded packing slips.')}</p>
          </div>
        </label>
        
        {isBlindDropship && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-[var(--color-hairline)] animate-in fade-in slide-in-from-top-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">{t('Consumer Full Name')}</label>
              <input type="text" required value={consumerName} onChange={e => setConsumerName(e.target.value)} className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 w-full text-sm py-1.5" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">{t('Full Shipping Address')}</label>
              <input type="text" required value={consumerAddress} onChange={e => setConsumerAddress(e.target.value)} className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 w-full text-sm py-1.5" placeholder="123 Main St, NY 10001, USA" />
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end pt-4">
        <button type="submit" disabled={submitting} className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold rounded-xl border border-cyan-400/30 transition-all shadow-lg shadow-cyan-500/20 px-4 py-2.5">
          {submitting ? 'Sending...' : 'Send RFQ to Supplier'}
        </button>
      </div>
    </form>
  );
}

export function RFQHub() {
  const [activeCall, setActiveCall] = useState<{inquiryId: number, recipientName: string, isAudioOnly: boolean} | null>(null);
    const [activeTab, setActiveTab] = useState('rfqs');
  const [subTab, setSubTab] = useState('All');
  const socketRef = React.useRef<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const { t } = useTranslation();
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, dbUser } = useAuth();
  const location = useLocation();



  useEffect(() => {
    if (activeTab === 'contacts' && user) {
       const uniqueUsers = new Map();
       inquiries.forEach(inq => {
          if (inq.buyer?.uid !== user.uid && inq.buyer) {
             if (!uniqueUsers.has(inq.buyer.id)) uniqueUsers.set(inq.buyer.id, { ...inq.buyer, latestInquiryId: inq.id });
          }
          if (inq.seller?.uid !== user.uid && inq.seller) {
             if (!uniqueUsers.has(inq.seller.id)) uniqueUsers.set(inq.seller.id, { ...inq.seller, latestInquiryId: inq.id });
          }
       });
       setContacts(Array.from(uniqueUsers.values()));
    }
  }, [activeTab, inquiries, user]);

  const fetchInquiries = async () => {
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
      const res = await fetch('/api-v2/inquiries', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setInquiries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchInquiries();
    
    if (!socketRef.current) socketRef.current = io();
    const socket = socketRef.current;
    socket.emit("join_user", user.uid);
    
    socket.on("inquiry_updated", () => {
       fetchInquiries();
    });
    
    return () => {
       socket.disconnect();
       socketRef.current = null;
    };
  }, [user]);


  const stateObj = location.state as any;

  return (
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 py-8">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 shrink-0">
        <h1 className="heading-xl mb-6">
          {t('Messages & RFQs')}
        </h1>
        
        <nav className="flex flex-col space-y-1">
           <button
             onClick={() => setActiveTab('rfqs')}
             className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'rfqs' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-canvas)]'}`}
           >
             <FileText className={`w-5 h-5 ${activeTab === 'rfqs' ? 'text-white/80' : 'text-slate-400'}`} />
             <span>{t('Active RFQs')}</span>
           </button>
           <button
             onClick={() => setActiveTab('messaging')}
             className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'messaging' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-canvas)]'}`}
           >
             <MessageSquare className={`w-5 h-5 ${activeTab === 'messaging' ? 'text-white/80' : 'text-slate-400'}`} />
             <span>{t('Messaging')}</span>
           </button>
           <button
             onClick={() => setActiveTab('contacts')}
             className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'contacts' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-canvas)]'}`}
           >
             <Users className={`w-5 h-5 ${activeTab === 'contacts' ? 'text-white/80' : 'text-slate-400'}`} />
             <span>{t('Business Contacts')}</span>
           </button>
        </nav>

        <div className="mt-8 pt-6 border-t border-[var(--color-hairline)]">
           <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
             {t('Manage your active Requests for Quotation, negotiate bulk pricing, and track sourcing milestones.')}
           </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-8">
       {activeTab === 'rfqs' && stateObj?.productId && (
         <RFQDraftForm stateObj={stateObj} user={user} fetchInquiries={fetchInquiries} />
       )}

       {activeTab === 'rfqs' && stateObj?.sampleCart && stateObj.sampleCart.length > 0 && (
         <div className="bg-slate-800 border border-slate-700 rounded-2xl bg-blue-50 border-blue-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
               <h3 className="text-2xl font-bold text-white text-blue-900">{t('Pending Sample Request')}</h3>
               <p className="text-blue-700 text-sm mt-1">You have {stateObj.sampleCart.length} samples ready to request from suppliers.</p>
            </div>
            <button 
              onClick={async () => {
                let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
                for (const item of stateObj.sampleCart) {
                  await fetch('/api-v2/inquiries', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                      targetProductId: item.productId,
                      quantity: 1,
                      targetBudget: 0
                    })
                  });
                }
                localStorage.removeItem('sample_cart');
                window.history.replaceState({}, document.title);
                fetchInquiries();
                window.location.reload();
              }}
              className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold rounded-xl border border-cyan-400/30 transition-all shadow-lg shadow-cyan-500/20"
            >
              Request All Samples
            </button>
         </div>
       )}

       {activeTab === 'rfqs' && (
       <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="border-b border-[var(--color-hairline)] bg-[var(--color-surface)] px-6 py-4 flex items-center gap-6 overflow-x-auto">
             <button onClick={() => setSubTab('All')} className={`text-sm pb-1 whitespace-nowrap transition-colors ${subTab === 'All' ? 'font-semibold text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]' : 'font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}>{t('All Active RFQs')}</button>
             <button onClick={() => setSubTab('Drafts')} className={`text-sm pb-1 whitespace-nowrap transition-colors ${subTab === 'Drafts' ? 'font-semibold text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]' : 'font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}>{t('Drafts')}</button>
             <button onClick={() => setSubTab('Negotiating')} className={`text-sm pb-1 whitespace-nowrap transition-colors ${subTab === 'Negotiating' ? 'font-semibold text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]' : 'font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}>{t('Under Negotiation')}</button>
             <button onClick={() => setSubTab('Closed')} className={`text-sm pb-1 whitespace-nowrap transition-colors ${subTab === 'Closed' ? 'font-semibold text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]' : 'font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}>{t('Closed')}</button>
          </div>
          <div className="divide-y divide-slate-100">
             {loading ? (
               <div className="p-8 text-center text-slate-400">{t('Loading RFQs...')}</div>
             ) : inquiries.length === 0 ? (
               <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                  <FileText className="w-12 h-12 text-slate-400 mb-4" />
                  <p className="font-medium text-slate-100">{t('No RFQs found.')}</p>
                  <p className="text-sm mt-1">{t('Generate RFQs using the AI Sourcing tool or browse the marketplace.')}</p>
                  <Link to="/marketplace" className="mt-6 px-5 py-2 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-500 shadow-lg shadow-cyan-900/50 transition-all">
                     Browse Marketplace
                  </Link>
               </div>
             ) : (
                Array.from(
                  (Array.isArray(inquiries) ? inquiries : []).reduce((acc, inq) => {
                     const otherParty = dbUser?.id === inq.inquiry.buyerId ? (inq.seller?.companyName || "Vendor") : (inq.buyer?.companyName || "Customer");
                     if (!acc.has(otherParty)) acc.set(otherParty, []);
                     acc.get(otherParty).push(inq);
                     return acc;
                  }, new Map())
                ).map(([company, companyInqs]: [string, any], idx) => (
                  <div key={idx} className="border-b border-slate-700 last:border-0 pb-4 mb-4 last:pb-0 last:mb-0">
                    <div className="bg-slate-900 px-6 py-2 border-y border-slate-700 mt-[-1px] font-semibold tracking-tight text-slate-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-7000"></span>
                      {company}
                    </div>
                    {companyInqs.map((inq: any, subIdx: number) => (
                  <div key={idx} className="p-6 hover:bg-slate-900 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6">
                     <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                           <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold tracking-tight uppercase tracking-wide">
                             {t(inq.inquiry.status)}
                           </span>
                           <span className="text-xs text-slate-400 font-medium">RFQ-{inq.inquiry.id.toString().padStart(6, '0')}</span>
                        </div>
                        <h3 className="font-semibold tracking-tight text-slate-100 text-lg">{inq.product?.title || "Custom AI Generated RFQ"}</h3>
                        {inq.buyer?.uid === user?.uid ? (
                          <p className="text-sm text-slate-400 mt-1">{t('Vendor')}: {inq.seller?.companyName || "Multiple matching vendors"}</p>
                        ) : (
                          <p className="text-sm text-slate-400 mt-1">{t('Customer')}: {inq.buyer?.companyName || inq.buyer?.displayName || "Buyer"}</p>
                        )}
                        {inq.inquiry.isBlindDropship && (
                           <span className="inline-flex items-center mt-2 px-2.5 py-1 text-xs font-semibold tracking-tight text-amber-700 bg-amber-100 rounded-lg border border-amber-200">
                             <EyeOff className="w-3 h-3 mr-1.5" /> Blind Dropship
                           </span>
                        )}
                     </div>
                     <div className="flex items-center gap-8">
                        <div>
                           <div className="text-xs text-slate-400 font-medium">{t('Target Qty')}</div>
                           <div className="font-semibold tracking-tight text-slate-100">{inq.inquiry.quantity.toLocaleString()} {t('units')}</div>
                        </div>
                        <div>
                           <div className="text-xs text-slate-400 font-medium">{t('Budget')}</div>
                           <div className="font-semibold tracking-tight text-slate-100">{inq.inquiry.currency || '€'} {inq.inquiry.targetBudget || t('Negotiable')}</div>
                        </div>
                        <Link to={`/rfq/${inq.inquiry.id}`} className="p-3 text-slate-400 hover:text-[#ffcc00] hover:bg-slate-700 rounded-xl transition-colors inline-block">
                           <ArrowRight className="w-5 h-5" />
                        </Link>
                     </div>
                  </div>
                    ))}
                  </div>
                ))
             )}
          </div>
       </div>
       )}

       {activeTab === 'messaging' && (
         <div className="bg-slate-800 border border-slate-700 rounded-2xl h-[700px] flex flex-col overflow-hidden">
           <div className="border-b border-slate-700 bg-slate-800 px-6 py-4 flex items-center justify-between">
             <h2 className="text-2xl font-bold text-white">{t('Unified Inbox')}</h2>
             <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>Live</span>
           </div>
           
           <div className="flex-1 overflow-y-auto bg-slate-900 p-4">
             <div className="grid gap-3">
               {(() => {
                 const uniqueInquiries = new Map();
                 inquiries.forEach((inq: any) => {
                    const otherParty = dbUser?.id === inq.inquiry.buyerId ? (inq.seller?.companyName || "Vendor") : (inq.buyer?.companyName || "Customer");
                    if (!uniqueInquiries.has(otherParty)) {
                       uniqueInquiries.set(otherParty, inq);
                    }
                 });
                 return Array.from(uniqueInquiries.values());
               })().map((inq: any, idx: number) => {
                 const otherParty = dbUser?.id === inq.inquiry.buyerId ? (inq.seller?.companyName || "Vendor") : (inq.buyer?.companyName || "Customer");
                 const latestMsg = inq.messages && inq.messages.length > 0 ? inq.messages[0] : null;
                 
                 return (
                 <Link key={idx} to={`/rfq/${inq.inquiry.id}`} className="flex items-center p-4 bg-slate-800 border border-slate-700 rounded-xl hover:border-cyan-500/50 hover:shadow-md transition-all group">
                   <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-[#ffcc00] mr-4 font-semibold text-lg">
                     {otherParty.charAt(0).toUpperCase()}
                   </div>
                   <div className="flex-1 overflow-hidden">
                     <div className="flex justify-between items-baseline mb-1">
                        <div className="font-semibold text-slate-100 group-hover:text-[#ffcc00] transition-colors truncate">
                          {otherParty}
                        </div>
                        {latestMsg && (
                           <div className="text-xs text-slate-400 shrink-0 ml-2">
                             {new Date(latestMsg.createdAt).toLocaleDateString()}
                           </div>
                        )}
                     </div>
                     <div className="text-xs font-semibold text-[#ffcc00] mb-1 truncate">
                       {inq.product?.title || t('Custom RFQ')}
                     </div>
                     <div className="text-sm text-slate-400 truncate">
                       {latestMsg ? (
                          <span className={latestMsg.readReceipt === false && latestMsg.senderId !== dbUser?.id ? "font-semibold text-slate-100" : ""}>
                            {latestMsg.senderId === dbUser?.id ? t('You: ') : ""}{latestMsg.messageContent || (latestMsg.attachmentUrl ? t('Attached a file') : t('Sent a quote'))}
                          </span>
                       ) : (
                          <span className="italic text-slate-400">{t('No messages yet. Start the negotiation.')}</span>
                       )}
                     </div>
                   </div>
                 </Link>
                 );
               })}
               {inquiries.length === 0 && (
                 <div className="text-center p-12 text-slate-400">
                    <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="font-medium">{t('No active conversations found.')}</p>
                 </div>
               )}
             </div>
           </div>
         </div>
       )}
       {activeTab === 'contacts' && (
         <div className="bg-slate-800 border border-slate-700 rounded-2xl min-h-[500px] overflow-hidden">
           <div className="border-b border-slate-700 bg-slate-800 px-6 py-4">
             <h2 className="text-2xl font-bold text-white">{t('Your Contacts')}</h2>
           </div>
           <div className="divide-y divide-hairline">
             {contacts.length === 0 ? (
               <div className="p-12 text-center text-slate-400">
                 <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                 <p className="font-semibold text-slate-100">{t('No contacts yet.')}</p>
                 <p className="text-sm mt-1">{t('Start an RFQ to connect with suppliers.')}</p>
               </div>
             ) : (
               contacts.map((contact: any) => (
                 <div key={contact.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900 transition-colors">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-[#ffcc00] border border-slate-700 font-semibold text-lg">
                       {(contact.companyName || contact.displayName || '?').charAt(0).toUpperCase()}
                     </div>
                     <div>
                       <h3 className="font-semibold text-slate-100">{contact.companyName ? `${contact.companyName} (${contact.displayName || 'User'})` : (contact.displayName || 'User')}</h3>
                       <p className="text-sm text-slate-400 font-medium mt-0.5">{t('Connected via RFQ')}</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-2 sm:self-end">
                     <Link to={`/company/${contact.id}`} className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all !p-2" title="View Products">
                       <Package className="w-4 h-4 text-slate-400" />
                     </Link>
                     <button 
                       onClick={() => {
                          if (contact.latestInquiryId) {
                             setActiveCall({ inquiryId: contact.latestInquiryId, recipientName: contact.companyName || contact.displayName, isAudioOnly: false });
                             socketRef.current?.emit("start_video_call", { inquiryId: contact.latestInquiryId, senderName: dbUser?.companyName || dbUser?.displayName || "User", isAudioOnly: false });
                          }
                       }} 
                       className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all !p-2" title="Video Call">
                       <Video className="w-4 h-4 text-slate-400" />
                     </button>
                     <button 
                       onClick={() => {
                          if (contact.latestInquiryId) {
                             setActiveCall({ inquiryId: contact.latestInquiryId, recipientName: contact.companyName || contact.displayName, isAudioOnly: true });
                             socketRef.current?.emit("start_video_call", { inquiryId: contact.latestInquiryId, senderName: dbUser?.companyName || dbUser?.displayName || "User", isAudioOnly: true });
                          }
                       }} 
                       className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all !p-2" title="Voice Call">
                       <Phone className="w-4 h-4 text-slate-400" />
                     </button>
                     {contact.latestInquiryId && (
                       <Link to={`/rfq/${contact.latestInquiryId}`} className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all !p-2" title="Message">
                         <MessageSquare className="w-4 h-4 text-slate-400" />
                       </Link>
                     )}
                   </div>
                 </div>
               ))
             )}
           </div>
         </div>
       )}
      </div>
      {activeCall && (
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
}
