const fs = require('fs');
const extracted = require('./all_extracted_keys.json');

const t1 = require('./translations.json');
const t2 = require('./translations2.json');
const t3 = require('./translations3.json');
const t4 = require('./translations4.json');
const t5 = require('./translations5.json');
const t6 = require('./translations6.json');
const t7 = require('./translations7.json');
const t8 = require('./translations8.json');
const combined = { ...t1, ...t2, ...t3, ...t4, ...t5, ...t6, ...t7, ...t8 };
const missing = extracted.filter(k => !combined[k]);
console.log(JSON.stringify(missing, null, 2));
