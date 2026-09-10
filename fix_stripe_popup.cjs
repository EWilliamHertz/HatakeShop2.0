const fs = require('fs');
let code = fs.readFileSync('src/pages/SellerDashboard.tsx', 'utf8');

const target = `  const handleStripeOnboarding = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/stripe/create-account', {
        method: 'POST',
        headers: { 'Authorization': \`Bearer \${token}\` }
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        toast.error(data.error || 'Failed to start onboarding');
      }
    } catch (e) {
      toast.error('An error occurred while starting onboarding');
    }
  };`;

const replacement = `  const handleStripeOnboarding = async () => {
    const popup = window.open('', '_blank');
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/stripe/create-account', {
        method: 'POST',
        headers: { 'Authorization': \`Bearer \${token}\` }
      });
      const data = await res.json();
      if (data.url && popup) {
        popup.location.href = data.url;
      } else {
        if (popup) popup.close();
        toast.error(data.error || 'Failed to start onboarding. Did you set STRIPE_SECRET_KEY?');
      }
    } catch (e) {
      if (popup) popup.close();
      toast.error('An error occurred while starting onboarding');
    }
  };`;

code = code.replace(target, replacement);
fs.writeFileSync('src/pages/SellerDashboard.tsx', code);
