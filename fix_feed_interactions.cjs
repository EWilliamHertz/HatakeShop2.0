const fs = require('fs');
let code = fs.readFileSync('src/pages/Feed.tsx', 'utf8');

// 1. Link Author Avatar & Name to /company/:id
const oldHeader = `
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
`;

const newHeader = `
                    <Link to={\`/company/\${post?.author?.id}\`} className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 overflow-hidden hover:opacity-80 transition-opacity shrink-0">
                      {post?.author?.avatar ? (
                        <img src={post.author.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-6 h-6 text-slate-500" />
                      )}
                    </Link>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Link to={\`/company/\${post?.author?.id}\`} className="font-bold text-slate-200 hover:text-cyan-400 transition-colors">
                          {post?.author?.name || "Unknown"}
                        </Link>
                        {post?.author?.verified && <BadgeCheck className="w-4 h-4 text-cyan-500" />}
                      </div>
`;

code = code.replace(oldHeader.trim(), newHeader.trim());

// 2. Fix Like and Comment Buttons
const oldFooter = `
                {/* Footer / Actions */}
                <div className="border-t border-slate-800/60 pt-4 flex items-center justify-between">
                  <div className="flex gap-4">
                    <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-rose-400 transition-colors">
                      <Heart className="w-4 h-4" /> {post.likes}
                    </button>
                    <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors">
                      <MessageSquare className="w-4 h-4" /> {post.comments}
                    </button>
                    <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                      <Send className="w-4 h-4" /> {t('Share')}
                    </button>
                  </div>
                </div>
`;

const newFooter = `
                {/* Footer / Actions */}
                <div className="border-t border-slate-800/60 pt-4 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-4">
                      <button 
                        onClick={() => likeMutation.mutate(post.id)}
                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Heart className="w-4 h-4" /> {post.likesCount ?? post.likes ?? 0}
                      </button>
                      <button 
                        onClick={() => setActiveCommentPost(activeCommentPost === post.id ? null : post.id)}
                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" /> {post.commentsCount ?? post.comments ?? 0}
                      </button>
                      <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                        <Send className="w-4 h-4" /> {t('Share')}
                      </button>
                    </div>
                  </div>
                  
                  {activeCommentPost === post.id && (
                    <div className="mt-2 flex gap-2 w-full">
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
                  )}
                </div>
`;

// Fallback logic if the exact string doesn't match
if (code.includes('Footer / Actions')) {
  // Use regex to replace everything from {/* Footer / Actions */} to the end of the post div
  const regex = /\{\/\* Footer \/ Actions \*\/\}.*?<\/div>\s*<\/div>/s;
  code = code.replace(regex, newFooter.trim() + "\n              </div>");
}

fs.writeFileSync('src/pages/Feed.tsx', code);
console.log('Feed.tsx updated successfully.');
