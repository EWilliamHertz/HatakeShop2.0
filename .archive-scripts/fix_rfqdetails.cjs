const fs = require('fs');
let code = fs.readFileSync('src/pages/RFQDetails.tsx', 'utf8');

const reps = [
  ['Awaiting buyer payment...', 'Awaiting buyer payment...'],
  ['Budget', 'Budget'],
  ['Consumer Name:', 'Consumer Name:'],
  ['Do NOT include Hatake or supplier branding on packing slips.', 'Do NOT include Hatake or supplier branding on packing slips.'],
  ['Formal Counter-Offer', 'Formal Counter-Offer'],
  ['Accept Order', 'Accept Order'],
  ['Decline', 'Decline'],
  ['Lead time: ', 'Lead time: '],
  ['Lead Time:', 'Lead Time:'],
  ['Live Counter-Offer / Formal Quote', 'Live Counter-Offer / Formal Quote'],
  ['Loading RFQ details...', 'Loading RFQ details...'],
  ['MOQ: ', 'MOQ: '],
  ['MOQ:', 'MOQ:'],
  ['Official Quote', 'Official Quote'],
  ['Order Accepted', 'Order Accepted'],
  ['Pay with Stripe', 'Pay with Stripe'],
  ['Product', 'Product'],
  ['Read', 'Read'],
  ['RFQ Details', 'RFQ Details'],
  ['RFQ not found', 'RFQ not found'],
  ['Send Quote', 'Send Quote'],
  ['Cancel', 'Cancel'],
  ['Shipping Address:', 'Shipping Address:'],
  ['Ships directly to end-consumer', 'Ships directly to end-consumer'],
  ['Someone is typing', 'Someone is typing'],
  ['Status', 'Status'],
  ['Target Quantity', 'Target Quantity'],
  ['Unit Price: ', 'Unit Price: '],
  ['Unit Price:', 'Unit Price:'],
  ['View Attached PDF', 'View Attached PDF']
];

reps.forEach(([oldStr, newStr]) => {
  code = code.split(`>${oldStr}<`).join(`>{t('${newStr}')}<`);
});

// Also replace specific instances like:
code = code.replace(/>Accept Order</g, ">{t('Accept Order')}<");
code = code.replace(/>Decline</g, ">{t('Decline')}<");
code = code.replace(/>Cancel</g, ">{t('Cancel')}<");
code = code.replace(/>View Attached PDF</g, ">{t('View Attached PDF')}<");
code = code.replace(/>Official Quote</g, ">{t('Official Quote')}<");

fs.writeFileSync('src/pages/RFQDetails.tsx', code);
