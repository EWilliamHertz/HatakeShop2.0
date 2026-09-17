const fs = require('fs');
let code = fs.readFileSync('src/pages/Feed.tsx', 'utf8');

// Fix Building2 overriding avatar
const oldAvatar = `
                    <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
                      <Building2 className="w-6 h-6 text-slate-500" />
                    </div>`;
                    
const newAvatar = `
                    <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 overflow-hidden">
                      {post?.author?.avatar ? (
                        <img src={post.author.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-6 h-6 text-slate-500" />
                      )}
                    </div>`;
code = code.replace(oldAvatar, newAvatar);

// Add state for comments and like/comment mutations
const stateInjection = `
  const [activeCommentPost, setActiveCommentPost] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");

  const likeMutation = useMutation({
    mutationFn: async (postId: number) => {
      const res = await fetch(\`/api-v2/feed/\${postId}/like\`, {
        method: 'POST',
        headers: { 'Authorization': \`Bearer \${await user?.getIdToken()}\` }
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feedPosts'] })
  });
  
  const commentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: number, content: string }) => {
      const res = await fetch(\`/api-v2/feed/\${postId}/comments\`, {
        method: 'POST',
        headers: { 
          'Authorization': \`Bearer \${await user?.getIdToken()}\`,
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
`;

if (!code.includes('activeCommentPost')) {
  code = code.replace(/const queryClient = useQueryClient\(\);/, 'const queryClient = useQueryClient();' + stateInjection);
}

// Update Action Buttons
const oldActions = `
                <div className="flex items-center gap-6 pt-4 border-t border-slate-800">
                  <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-rose-400 transition-colors">
                    <Heart className="w-4 h-4" /> {post.likesCount}
                  </button>
                  <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors">
                    <MessageSquare className="w-4 h-4" /> {post.commentsCount}
                  </button>
                  <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                    <Send className="w-4 h-4" /> {t('Share')}
                  </button>
                </div>
`;

const newActions = `
                <div className="flex flex-col pt-4 border-t border-slate-800">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => likeMutation.mutate(post.id)}
                      className="flex items-center gap-2 text-sm text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <Heart className="w-4 h-4" /> {post.likesCount}
                    </button>
                    <button 
                      onClick={() => setActiveCommentPost(activeCommentPost === post.id ? null : post.id)}
                      className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" /> {post.commentsCount}
                    </button>
                    <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                      <Send className="w-4 h-4" /> {t('Share')}
                    </button>
                  </div>
                  
                  {activeCommentPost === post.id && (
                    <div className="mt-4 flex gap-2">
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
                        className="bg-cyan-500 text-slate-950 px-4 py-2 rounded-lg text-sm font-bold hover:bg-cyan-400 transition-colors"
                      >
                        Send
                      </button>
                    </div>
                  )}
                </div>
`;

code = code.replace(oldActions.trim(), newActions.trim());

fs.writeFileSync('src/pages/Feed.tsx', code);
console.log('Feed.tsx updated with like and comment logic');
