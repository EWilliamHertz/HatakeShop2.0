const fs = require('fs');
let code = fs.readFileSync('src/pages/Onboarding.tsx', 'utf8');

const oldLogic = `      if (!res.ok) {
        throw new Error(data.error || "Failed to process onboarding");
      }

      localStorage.setItem('onboardingPreferences', JSON.stringify(data));`;

const newLogic = `      if (!res.ok) {
        throw new Error(data.error || "Failed to process onboarding");
      }
      
      if (data.cartItems && Array.isArray(data.cartItems) && data.cartItems.length > 0) {
        const cartItems = data.cartItems.map((ci: any) => {
           let imgs = [];
           try { imgs = typeof ci.product.images === 'string' ? JSON.parse(ci.product.images || '[]') : ci.product.images; } catch {}
           if (!Array.isArray(imgs)) imgs = [];
           return {
              productId: ci.product.id,
              title: ci.product.title,
              image: imgs[0] || '',
              sellerName: ci.product.seller?.companyName || 'Verified Supplier',
              sellerId: ci.product.sellerId,
              quantity: ci.quantity // For UI display if needed
           };
        });
        
        try {
          const existingRaw = localStorage.getItem('sample_cart');
          const existing = existingRaw ? JSON.parse(existingRaw) : [];
          const combined = [...existing, ...cartItems.filter((ci: any) => !existing.find((e: any) => e.productId === ci.productId))];
          localStorage.setItem('sample_cart', JSON.stringify(combined));
          // We also trigger a custom event so the cart icon updates
          window.dispatchEvent(new Event('storage'));
        } catch(e) {}
      }

      localStorage.setItem('onboardingPreferences', JSON.stringify(data));`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('src/pages/Onboarding.tsx', code);
