const fs = require('fs');
let code = fs.readFileSync('src/pages/Feed.tsx', 'utf8');

const youtubeEmbed = `
                {/* Post Content */}
                <p className="text-slate-300 leading-relaxed mb-4 whitespace-pre-wrap">
                  {post.content.split(' ').map((word: string, i: number) => {
                    if (word.includes('youtu.be/') || word.includes('youtube.com/watch')) {
                       return <a key={i} href={word} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">{word} </a>;
                    }
                    return word + ' ';
                  })}
                </p>
                
                {/* Auto-embed YouTube */}
                {post.content.includes('youtu.be/') || post.content.includes('youtube.com/') ? (
                  <div className="mb-4 rounded-xl overflow-hidden border border-slate-800">
                    <iframe 
                      className="w-full aspect-video" 
                      src={
                        post.content.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)?.[0]
                          ? \`https://www.youtube.com/embed/\${post.content.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/[1]}\`
                          : ''
                      } 
                      title="YouTube video" 
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                    ></iframe>
                  </div>
                ) : null}
`;

code = code.replace(/<p className="text-slate-300 leading-relaxed mb-4">\s*\{post\.content\}\s*<\/p>/, youtubeEmbed);

fs.writeFileSync('src/pages/Feed.tsx', code);
console.log('Feed.tsx updated for Youtube');
