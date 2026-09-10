const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// We will try to run the built output using JSDOM
// Let's just run vite dev server output via fetch.
// Actually, JSDOM can load scripts if we tell it to.
JSDOM.fromURL('http://localhost:3000', {
  runScripts: "dangerously",
  resources: "usable"
}).then(dom => {
  dom.window.addEventListener('error', (event) => {
    console.error('JSDOM ERROR:', event.error.message);
  });
  dom.window.addEventListener('unhandledrejection', (event) => {
    console.error('JSDOM PROMISE REJECTION:', event.reason);
  });
  
  setTimeout(() => {
    console.log("HTML:", dom.window.document.body.innerHTML.substring(0, 500));
    process.exit(0);
  }, 5000);
}).catch(e => {
  console.error("Fetch error:", e);
});
