const fs = require('fs');
let code = fs.readFileSync('src/pages/RFQHub.tsx', 'utf8');

code = code.replace(/Messages \& RFQs/, "{t('Messages & RFQs')}");
code = code.replace(/Manage your active Requests for Quotation, negotiate bulk pricing, and track sourcing milestones\./, "{t('Manage your active Requests for Quotation, negotiate bulk pricing, and track sourcing milestones.')}");
code = code.replace(/General Inquiry/, "{t('General Inquiry')}");
code = code.replace(/USD Negotiable/, "{t('USD Negotiable')}");
code = code.replace(/Target Qty/, "{t('Target Qty')}");
code = code.replace(/>Target Quantity</g, ">{t('Target Quantity')}<");
code = code.replace(/>Budget</g, ">{t('Budget')}<");
code = code.replace(/Create New RFQ/, "{t('Create New RFQ')}");
code = code.replace(/Generate RFQs using the AI Sourcing tool or browse the marketplace\./, "{t('Generate RFQs using the AI Sourcing tool or browse the marketplace.')}");
code = code.replace(/Pending Sample Request/, "{t('Pending Sample Request')}");
code = code.replace(/Product: /, "{t('Product')}: ");
code = code.replace(/Blind Dropshipping/, "{t('Blind Dropshipping')}");
code = code.replace(/Supplier will ship directly to your end-consumer with unbranded packing slips\./, "{t('Supplier will ship directly to your end-consumer with unbranded packing slips.')}");
code = code.replace(/Consumer Full Name/, "{t('Consumer Full Name')}");
code = code.replace(/Full Shipping Address/, "{t('Full Shipping Address')}");
code = code.replace(/Target Budget \(Per Unit, Optional\)/, "{t('Target Budget (Per Unit, Optional)')}");

fs.writeFileSync('src/pages/RFQHub.tsx', code);
