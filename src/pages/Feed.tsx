import React, { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Building2, Package, Megaphone, Send, Image as ImageIcon, MapPin, BadgeCheck, Clock, MessageSquare, Heart, TrendingUp, Handshake, Search, Trash2, X, Reply } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../components/AuthContext.tsx';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';



const PostComments = ({ postId, currentUser, dbUser, onDeleteComment, onReply }: any) => {
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['feedComments', postId],
    queryFn: async () => {
      const res = await fetch(`/api-v2/feed/${postId}/comments`);
      return res.json();
    }
  });
  if (isLoading) return <div className="text-slate-500 text-xs py-2">Loading comments...</div>;
  if (comments.length === 0) return <div className="text-slate-500 text-xs py-2">No comments yet.</div>;
  return (
    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
      {comments.map((c: any) => (
        <div key={c.id} className="flex gap-3 bg-slate-950/50 p-3 rounded-lg border border-slate-800">
           <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center border border-slate-700">
             {c.author?.avatar ? <img src={c.author.avatar} className="w-full h-full object-cover"/> : <span className="text-xs font-bold text-slate-400">{c.author?.name?.charAt(0) || 'U'}</span>}
           </div>
           <div className="flex-1 min-w-0">
             <div className="flex items-center justify-between">
               <span className="font-bold text-slate-200 text-sm truncate">{c.author?.name || 'Unknown User'}</span>
               <div className="flex items-center gap-3 shrink-0 ml-2">
                 <button onClick={() => onReply(c.author?.name || 'User')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-cyan-400 transition-colors"><Reply className="w-3 h-3"/> Reply</button>
                 {(dbUser?.id === c.author?.id || dbUser?.role === 'admin') && (
                   <button onClick={() => onDeleteComment(c.id)} className="text-xs text-slate-500 hover:text-rose-400 transition-colors" title="Delete Comment"><Trash2 className="w-3 h-3"/></button>
                 )}
               </div>
             </div>
             <p className="text-sm text-slate-300 mt-1 whitespace-pre-wrap">{c.content}</p>
           </div>
        </div>
      ))}
    </div>
  );
};

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
    onSuccess: () => {
       // We're handling the UI optimism with likedPosts set, but we can also refetch in background
       queryClient.invalidateQueries({ queryKey: ['feedPosts'] })
    }
  });
  
  const handleLike = (postId: number) => {
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
    likeMutation.mutate(postId);
  };
  
  
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
  const [feedMode, setFeedMode] = useState<'public' | 'network'>('public');
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [postContent, setPostContent] = useState('');
  const [budget, setBudget] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [showProductSelect, setShowProductSelect] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const { data: myProducts = [] } = useQuery({
    queryKey: ['myProducts'],
    queryFn: async () => {
      const res = await fetch(`/api-v2/seller/products`, { headers: { 'Authorization': `Bearer ${await user?.getIdToken()}` } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const apiKey = import.meta.env.VITE_IMGBB_API_KEY || '6f1a5bbe6a6a3a4fb49fd2f8b303d8f5';
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setImageUrl(data.data.url);
        toast.success("Image uploaded!");
      } else {
        toast.error("Failed to upload image.");
      }
    } catch (err) {
      toast.error("Error uploading image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const deletePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      const res = await fetch(`/api-v2/feed/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${await user?.getIdToken()}` }
      });
      if (!res.ok) throw new Error('Failed to delete post');
      return res.json();
    },
    onSuccess: () => {
      toast.success("Post deleted");
      queryClient.invalidateQueries({ queryKey: ['feedPosts', feedMode] });
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const res = await fetch(`/api-v2/feed/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${await user?.getIdToken()}` }
      });
      if (!res.ok) throw new Error('Failed to delete comment');
      return res.json();
    },
    onSuccess: () => {
      toast.success("Comment deleted");
      queryClient.invalidateQueries({ queryKey: ['feedComments'] });
      queryClient.invalidateQueries({ queryKey: ['feedPosts', feedMode] });
    }
  });


  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['feedPosts', feedMode],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api-v2/feed?mode=${feedMode}`, { headers });
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
        body: JSON.stringify({ type: activeTab, content: postContent, budget, tags: activeTab === 'wtb' ? ['WTB'] : [], imageUrl, productId: selectedProductId })
      });
      if (!res.ok) throw new Error('Failed to create post');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Posted successfully!');
      setPostContent('');
      setBudget('');
      setImageUrl('');
      setSelectedProductId(null);
      setShowProductSelect(false);
      queryClient.invalidateQueries({ queryKey: ['feedPosts', feedMode] });
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
                <span className="text-white font-semibold">{dbUser?.followingCount || 0}</span>
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
                Public
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
                <div className="flex flex-col gap-3 w-full max-w-sm">
                  {(imageUrl || isUploadingImage) && (
                    <div className="relative w-24 h-24 bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
                      {isUploadingImage ? (
                         <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">Uploading...</div>
                      ) : (
                        <>
                         <img src={imageUrl} alt="Upload" className="w-full h-full object-cover" />
                         <button onClick={() => setImageUrl('')} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-rose-500"><X className="w-3 h-3" /></button>
                        </>
                      )}
                    </div>
                  )}
                  {selectedProductId && (
                    <div className="bg-indigo-500/10 border border-indigo-500/30 p-2 rounded-lg flex items-center justify-between text-sm text-indigo-400">
                      <span>Product Attached ID: {selectedProductId}</span>
                      <button onClick={() => setSelectedProductId(null)} className="text-slate-400 hover:text-rose-400"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                  {showProductSelect && (
                    <select 
                      onChange={(e) => { setSelectedProductId(Number(e.target.value)); setShowProductSelect(false); }}
                      className="bg-slate-900 border border-slate-700 text-sm text-white rounded-lg p-2"
                    >
                      <option value="">Select a Product...</option>
                      {myProducts.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  )}

                  <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors" title="Attach Image">
                      <ImageIcon className="w-5 h-5" />
                    </button>
                    {activeTab === 'listing' && (
                      <button onClick={() => setShowProductSelect(!showProductSelect)} className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors flex items-center gap-1 text-sm font-semibold">
                        <Package className="w-5 h-5" /> Attach Product
                      </button>
                    )}
                  </div>
                </div>
                <button onClick={() => createPost.mutate()} disabled={createPost.isPending || !postContent} className={`px-6 py-2 rounded-xl font-bold text-white flex items-center gap-2 transition-transform active:scale-95 ${activeTab === 'wtb' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20' : activeTab === 'listing' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20' : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/20'} shadow-lg`}>
                  <Send className="w-4 h-4" />
                  Post
                </button>
              </div>
            </div>
          </div>

          {/* Feed Stream */}
          <div className="flex gap-4 mb-4 border-b border-slate-800 pb-2">
            <button onClick={() => setFeedMode('public')} className={`font-bold transition-colors ${feedMode === 'public' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>Global / Public</button>
            <button onClick={() => setFeedMode('network')} className={`font-bold transition-colors ${feedMode === 'network' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>Network</button>
          </div>
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/20 hover:border-slate-700 transition-colors">
                
                {/* Post Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Link to={`/company/${post?.author?.id}`} className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 overflow-hidden hover:opacity-80 transition-opacity shrink-0">
                      {post?.author?.avatar ? (
                        <img src={post.author.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-6 h-6 text-slate-500" />
                      )}
                    </Link>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Link to={`/company/${post?.author?.id}`} className="font-bold text-slate-200 hover:text-cyan-400 transition-colors">
                          {post?.author?.name || "Unknown"}
                        </Link>
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
                  {(post?.author?.id === dbUser?.id || dbUser?.role === 'admin') && (
                    <button onClick={() => { if(confirm('Delete this post?')) deletePostMutation.mutate(post.id); }} className="text-slate-500 hover:text-rose-500 transition-colors ml-4 shrink-0">
                       <Trash2 className="w-4 h-4" />
                    </button>
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


                {post.imageUrl && (
                  <div className="mb-4 rounded-xl overflow-hidden border border-slate-800 max-h-96">
                    <img src={post.imageUrl} alt="Attachment" className="w-full h-full object-contain bg-slate-950" />
                  </div>
                )}
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
                <div className="border-t border-slate-800/60 pt-4 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-4">
                      <button 
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center gap-2 text-sm transition-colors ${likedPosts.has(post.id) ? 'text-rose-500' : 'text-slate-400 hover:text-rose-400'}`}
                      >
                        <Heart className={`w-4 h-4 ${likedPosts.has(post.id) ? 'fill-rose-500' : ''}`} /> {post.likesCount || 0}
                      </button>
                      <button 
                        onClick={() => setActiveCommentPost(activeCommentPost === post.id ? null : post.id)}
                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" /> {post.commentsCount || 0}
                      </button>
                      <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                        <Send className="w-4 h-4" /> {t('Share')}
                      </button>
                      
                      {post.type === 'wtb' && (
                        <Link to="/rfq" className="flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400 font-bold ml-auto transition-colors">
                          <Handshake className="w-4 h-4" /> Fulfill Bounty
                        </Link>
                      )}
                      
                      {post.type === 'listing' && (
                        <Link to="/rfq" className="flex items-center gap-2 text-sm text-indigo-500 hover:text-indigo-400 font-bold ml-auto transition-colors">
                          <MessageSquare className="w-4 h-4" /> Contact Seller
                        </Link>
                      )}
                    </div>
                  </div>
                  
                  {activeCommentPost === post.id && (
                    <div className="mt-4 pt-4 border-t border-slate-800/50 w-full flex flex-col">
                       <PostComments 
                         postId={post.id} 
                         currentUser={user} 
                         dbUser={dbUser} 
                         onDeleteComment={(cid) => { if(confirm('Delete comment?')) deleteCommentMutation.mutate(cid); }} 
                         onReply={(name) => setCommentText(`@${name} `)}
                       />
                       <div className="mt-3 flex gap-2 w-full">
                         <input 
                           type="text"
                           value={commentText}
                           onChange={(e) => setCommentText(e.target.value)}
                           placeholder="Write a comment..."
                           className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                           onKeyDown={(e) => {
                             if (e.key === 'Enter' && commentText.trim()) {
                               commentMutation.mutate({ postId: post.id, content: commentText.trim() });
                             }
                           }}
                         />
                         <button 
                           onClick={() => {
                             if (commentText.trim()) {
                               commentMutation.mutate({ postId: post.id, content: commentText.trim() });
                             }
                           }}
                           className="bg-cyan-500 text-slate-950 px-4 py-2 rounded-lg text-sm font-bold hover:bg-cyan-400 transition-colors shrink-0"
                         >
                           Send
                         </button>
                       </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar (Trending) */}
        <div className="hidden xl:block lg:col-span-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sticky top-28 shadow-xl shadow-black/50 text-center">
            <h3 className="font-bold text-white mb-2 flex items-center justify-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" /> Market Activity
            </h3>
            <p className="text-sm text-slate-500">
              Live marketplace activity will appear here as the network grows.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
