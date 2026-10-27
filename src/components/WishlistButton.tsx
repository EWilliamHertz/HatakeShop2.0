import React from 'react';
import { Heart } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext.tsx';
import { toast } from 'sonner';

export async function fetchUserWishlistItems(user: any): Promise<any[]> {
  if (!user) return [];
  const token = await user.getIdToken();
  const res = await fetch('/api-v2/wishlists', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error(`Wishlist fetch failed (${res.status})`);
  }
  const items = await res.json();
  return Array.isArray(items) ? items : [];
}

export function WishlistButton({ productId }: { productId: number }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: wishlistItems = [], isLoading } = useQuery({
    queryKey: ['wishlists', user?.uid || 'guest'],
    queryFn: () => fetchUserWishlistItems(user),
    enabled: !!user,
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const isSaved = Boolean(
    user && productId && wishlistItems.some((item: any) => Number(item?.productId) === Number(productId))
  );

  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      const res = await fetch('/api-v2/wishlists/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId })
      });
      if (!res.ok) throw new Error('Failed to update wishlist');
      return res.json();
    },
    onSuccess: (data) => {
      const key = ['wishlists', user?.uid || 'guest'];
      queryClient.setQueryData(key, (prev: any[] | undefined) => {
        const list = Array.isArray(prev) ? prev : [];
        if (data?.saved) {
          if (list.some((i: any) => Number(i?.productId) === Number(productId))) return list;
          return [...list, { productId }];
        }
        return list.filter((i: any) => Number(i?.productId) !== Number(productId));
      });
      toast.success(data?.saved ? 'Added to wishlist' : 'Removed from wishlist');
    },
    onError: () => {
      toast.error('Failed to update wishlist');
    }
  });

  const toggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Please log in to save items to your wishlist.');
      return;
    }
    toggleMutation.mutate();
  };

  return (
    <button
      onClick={toggleWishlist}
      disabled={(!!user && isLoading) || toggleMutation.isPending}
      className={`absolute top-3 left-3 z-20 p-2 rounded-full transition-colors ${isSaved ? 'bg-rose-100 text-rose-500' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'} backdrop-blur-sm border border-slate-700 shadow-sm`}
    >
      <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
    </button>
  );
}
