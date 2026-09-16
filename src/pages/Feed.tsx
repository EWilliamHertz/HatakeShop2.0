import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Building2, Package, Megaphone, Send, Image as ImageIcon, MapPin, BadgeCheck, Clock, MessageSquare, Heart, TrendingUp, Handshake, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const MOCK_FEED = [
  {
    id: 1,
    type: 'wtb',
    author: { name: 'CardVault EU', verified: true, avatar: null },
    content: 'URGENT: Looking for a supplier who can provide 500x One Piece OP-05 Booster Boxes by next Friday. Must be factory sealed and ready to ship to Germany.',
    tags: ['One Piece', 'Sealed', 'WTB'],
    budget: 'Negotiable (Target: $85/box)',
    timeAgo: '2h ago',
    likes: 12,
    comments: 4
  },
  {
    id: 2,
    type: 'listing',
    author: { name: 'TopBestPKG', verified: true, avatar: null },
    content: 'Just received a massive shipment of Premium Toploaders (35pt). Check out the new listing! Special wholesale pricing for orders over 100,000 units.',
    product: {
      title: 'Premium Toploader 35pt (Clear)',
      image: 'https://images.unsplash.com/photo-1605370392437-024097f5bc14?auto=format&fit=crop&w=400&q=80',
      price: '$0.05 / unit',
      moq: '5000 units'
    },
    timeAgo: '5h ago',
    likes: 34,
    comments: 2
  },
  {
    id: 3,
    type: 'info',
    author: { name: 'TCG Distributors LLC', verified: false, avatar: null },
    content: 'Market Update: We expect a massive delay on the upcoming Pokemon SV6 release due to port strikes. Advise all partners to secure their allocations early. We are currently fully booked but will open a waitlist tomorrow.',
    timeAgo: '1d ago',
    likes: 89,
    comments: 15
  }
];

