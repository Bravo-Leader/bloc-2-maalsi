const express = require('express');
const path    = require('path');
const db      = require('./db');

const app  = express();
const PORT = 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── PROJECTS ──────────────────────────────────────────────────────────────────
app.get('/api/projects', (req, res) => res.json(db.getAll('projects')));
app.patch('/api/projects/:id', (req, res) => {
  const allowed = ['avancement','consomme_k','exec_rag','statut','chef','esn'];
  const fields  = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const updated = db.patch('projects', req.params.id, fields);
  updated ? res.json(updated) : res.status(404).json({ error: 'Projet non trouvé' });
});

// ── INCIDENTS ─────────────────────────────────────────────────────────────────
const P_ORDER = {'P1':1,'P2':2,'P3':3};
app.get('/api/incidents', (req, res) => {
  res.json(db.getAll('incidents').sort((a,b) => (P_ORDER[a.priorite]||9)-(P_ORDER[b.priorite]||9)));
});
app.post('/api/incidents', (req, res) => {
  const { priorite, titre, projet, age_heures } = req.body;
  if (!priorite||!titre) return res.status(400).json({ error: 'priorite et titre requis' });
  res.status(201).json(db.insert('incidents',{priorite,titre,projet:projet||'',age_heures:age_heures||0,statut:'Ouvert'}));
});
app.patch('/api/incidents/:id', (req, res) => {
  if (!['Ouvert','En cours','Résolu'].includes(req.body.statut)) return res.status(400).json({error:'statut invalide'});
  res.json(db.patch('incidents', req.params.id, { statut: req.body.statut }));
});
app.delete('/api/incidents/:id', (req, res) => { db.remove('incidents', req.params.id); res.json({ok:true}); });

// ── SERVERS ───────────────────────────────────────────────────────────────────
app.get('/api/servers', (req, res) => res.json(db.getAll('servers')));
app.patch('/api/servers/:id', (req, res) => {
  const f = {};
  if (req.body.uptime!=null) f.uptime = req.body.uptime;
  if (req.body.rag)          f.rag    = req.body.rag;
  res.json(db.patch('servers', req.params.id, f));
});

// ── ESN ───────────────────────────────────────────────────────────────────────
app.get('/api/esn', (req, res) => {
  res.json(db.getAll('esn_contacts').sort((a,b)=>a.jours_depuis_contact-b.jours_depuis_contact));
});
app.patch('/api/esn/:id', (req, res) => {
  const allowed = ['dernier_cr','jours_depuis_contact','note'];
  const f = Object.fromEntries(Object.entries(req.body).filter(([k])=>allowed.includes(k)));
  res.json(db.patch('esn_contacts', req.params.id, f));
});

// ── BLOCKING ──────────────────────────────────────────────────────────────────
app.get('/api/blocking', (req, res) => {
  res.json(db.getAll('blocking_points').filter(b=>b.statut!=='Levé').sort((a,b)=>b.jours-a.jours));
});
app.post('/api/blocking', (req, res) => {
  const { titre, projet, jours, responsable } = req.body;
  if (!titre) return res.status(400).json({error:'titre requis'});
  res.status(201).json(db.insert('blocking_points',{titre,projet:projet||'',jours:jours||0,responsable:responsable||'',statut:'Ouvert'}));
});
app.patch('/api/blocking/:id', (req, res) => {
  if (!['Ouvert','En cours','Levé'].includes(req.body.statut)) return res.status(400).json({error:'statut invalide'});
  res.json(db.patch('blocking_points', req.params.id, {statut:req.body.statut}));
});

// ── PATCHES ───────────────────────────────────────────────────────────────────
app.get('/api/patches', (req, res) => {
  res.json(db.getAll('patches').sort((a,b)=>(b.date_livraison||'').localeCompare(a.date_livraison||'')));
});
app.post('/api/patches', (req, res) => {
  const { titre, esn, date_livraison } = req.body;
  if (!titre) return res.status(400).json({error:'titre requis'});
  res.status(201).json(db.insert('patches',{titre,esn:esn||'',date_livraison:date_livraison||new Date().toISOString().slice(0,10)}));
});

// ── CRM ───────────────────────────────────────────────────────────────────────
app.get('/api/crm', (req, res) => {
  const all = db.getAll('crm_kpis');
  res.json(all[all.length-1] || {});
});
app.patch('/api/crm/:id', (req, res) => {
  const allowed = ['kpis','jalons','statut_global','points_vigilance','decisions_copil'];
  const f = Object.fromEntries(Object.entries(req.body).filter(([k])=>allowed.includes(k)));
  res.json(db.patch('crm_kpis', req.params.id, f));
});

// ── STATS ─────────────────────────────────────────────────────────────────────
app.get('/api/stats', (req, res) => res.json(db.stats()));

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ✅  Cockpit DSI Time'Eats démarré`);
  console.log(`  👉  http://localhost:${PORT}\n`);
});
