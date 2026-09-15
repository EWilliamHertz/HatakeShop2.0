const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  console.log("Navigating to /admin...");
  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle0' });
  
  console.log("Navigating to /marketplace...");
  await page.goto('http://localhost:5173/marketplace', { waitUntil: 'networkidle0' });

  await browser.close();
  console.log("Done");
})();
