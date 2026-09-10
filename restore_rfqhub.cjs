const fs = require('fs');

const code = `import { EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext.tsx';
import { MessageSquare, Clock, FileText, ArrowRight, Phone, Video, Users, User, Package } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';

function RFQDraftForm({ stateObj, user, fetchInquiries }: any) {
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
      const token = await user?.getIdToken();
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
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
    <form onSubmit={handleSubmit} className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl flex flex-col gap-4">
      <div>
        <h3 className="font-bold text-indigo-900 text-lg">Create New RFQ</h3>
        <p className="text-indigo-700 text-sm mt-1">Product: <span className="font-semibold">{stateObj.title}</span></p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-indigo-900 mb-1">Target Quantity</label>
          <input type="number" min="1" required value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} className="w-full px-4 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-bold text-indigo-900 mb-1">Target Budget (Per Unit, Optional)</label>
          <input type="number" min="0" value={targetBudget} onChange={e => setTargetBudget(parseInt(e.target.value))} className="w-full px-4 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
      </div>

      <div className="p-4 bg-white rounded-lg border border-indigo-100 space-y-3">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input type="checkbox" checked={isBlindDropship} onChange={e => setIsBlindDropship(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
          <div>
            <span className="font-bold text-slate-800 flex items-center"><EyeOff className="w-4 h-4 mr-2 text-indigo-500"/> Blind Dropshipping</span>
            <p className="text-xs text-slate-500">Supplier will ship directly to your end-consumer with unbranded packing slips.</p>
          </div>
        </label>
        
        {isBlindDropship && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Consumer Full Name</label>
              <input type="text" required value={consumerName} onChange={e => setConsumerName(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Shipping Address</label>
              <input type="text" required value={consumerAddress} onChange={e => setConsumerAddress(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="123 Main St, NY 10001, USA" />
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-sm">
          {submitting ? 'Sending...' : 'Send RFQ to Supplier'}
        </button>
      </div>
    </form>
  );
}

export function RFQHub() {
  const [activeTab, setActiveTab] = useState('rfqs');
  const [contacts, setContacts] = useState<any[]>([]);
  const { t } = useTranslation();
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    fetchInquiries();
    
    if (user) {
      const socket = io();
      socket.emit("join_user", user.uid);
      
      socket.on("inquiry_updated", () => {
         fetchInquiries();
      });
      
      return () => {
         socket.disconnect();
      };
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'contacts' && user) {
       const uniqueUsers = new Map();
       inquiries.forEach(inq => {
          if (inq.buyer?.uid !== user.uid && inq.buyer) uniqueUsers.set(inq.buyer.id, inq.buyer);
          if (inq.seller?.uid !== user.uid && inq.seller) uniqueUsers.set(inq.seller.id, inq.seller);
       });
       setContacts(Array.from(uniqueUsers.values()));
    }
  }, [activeTab, inquiries, user]);

  const fetchInquiries = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/inquiries', {
        headers: { 'Authorization': \`Bearer \${token}\` }
      });
      const data = await res.json();
      setInquiries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const stateObj = location.state as any;

  return (
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-72 shrink-0">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
          Messages & RFQs
        </h1>
        
        <nav className="flex flex-col space-y-1">
           <button
             onClick={() => setActiveTab('rfqs')}
             className={\`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all \${activeTab === 'rfqs' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}\`}
           >
             <FileText className={\`w-5 h-5 \${activeTab === 'rfqs' ? 'text-indigo-200' : 'text-slate-400'}\`} />
             <span>Active RFQs</span>
           </button>
           <button
             onClick={() => setActiveTab('contacts')}
             className={\`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all \${activeTab === 'contacts' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}\`}
           >
             <Users className={\`w-5 h-5 \${activeTab === 'contacts' ? 'text-indigo-200' : 'text-slate-400'}\`} />
             <span>Business Contacts</span>
           </button>
        </nav>

        <div className="mt-8 pt-6 border-t border-slate-200">
           <p className="text-sm text-slate-500">
             Manage your active Requests for Quotation, negotiate bulk pricing, and track sourcing milestones.
           </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-8">
       {activeTab === 'rfqs' && stateObj?.productId && (
         <RFQDraftForm stateObj={stateObj} user={user} fetchInquiries={fetchInquiries} />
       )}

       {activeTab === 'rfqs' && stateObj?.sampleCart && stateObj.sampleCart.length > 0 && (
         <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl flex items-center justify-between">
            <div>
               <h3 className="font-bold text-emerald-900">Pending Sample Request</h3>
               <p className="text-emerald-700 text-sm mt-1">You have {stateObj.sampleCart.length} samples ready to request from suppliers.</p>
            </div>
            <button 
              onClick={async () => {
                const token = await user?.getIdToken();
                for (const item of stateObj.sampleCart) {
                  await fetch('/api/inquiries', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
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
              className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-sm"
            >
              Request All Samples
            </button>
         </div>
       )}

       {activeTab === 'rfqs' && (
       <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center gap-4">
             <button className="text-sm font-bold text-slate-900 border-b-2 border-slate-900 pb-1">All Active RFQs</button>
             <button className="text-sm font-medium text-slate-500 hover:text-slate-900 pb-1">Drafts</button>
             <button className="text-sm font-medium text-slate-500 hover:text-slate-900 pb-1">Under Negotiation</button>
             <button className="text-sm font-medium text-slate-500 hover:text-slate-900 pb-1">Closed</button>
          </div>
          <div className="divide-y divide-slate-100">
             {loading ? (
               <div className="p-8 text-center text-slate-500">Loading RFQs...</div>
             ) : inquiries.length === 0 ? (
               <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                  <FileText className="w-12 h-12 text-slate-300 mb-4" />
                  <p className="font-medium text-slate-900">No RFQs found.</p>
                  <p className="text-sm mt-1">Generate RFQs using the AI Sourcing tool or browse the marketplace.</p>
                  <Link to="/ai-sourcing" className="mt-6 px-5 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700">
                     Try AI Sourcing
                  </Link>
               </div>
             ) : (
                (Array.isArray(inquiries) ? inquiries : []).map((inq, idx) => (
                  <div key={idx} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6">
                     <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                           <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wide">
                             {inq.inquiry.status}
                           </span>
                           <span className="text-xs text-slate-500 font-medium">RFQ-{inq.inquiry.id.toString().padStart(6, '0')}</span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg">{inq.product?.title || "Custom AI Generated RFQ"}</h3>
                        {inq.buyer?.uid === user?.uid ? (
                          <p className="text-sm text-slate-600 mt-1">Vendor: {inq.seller?.companyName || "Multiple matching vendors"}</p>
                        ) : (
                          <p className="text-sm text-slate-600 mt-1">Customer: {inq.buyer?.companyName || inq.buyer?.displayName || "Buyer"}</p>
                        )}
                        {inq.inquiry.isBlindDropship && (
                           <span className="inline-flex items-center mt-2 px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-100 rounded-md border border-amber-200">
                             <EyeOff className="w-3 h-3 mr-1.5" /> Blind Dropship
                           </span>
                        )}
                     </div>
                     <div className="flex items-center gap-8">
                        <div>
                           <div className="text-xs text-slate-500 font-medium">Target Qty</div>
                           <div className="font-bold text-slate-900">{inq.inquiry.quantity.toLocaleString()} units</div>
                        </div>
                        <div>
                           <div className="text-xs text-slate-500 font-medium">Budget</div>
                           <div className="font-bold text-slate-900">{inq.inquiry.currency || '€'} {inq.inquiry.targetBudget || 'Negotiable'}</div>
                        </div>
                        <Link to={\`/rfq/\${inq.inquiry.id}\`} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-block">
                           <ArrowRight className="w-5 h-5" />
                        </Link>
                     </div>
                  </div>
                ))
             )}
          </div>
       </div>
       )}

       {activeTab === 'contacts' && (
         <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm min-h-[500px]">
           <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
             <h2 className="font-bold text-slate-800">Your Contacts</h2>
           </div>
           <div className="divide-y divide-slate-100">
             {contacts.length === 0 ? (
               <div className="p-12 text-center text-slate-500">
                 <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                 <p className="font-medium">No contacts yet.</p>
                 <p className="text-sm mt-1">Start an RFQ to connect with suppliers.</p>
               </div>
             ) : (
               contacts.map((contact: any) => (
                 <div key={contact.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-lg">
                       {(contact.companyName || contact.displayName || '?').charAt(0).toUpperCase()}
                     </div>
                     <div>
                       <h3 className="font-bold text-slate-900">{contact.companyName || contact.displayName}</h3>
                       <p className="text-sm text-slate-500">Connected via RFQ</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <Link to={\`/company/\${contact.id}\`} className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-colors" title="View Products">
                       <Package className="w-4 h-4" />
                     </Link>
                     <button className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-colors" title="Video Call">
                       <Video className="w-4 h-4" />
                     </button>
                     <button className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-colors" title="Voice Call">
                       <Phone className="w-4 h-4" />
                     </button>
                     <button className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-colors" title="Message">
                       <MessageSquare className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
               ))
             )}
           </div>
         </div>
       )}
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/pages/RFQHub.tsx', code);
