const fs = require('fs');
let code = fs.readFileSync('src/pages/Feed.tsx', 'utf8');

// Replace MOCK_FEED array and all the static state with dynamic useQuery
code = code.replace(/const MOCK_FEED = \[[\s\S]*?\];\n/, '');

const queryImports = `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../components/AuthContext.tsx';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';\n`;

code = code.replace(/import { Link } from 'react-router-dom';\n/, "import { Link } from 'react-router-dom';\n" + queryImports);

const dynamicLogic = `  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
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
          'Authorization': \`Bearer \${await user?.getIdToken()}\`
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
  });`;

code = code.replace(/  const \{ t \} = useTranslation\(\);\n  const \[activeTab, setActiveTab\] = useState<[^>]+>\('info'\);\n  const \[postContent, setPostContent\] = useState\(''\);/, dynamicLogic);

// Replace MOCK_FEED.map with posts.map
code = code.replace(/MOCK_FEED\.map/g, 'posts.map');
// Replace post.timeAgo with formatDistanceToNow
code = code.replace(/\{post\.timeAgo\}/g, '{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}');

// Add budget input field for WTB tab
code = code.replace(/<div className="flex items-center justify-between mt-4">/, `
              {activeTab === 'wtb' && (
                <div className="mt-3">
                  <input type="text" placeholder="Target Budget (e.g., $100 / unit)" value={budget} onChange={e => setBudget(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500" />
                </div>
              )}
              <div className="flex items-center justify-between mt-4">`);

code = code.replace(/<button className=\{\`px-6 py-2 rounded-xl/g, '<button onClick={() => createPost.mutate()} disabled={createPost.isPending || !postContent} className={`px-6 py-2 rounded-xl');

fs.writeFileSync('src/pages/Feed.tsx', code);
console.log('Feed.tsx updated successfully');