export function Feed() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'info' | 'listing' | 'wtb'>('info');
  const [postContent, setPostContent] = useState('');

  return (
    <div className="min-h-screen bg-slate-950 pb-24 pt-24">
      <Helmet>
        <title>Social Feed | Hatake</title>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Sidebar (Profile & Stats) */}
        <div className="hidden lg:block lg:col-span-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sticky top-28 shadow-xl shadow-black/50">
            <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500 to-indigo-500 rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Your Company</h2>
            <p className="text-sm text-slate-400 mb-4 flex items-center gap-1">
              <BadgeCheck className="w-4 h-4 text-cyan-500" /> Verified Supplier
            </p>
            <div className="h-px bg-slate-800 w-full my-4"></div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Following</span>
                <span className="text-white font-semibold">124</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Connections</span>
                <span className="text-white font-semibold">89</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Profile Views</span>
                <span className="text-cyan-400 font-semibold">342</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Feed Column */}
        <div className="col-span-1 lg:col-span-6 space-y-6">
          
          {/* Composer */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
            <div className="flex border-b border-slate-800 bg-slate-900/50">
              <button 
                onClick={() => setActiveTab('info')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'info' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
              >
                <Megaphone className="w-4 h-4 inline-block mr-2 mb-0.5" />
                Update
              </button>
              <button 
                onClick={() => setActiveTab('listing')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'listing' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
              >
                <Package className="w-4 h-4 inline-block mr-2 mb-0.5" />
                New Listing
              </button>
              <button 
                onClick={() => setActiveTab('wtb')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'wtb' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
              >
                <Handshake className="w-4 h-4 inline-block mr-2 mb-0.5" />
                Want To Buy
              </button>
            </div>
            
            <div className="p-4">
              <textarea 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                rows={3}
                placeholder={
                  activeTab === 'info' ? "Share an update with your B2B network..." :
                  activeTab === 'listing' ? "Describe your new inventory (You can attach a product below)..." :
                  "What are you looking to buy? Include quantities and target prices..."
                }
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
              />
              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-2">
                  <button className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors">
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  {activeTab === 'listing' && (
                    <button className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors flex items-center gap-1 text-sm font-semibold">
                      <Package className="w-5 h-5" /> Attach Product
                    </button>
                  )}
                </div>
                <button className={`px-6 py-2 rounded-xl font-bold text-white flex items-center gap-2 transition-transform active:scale-95 ${activeTab === 'wtb' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20' : activeTab === 'listing' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20' : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/20'} shadow-lg`}>
                  <Send className="w-4 h-4" />
                  Post
                </button>
              </div>
            </div>
          </div>

          {/* Feed Stream */}
          <div className="space-y-6">
            {MOCK_FEED.map((post) => (
              <div key={post.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/20 hover:border-slate-700 transition-colors">
                
                {/* Post Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
                      <Building2 className="w-6 h-6 text-slate-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-200">{post.author.name}</span>
                        {post.author.verified && <BadgeCheck className="w-4 h-4 text-cyan-500" />}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {post.timeAgo}
                      </div>
                    </div>
                  </div>
                  {post.type === 'wtb' && (
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
                      Bounty / WTB
                    </span>
                  )}
                  {post.type === 'listing' && (
                    <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
                      New Inventory
                    </span>
                  )}
                </div>

                {/* Post Content */}
                <p className="text-slate-300 leading-relaxed mb-4">
                  {post.content}
                </p>

                {/* Specific Attachments based on Type */}
                {post.type === 'wtb' && post.budget && (
                  <div className="mb-4 bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 rounded-lg"><Handshake className="w-5 h-5 text-amber-500" /></div>
                    <div>
                      <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Target Budget</div>
                      <div className="text-amber-400 font-bold">{post.budget}</div>
                    </div>
                  </div>
                )}

                {post.type === 'listing' && post.product && (
                  <div className="mb-4 bg-slate-950 border border-slate-800 rounded-xl p-3 flex gap-4 hover:border-slate-700 transition-colors cursor-pointer group">
                    <div className="w-24 h-24 bg-slate-900 rounded-lg overflow-hidden shrink-0 border border-slate-800 relative">
                      <img src={post.product.image} alt={post.product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="flex flex-col justify-center">
                      <h4 className="font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">{post.product.title}</h4>
                      <div className="flex gap-3 text-sm">
                        <span className="text-slate-400"><span className="text-slate-500">Price:</span> {post.product.price}</span>
                        <span className="text-slate-400"><span className="text-slate-500">MOQ:</span> {post.product.moq}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer / Actions */}
                <div className="border-t border-slate-800/60 pt-4 flex items-center justify-between">
                  <div className="flex gap-4">
                    <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-rose-400 transition-colors">
                      <Heart className="w-4 h-4" /> {post.likes}
                    </button>
                    <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors">
                      <MessageSquare className="w-4 h-4" /> {post.comments}
                    </button>
                  </div>
                  
                  {post.type === 'wtb' && (
                    <button className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 font-semibold text-xs px-4 py-1.5 rounded-lg border border-amber-600/30 transition-colors">
                      Submit Bid
                    </button>
                  )}
                  {post.type === 'listing' && (
                    <button className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 font-semibold text-xs px-4 py-1.5 rounded-lg border border-indigo-600/30 transition-colors">
                      View Listing
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar (Trending) */}
        <div className="hidden xl:block lg:col-span-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sticky top-28 shadow-xl shadow-black/50">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" /> Trending Bounties
            </h3>
            
            <div className="space-y-4">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">
                <div className="text-xs text-cyan-400 font-bold mb-1">WTB • 500 units</div>
                <div className="text-sm font-semibold text-slate-200 line-clamp-2 mb-2">Pokemon 151 JP Booster Boxes</div>
                <div className="text-xs text-slate-500 flex justify-between items-center">
                  <span>Target: $120/ea</span>
                  <span className="text-slate-600">4 bids</span>
                </div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">
                <div className="text-xs text-cyan-400 font-bold mb-1">WTB • 1 Pallet</div>
                <div className="text-sm font-semibold text-slate-200 line-clamp-2 mb-2">Paldea Evolved ETBs</div>
                <div className="text-xs text-slate-500 flex justify-between items-center">
                  <span>Target: $28/ea</span>
                  <span className="text-slate-600">12 bids</span>
                </div>
              </div>
            </div>

            <button className="w-full mt-4 py-2 border border-slate-700 text-slate-400 rounded-xl text-sm font-semibold hover:bg-slate-800 hover:text-white transition-colors">
              View All Bounties
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
