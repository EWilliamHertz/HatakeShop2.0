import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from './AuthContext.tsx';
import { toast } from 'sonner';

export function WishlistButton({ productId }: { productId: number }) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const checkWishlist = async () => {
      try {
        let token = await user.getIdToken();
        const res = await fetch('/api-v2/wishlists', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const items = await res.json();
          setIsSaved(items.some((item: any) => item.productId === productId));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    checkWishlist();
  }, [user, productId]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent opening product modal
    if (!user) {
      toast.error('Please log in to save items to your wishlist.');
      return;
    }
    try {
      let token = await user.getIdToken();
      const res = await fetch('/api-v2/wishlists/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId })
      });
      if (res.ok) {
        const data = await res.json();
        setIsSaved(data.saved);
        if (data.saved) toast.success('Added to wishlist');
        else toast.success('Removed from wishlist');
      }
    } catch (err: any) {
      toast.error('Failed to update wishlist');
    }
  };

  return (
    <button
      onClick={toggleWishlist}
      disabled={loading}
      className={`absolute top-3 left-3 z-20 p-2 rounded-full transition-colors ${isSaved ? 'bg-rose-100 text-rose-500' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'} backdrop-blur-sm border border-slate-700 shadow-sm`}
    >
      <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
    </button>
  );
}
