const puppeteer = require('puppeteer');
const path = require('path');

const OUT = path.join(__dirname, '..', 'img');

const TABS = [
  { id: 'portefeuille', label: 'portefeuille', waitFor: '#proj-tbody tr' },
  { id: 'crm',         label: 'crm',          waitFor: '#jalons-list .jalon-item' },
  { id: 'velocite',    label: 'velocite',      waitFor: '#chartDeploy' },
  { id: 'ops',         label: 'ops',           waitFor: '#uptime-grid .utc' },
  { id: 'esn',         label: 'esn',           waitFor: '#esn-list .esn-card' },
];

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();

  // Charger la page une première fois pour que tous les charts soient montés
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  for (const tab of TABS) {
    // Cliquer sur l'onglet
    await page.evaluate((id) => {
      const btn = [...document.querySelectorAll('.nav-tab')]
        .find(b => b.getAttribute('onclick')?.includes(`'${id}'`));
      if (btn) btn.click();
    }, tab.id);

    await new Promise(r => setTimeout(r, 800));

    // Attendre que l'élément attendu soit visible
    try {
      await page.waitForSelector(tab.waitFor, { timeout: 5000 });
    } catch (_) {}

    await new Promise(r => setTimeout(r, 600));

    const file = path.join(OUT, `cockpit_${tab.label}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`✅  ${file}`);
  }

  await browser.close();
  console.log('Done.');
})();
