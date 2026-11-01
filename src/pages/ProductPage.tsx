import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
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
        <Helmet>
          <title>Product Not Found | Hatake.Shop</title>
          <meta name="robots" content="noindex, follow" />
        </Helmet>
        <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
        <button onClick={() => navigate('/')} className="btn-primary">Return Home</button>
      </div>
    );
  }

  if (!product) {
    return <div className="pt-24 min-h-screen text-center text-slate-400">Loading product...</div>;
  }

  let images: string[] = [];
  try {
    if (Array.isArray(product.images)) {
      images = product.images;
    } else if (typeof product.images === 'string') {
      images = JSON.parse(product.images);
    }
  } catch {
    images = [];
  }
  const primaryImage = images[0] || 'https://www.hatake.shop/og-image.png';
  const pageUrl = `https://www.hatake.shop/product/${product.id}`;
  const metaDescription = product.description
    ? product.description.slice(0, 160)
    : `Buy ${product.title} wholesale on Hatake.Shop B2B Marketplace. Direct verified supplier inventory.`;

  const productJsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.title,
    image: images.length > 0 ? images : [primaryImage],
    description: metaDescription,
    sku: String(product.id),
    brand: {
      '@type': 'Brand',
      name: product.brand || 'Hatake B2B',
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: product.currency || 'USD',
      price: product.unitCost || 0,
      availability: (product.stock && product.stock > 0) ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
      url: pageUrl,
      seller: {
        '@type': 'Organization',
        name: product.seller?.companyName || 'Hatake Verified Partner',
      },
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://www.hatake.shop/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Marketplace',
        item: 'https://www.hatake.shop/marketplace',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.title,
        item: pageUrl,
      },
    ],
  };

  return (
    <div className="pt-24 min-h-screen bg-slate-950">
      <Helmet>
        <title>{product.title} | Hatake B2B Wholesale</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={pageUrl} />

        {/* OpenGraph */}
        <meta property="og:type" content="product" />
        <meta property="og:title" content={`${product.title} | Hatake.Shop`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={primaryImage} />
        <meta property="og:url" content={pageUrl} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${product.title} | Hatake.Shop`} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={primaryImage} />

        {/* Schema.org Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(productJsonLd)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbJsonLd)}
        </script>
      </Helmet>
      <ProductModal product={product} onClose={() => (window.history.length > 1 ? navigate(-1) : navigate('/marketplace'))} />
    </div>
  );
}
