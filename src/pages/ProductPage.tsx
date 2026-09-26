import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProductModal } from '../components/ProductModal.tsx';

export function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api-v2/products/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => setProduct(data))
      .catch(() => setError(true));
  }, [id]);

  if (error) {
    return (
      <div className="pt-24 min-h-screen text-center text-white">
        <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
        <button onClick={() => navigate('/')} className="btn-primary">Return Home</button>
      </div>
    );
  }

  if (!product) {
    return <div className="pt-24 min-h-screen text-center text-slate-400">Loading product...</div>;
  }

  return (
    <div className="pt-24 min-h-screen bg-slate-950">
      <ProductModal product={product} onClose={() => navigate(-1)} />
    </div>
  );
}
