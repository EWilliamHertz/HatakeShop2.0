const fs = require('fs');

const serverTs = fs.readFileSync('server.ts', 'utf8');

if (!serverTs.includes('EasyPostClient')) {
  let modified = serverTs.replace(
    'import stripe from "./src/lib/stripe";',
    'import stripe from "./src/lib/stripe";\nimport EasyPostClient from "@easypost/api";'
  );

  const easyPostSetup = `
let easypostClient: EasyPostClient | null = null;
function getEasyPost() {
  if (!easypostClient) {
    const key = process.env.EASYPOST_API_KEY;
    if (!key) throw new Error('EASYPOST_API_KEY environment variable is required for live freight calculation.');
    easypostClient = new EasyPostClient(key);
  }
  return easypostClient;
}

`;
  
  modified = modified.replace(
    'const app = express();',
    easyPostSetup + 'const app = express();'
  );

  const endpoint = `
  app.post("/api/logistics/estimate", async (req, res) => {
    try {
      const { quantity, currentPrice, destination } = req.body;
      if (!quantity || !currentPrice) return res.status(400).json({ error: "Missing payload" });

      const ep = getEasyPost();

      const destAddresses: Record<string, any> = {
        'EU': { country: 'DE', zip: '10115', city: 'Berlin' },
        'US': { country: 'US', zip: '10001', city: 'New York', state: 'NY' },
        'UK': { country: 'GB', zip: 'E1 6AN', city: 'London' },
        'JP': { country: 'JP', zip: '100-0001', city: 'Tokyo' }
      };
      const toAddressData = destAddresses[destination] || destAddresses['US'];

      const fromAddress = await ep.Address.create({
        street1: '123 Seller St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94105',
        country: 'US',
      });

      const toAddress = await ep.Address.create(toAddressData);

      // Assume 0.5kg (17.6oz) per unit
      const totalWeightOz = quantity * 17.6;

      const parcel = await ep.Parcel.create({ weight: totalWeightOz });

      const customsItem = await ep.CustomsItem.create({
        description: 'TCG Wholesale Products',
        quantity: quantity,
        value: currentPrice,
        weight: 17.6,
        origin_country: 'US',
        hs_tariff_number: '9503.00.00'
      });

      const customsInfo = await ep.CustomsInfo.create({
        customs_certify: true,
        customs_signer: 'Hatake Shop',
        contents_type: 'merchandise',
        contents_explanation: 'B2B Wholesale',
        restriction_type: 'none',
        non_delivery_option: 'return',
        customs_items: [customsItem]
      });

      const shipment = await ep.Shipment.create({
        to_address: toAddress,
        from_address: fromAddress,
        parcel: parcel,
        customs_info: customsInfo
      });

      if (!shipment.rates || shipment.rates.length === 0) {
        throw new Error("No rates returned by carrier");
      }

      const rate = shipment.rates.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))[0];

      const VAT_RATES: Record<string, number> = { 'EU': 0.21, 'US': 0.00, 'UK': 0.20, 'JP': 0.10 };
      const DUTY_RATES: Record<string, number> = { 'EU': 0.047, 'US': 0.00, 'UK': 0.04, 'JP': 0.00 };

      const baseTotal = currentPrice * quantity;
      const freightCost = parseFloat(rate.rate);
      const freightMethod = rate.carrier + ' ' + rate.service;

      const dutyRate = DUTY_RATES[destination] || 0;
      const dutyCost = baseTotal * dutyRate;

      const vatRate = VAT_RATES[destination] || 0;
      const vatCost = (baseTotal + freightCost + dutyCost) * vatRate;

      const totalLanded = baseTotal + freightCost + dutyCost + vatCost;
      const landedPerUnit = totalLanded / quantity;

      res.json({
        baseTotal,
        freightMethod,
        freightCost,
        dutyRate,
        dutyCost,
        vatRate,
        vatCost,
        totalLanded,
        landedPerUnit,
        currency: rate.currency || 'USD'
      });
    } catch (error: any) {
      console.error("EasyPost Error:", error);
      res.status(500).json({ error: error.message || "Failed to calculate live rates" });
    }
  });
`;

  modified = modified.replace(
    'app.post("/api/inquiries",',
    endpoint + '\n  app.post("/api/inquiries",'
  );

  fs.writeFileSync('server.ts', modified);
}
