import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Building2, Package, Megaphone, Send, Image as ImageIcon, MapPin, BadgeCheck, Clock, MessageSquare, Heart, TrendingUp, Handshake, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../components/AuthContext.tsx';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';


export function Feed() {
  const { t } = useTranslation();
  const { user, dbUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeCommentPost, setActiveCommentPost] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");

  const likeMutation = useMutation({
    mutationFn: async (postId: number) => {
      const res = await fetch(`/api-v2/feed/${postId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${await user?.getIdToken()}` }
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feedPosts'] })
  });
  
  const commentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: number, content: string }) => {
      const res = await fetch(`/api-v2/feed/${postId}/comments`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${await user?.getIdToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedPosts'] });
      setCommentText("");
      setActiveCommentPost(null);
    }
  });

  const [activeTab, setActiveTab] = useState<'info' | 'listing' | 'wtb'>('info');
  const [postContent, setPostContent] = useState('');
  const [budget, setBudget] = useState('');

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['feedPosts'],
    queryFn: async () => {
      const res = await fetch('/api-v2/feed');
      if (!res.ok) throw new Error('Failed to load feed');
      return res.json();
    }
  });

  const createPost = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api-v2/feed', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`
        },
        body: JSON.stringify({ type: activeTab, content: postContent, budget, tags: activeTab === 'wtb' ? ['WTB'] : [] })
      });
      if (!res.ok) throw new Error('Failed to create post');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Posted successfully!');
      setPostContent('');
      setBudget('');
      queryClient.invalidateQueries({ queryKey: ['feedPosts'] });
    },
    onError: (err: any) => toast.error(err.message)
  });

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
              {dbUser?.profilePictureUrl ? (
                <img src={dbUser.profilePictureUrl} alt="Logo" className="w-full h-full rounded-full object-cover" />
              ) : (
                <Building2 className="w-8 h-8 text-white" />
              )}
            </div>
            <h2 className="text-lg font-bold text-white mb-1">{dbUser?.companyName || user?.displayName || 'Your Company'}</h2>
            <p className="text-sm text-slate-400 mb-4 flex items-center gap-1">
              {dbUser?.verificationStatus === 'verified' && <BadgeCheck className="w-4 h-4 text-cyan-500" />} {dbUser?.verificationStatus === 'verified' ? 'Verified Supplier' : 'Unverified'}
            </p>
            <div className="h-px bg-slate-800 w-full my-4"></div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Following</span>
                <span className="text-white font-semibold">{dbUser?.followersCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Connections</span>
                <span className="text-white font-semibold">{dbUser?.connectionsCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Profile Views</span>
                <span className="text-cyan-400 font-semibold">{dbUser?.profileViews || 0}</span>
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
              
              {activeTab === 'wtb' && (
                <div className="mt-3">
                  <input type="text" placeholder="Target Budget (e.g., $100 / unit)" value={budget} onChange={e => setBudget(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500" />
                </div>
              )}
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
                <button onClick={() => createPost.mutate()} disabled={createPost.isPending || !postContent} className={`px-6 py-2 rounded-xl font-bold text-white flex items-center gap-2 transition-transform active:scale-95 ${activeTab === 'wtb' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20' : activeTab === 'listing' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20' : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/20'} shadow-lg`}>
                  <Send className="w-4 h-4" />
                  Post
                </button>
              </div>
            </div>
          </div>

          {/* Feed Stream */}
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/20 hover:border-slate-700 transition-colors">
                
                {/* Post Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 overflow-hidden">
                      {post?.author?.avatar ? (
                        <img src={post.author.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-6 h-6 text-slate-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-200">{post?.author?.name || "Unknown"}</span>
                        {post?.author?.verified && <BadgeCheck className="w-4 h-4 text-cyan-500" />}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {formatDistanceToNow((post.createdAt ? new Date(post.createdAt) : new Date()), { addSuffix: true })}
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
                <p className="text-slate-300 leading-relaxed mb-4 whitespace-pre-wrap">
                  {(post.content || "").split(' ').map((word: string, i: number) => {
                    if (word.includes('youtu.be/') || word.includes('youtube.com/watch')) {
                       return <a key={i} href={word} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">{word} </a>;
                    }
                    return word + ' ';
                  })}
                </p>
                
                {/* Auto-embed YouTube */}
                {((post.content || "").includes('youtu.be/') || (post.content || "").includes('youtube.com/')) ? (() => {
                  const match = (post.content || "").match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
                  if (match && match[1]) {
                    return (
                      <div className="mb-4 rounded-xl overflow-hidden border border-slate-800">
                        <iframe 
                          className="w-full aspect-video" 
                          src={`https://www.youtube.com/embed/${match[1]}`} 
                          title="YouTube video" 
                          frameBorder="0" 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowFullScreen
                        ></iframe>
                      </div>
                    );
                  }
                  return null;
                })() : null}


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
