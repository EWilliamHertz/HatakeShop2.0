import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ProductModal } from '../components/ProductModal.tsx';
import { useSiteMode } from '../components/SiteModeContext.tsx';
import { useCart } from '../components/SampleCart.tsx';
import { getB2cPriceSEK } from './SwedenShop.tsx';

export function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isB2C } = useSiteMode();
  const { addSverigeItem } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api-v2/products/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => setProduct(data))
      .catch(() => setError(true));
  }, [id]);

  if (error) {
    return (
      <div className="pt-24 min-h-screen text-center text-white">
        <Helmet>
          <title>{t('Product Not Found')} | Hatake.Shop</title>
          <meta name="robots" content="noindex, follow" />
        </Helmet>
        <h2 className="text-2xl font-bold mb-4">{t('Product Not Found')}</h2>
        <button onClick={() => navigate('/')} className="btn-primary mx-auto">
          {t('Return Home')}
        </button>
      </div>
    );
  }

  if (!product) {
    return <div className="pt-24 min-h-screen text-center text-slate-400">{t('Loading product...')}</div>;
  }

  let images: string[] = [];
  try {
    const rawImgs = isB2C && product.sverigeImages ? product.sverigeImages : product.images;
    if (Array.isArray(rawImgs)) {
      images = rawImgs;
    } else if (typeof rawImgs === 'string') {
      images = JSON.parse(rawImgs);
    }
  } catch {
    images = [];
  }

  const displayTitle = isB2C && product.sverigeTitle ? product.sverigeTitle : product.title;
  const canonicalDomain = isB2C ? 'https://hatake.shop' : 'https://b2b.hatake.shop';
  const primaryImage = images[0] || `${canonicalDomain}/logo.png`;
  const pageUrl = `${canonicalDomain}/product/${product.id}`;
  const metaDescription = product.description
    ? product.description.slice(0, 160)
    : isB2C
      ? `Köp ${displayTitle} hos Hatake.Shop — Snabb leverans från svenskt lager.`
      : `Buy ${displayTitle} wholesale on B2B.Hatake.Shop. Direct verified supplier inventory.`;

  const b2cPrice = getB2cPriceSEK(product);

  const productJsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: displayTitle,
    image: images.length > 0 ? images : [primaryImage],
    description: metaDescription,
    sku: String(product.id),
    brand: {
      '@type': 'Brand',
      name: product.brand || (isB2C ? 'Hatake Sverige' : 'Hatake B2B'),
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: isB2C ? 'SEK' : product.currency || 'EUR',
      price: isB2C ? b2cPrice : product.unitCost || 0,
      availability: product.isPreorder
        ? 'https://schema.org/PreOrder'
        : 'https://schema.org/InStock',
      url: pageUrl,
      seller: {
        '@type': 'Organization',
        name: isB2C ? 'Hatake Sverige' : product.seller?.companyName || 'Hatake Verified Partner',
      },
    },
  };

  const handleAddB2c = () => {
    addSverigeItem({
      productId: product.id,
      title: displayTitle,
      image: images[0] || '',
      sellerName: 'Hatake Sverige',
      sellerId: product.sellerId || 1,
      unitCost: b2cPrice,
      quantity: 1,
      isPreorder: Boolean(product.isPreorder),
      preorderLabel: product.preorderLabel || undefined,
    });
    toast.success(`${t('Tillagd i varukorgen')}: ${displayTitle}`);
  };

  return (
    <div className="pt-8 min-h-screen bg-slate-950">
      <Helmet>
        <title>
          {displayTitle} | {isB2C ? 'Hatake.Shop Sverige' : 'B2B.Hatake.Shop Wholesale'}
        </title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={pageUrl} />
        <link rel="alternate" hrefLang="sv-SE" href={pageUrl} />
        <link rel="alternate" hrefLang="en" href={`${pageUrl}?lang=en`} />

        {/* OpenGraph */}
        <meta property="og:type" content="product" />
        <meta property="og:title" content={`${displayTitle} | ${isB2C ? 'Hatake.Shop' : 'B2B.Hatake.Shop'}`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={primaryImage} />
        <meta property="og:url" content={pageUrl} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${displayTitle} | ${isB2C ? 'Hatake.Shop' : 'B2B.Hatake.Shop'}`} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={primaryImage} />

        {/* Schema.org Structured Data */}
        <script type="application/ld+json">{JSON.stringify(productJsonLd)}</script>
      </Helmet>
      <ProductModal
        product={product}
        hideMOQ={isB2C}
        onAddToCart={isB2C ? handleAddB2c : undefined}
        onClose={() => (window.history.length > 1 ? navigate(-1) : navigate(isB2C ? '/' : '/marketplace'))}
      />
    </div>
  );
}
