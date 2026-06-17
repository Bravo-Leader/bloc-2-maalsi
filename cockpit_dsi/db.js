// Persistance JSON pure — aucune dépendance native
const fs   = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'db.json');

function read()       { try { return JSON.parse(fs.readFileSync(FILE,'utf8')); } catch { return null; } }
function write(data)  { fs.writeFileSync(FILE, JSON.stringify(data, null, 2)); }

const db = {
  getAll:  (t)     => read()[t] || [],
  getById: (t, id) => (read()[t]||[]).find(r => r.id === +id),

  insert(table, obj) {
    const d = read();
    const id = (d._seq[table] || 0) + 1;
    d._seq[table] = id;
    const row = { id, ...obj, created_at: new Date().toISOString() };
    d[table].push(row);
    write(d); return row;
  },

  patch(table, id, fields) {
    const d = read();
    const idx = d[table].findIndex(r => r.id === +id);
    if (idx === -1) return null;
    d[table][idx] = { ...d[table][idx], ...fields, updated_at: new Date().toISOString() };
    write(d); return d[table][idx];
  },

  remove(table, id) {
    const d = read();
    d[table] = d[table].filter(r => r.id !== +id);
    write(d);
  },

  stats() {
    const d = read();
    const projs  = d.projects || [];
    const incs   = d.incidents || [];
    const srvs   = d.servers || [];
    const blocks = d.blocking_points || [];
    return {
      totalBudget: projs.reduce((s,p) => s+p.budget_k, 0),
      totalConso:  projs.reduce((s,p) => s+p.consomme_k, 0),
      actifs:      projs.filter(p => p.statut==='En cours').length,
      alertesExec: projs.filter(p => p.exec_rag==='ambre'||p.exec_rag==='rouge').length,
      projetsPrioRouge: projs.filter(p => p.prio_rag==='rouge').length,
      p1Open:      incs.filter(i => i.priorite==='P1' && i.statut!=='Résolu').length,
      blocksOpen:  blocks.filter(b => b.statut!=='Levé').length,
      uptimeMoy:   srvs.length ? Math.round(srvs.reduce((s,sv)=>s+sv.uptime,0)/srvs.length*10)/10 : 0,
    };
  },
};

// ── SEED ──────────────────────────────────────────────────────────────────────
// Source : livrable_complet.tex (§1.3 Tableau de priorisation + §2 Gestion CRM)
function seed() {
  if (fs.existsSync(FILE)) return;

  const data = { _seq:{}, projects:[], incidents:[], servers:[], esn_contacts:[], blocking_points:[], patches:[], crm_kpis:[] };
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

  // ── 11 projets avec critères exacts du livrable ──────────────────────────
  // Colonnes : strat(Imp), rent(Rent), risque(Risq), dep(Dép), regl(Règl)
  // Formule : strat×0,35 + rent×0,25 + risque×0,20 + dep×0,10 + regl×0,10
  // Score et prio_rag : valeurs exactes du tableau livrable §1.3
  // Mode : Agile (Refonte Web, CRM, App Mobile ×2) | Waterfall (tous les autres)
  // exec_rag : état courant d'exécution (séparé de prio_rag)
  const projects = [
    { name:"Refonte Web",          desc:"App web moderne responsive — s'interface avec CRM, clients/fournisseurs",    debut:"Avr 2026", duree_mois:6,  budget_k:300, charges_jh:400, strat:5, rent:5, risque:2, dep:4, regl:1, prio_score:3.80, prio_rag:"vert",  mode:"Agile",     avancement:8,  consomme_k:18,  exec_rag:"ambre", statut:"En cours",  chef:"S. Martin",  esn:"Sopra Steria",  taches_total:200, taches_faites:16, dependances:["Requis pour App Mobile Clients","S'interface avec CRM","Hébergé Azure après migration"] },
    { name:"CRM",                  desc:"Progiciel CRM — données clients, pilier croissance nationale",               debut:"Jun 2026", duree_mois:6,  budget_k:250, charges_jh:300, strat:5, rent:3, risque:4, dep:4, regl:1, prio_score:3.70, prio_rag:"vert",  mode:"Agile",     avancement:0,  consomme_k:0,   exec_rag:"planifie",statut:"Planifié",  chef:"L. Moreau",  esn:"CGI",           taches_total:150, taches_faites:0,  dependances:["Nécessite Office 365","Alimenté par Refonte Web","Données vers App Clients & Fourn."] },
    { name:"App Mobile Clients",   desc:"Application mobile — commande et réservation, intermédiation fournisseurs",  debut:"Mai 2026", duree_mois:8,  budget_k:150, charges_jh:200, strat:5, rent:5, risque:3, dep:1, regl:1, prio_score:3.70, prio_rag:"vert",  mode:"Agile",     avancement:0,  consomme_k:0,   exec_rag:"planifie",statut:"Planifié",  chef:"M. Dupont",  esn:"Capgemini",     taches_total:100, taches_faites:0,  dependances:["Nécessite Office 365","Nécessite Refonte Web"] },
    { name:"Auth. Forte (MFA)",    desc:"Authentification multi-facteurs — 200 employés Time'Eats",                   debut:"Jul 2026", duree_mois:4,  budget_k:150, charges_jh:120, strat:5, rent:3, risque:4, dep:3, regl:1, prio_score:3.60, prio_rag:"vert",  mode:"Waterfall", avancement:0,  consomme_k:0,   exec_rag:"planifie",statut:"Planifié",  chef:"T. Bernard", esn:"Interne",       taches_total:60,  taches_faites:0,  dependances:["Sécurise Refonte Web"] },
    { name:"Sauvegarde Cloud",     desc:"Sauvegarde automatisée cloud — continuité de service en cas de sinistre",    debut:"Oct 2026", duree_mois:4,  budget_k:100, charges_jh:100, strat:5, rent:3, risque:5, dep:1, regl:1, prio_score:3.60, prio_rag:"vert",  mode:"Waterfall", avancement:0,  consomme_k:0,   exec_rag:"planifie",statut:"Planifié",  chef:"A. Petit",   esn:"Interne",       taches_total:50,  taches_faites:0,  dependances:[] },
    { name:"App Mobile Fourn.",    desc:"Application mobile traiteurs & chefs — gestion commandes fournisseurs",      debut:"Mai 2026", duree_mois:8,  budget_k:200, charges_jh:250, strat:5, rent:5, risque:2, dep:1, regl:1, prio_score:3.50, prio_rag:"vert",  mode:"Agile",     avancement:0,  consomme_k:0,   exec_rag:"planifie",statut:"Planifié",  chef:"S. Martin",  esn:"Capgemini",     taches_total:125, taches_faites:0,  dependances:["Nécessite Office 365","Données fournisseurs depuis CRM"] },
    { name:"MAJ Outils Paie",      desc:"Mise à jour réglementaire outils de paie — paiement des salariés",          debut:"Sep 2026", duree_mois:3,  budget_k:50,  charges_jh:50,  strat:5, rent:1, risque:4, dep:1, regl:5, prio_score:3.40, prio_rag:"ambre", mode:"Waterfall", avancement:0,  consomme_k:0,   exec_rag:"planifie",statut:"Planifié",  chef:"L. Moreau",  esn:"Interne",       taches_total:25,  taches_faites:0,  dependances:[] },
    { name:"Office 365",           desc:"Outils collaboration & bureautique — prérequis CRM, Refonte Web et Apps",   debut:"Avr 2026", duree_mois:3,  budget_k:100, charges_jh:220, strat:4, rent:2, risque:3, dep:5, regl:1, prio_score:3.00, prio_rag:"ambre", mode:"Waterfall", avancement:25, consomme_k:22,  exec_rag:"vert",   statut:"En cours",  chef:"M. Dupont",  esn:"Econocom",      taches_total:88,  taches_faites:22, dependances:["Prérequis CRM","Prérequis App Mobile Clients","Prérequis App Mobile Fourn."] },
    { name:"CI/CD",                desc:"Plateforme de livraison continue — modernisation du développement",          debut:"Avr 2026", duree_mois:3,  budget_k:100, charges_jh:300, strat:3, rent:3, risque:3, dep:5, regl:1, prio_score:2.90, prio_rag:"ambre", mode:"Waterfall", avancement:20, consomme_k:19,  exec_rag:"vert",   statut:"En cours",  chef:"T. Bernard", esn:"Interne",       taches_total:120, taches_faites:24, dependances:["Déploie Refonte Web","Déploie App Mobile Clients","Déploie App Mobile Fourn."] },
    { name:"Stockage & Fichiers",  desc:"Solution centralisée fichiers — accès différencié par population",          debut:"Oct 2026", duree_mois:3,  budget_k:100, charges_jh:80,  strat:4, rent:3, risque:3, dep:1, regl:1, prio_score:2.85, prio_rag:"ambre", mode:"Waterfall", avancement:0,  consomme_k:0,   exec_rag:"planifie",statut:"Planifié",  chef:"A. Petit",   esn:"Interne",       taches_total:40,  taches_faites:0,  dependances:[] },
    { name:"Migration Azure",      desc:"Migration .NET 4.6.2 / Win Server 2016 → MS Azure — siège Rennes",          debut:"Aoû 2026", duree_mois:5,  budget_k:200, charges_jh:300, strat:3, rent:4, risque:1, dep:3, regl:1, prio_score:2.55, prio_rag:"rouge", mode:"Waterfall", avancement:0,  consomme_k:0,   exec_rag:"rouge",  statut:"Planifié",  chef:"A. Petit",   esn:"Sopra Steria",  taches_total:150, taches_faites:0,  dependances:["Héberge Refonte Web","Nécessite CI/CD finalisé"] },
  ];
  projects.forEach(p => db.insert('projects', p));

  // ── Incidents ────────────────────────────────────────────────────────────
  [
    ['P1','Env. dev Refonte Web inaccessible depuis poste Sopra Steria (VPN non configuré)','Refonte Web',72,'Ouvert'],
    ['P1','Pipeline CI/CD Jenkins — build agent non joignable réseau dev','CI/CD',24,'En cours'],
    ['P2','Serveur Métier 1 — latences >2s sur applis direction (congés/frais)','Infra on-premise',6,'Ouvert'],
    ['P3','Azure DevOps — compte de service non provisionné (préprod Migration Azure)','Migration Azure',96,'Ouvert'],
  ].forEach(([priorite,titre,projet,age_heures,statut]) => db.insert('incidents',{priorite,titre,projet,age_heures,statut}));

  // ── Serveurs (infrastructure on-premise Rennes — Win Server 2016) ────────
  [
    ['Serveur Prod (Suivi Prod.)','Windows Server 2016 — Rennes',99.7,'vert'],
    ['SQL Server (Suivi Prod.)','SQL Server 2016 — Rennes',99.5,'vert'],
    ['Serveur R&D (Recettes)','Windows Server 2016 — Rennes',99.9,'vert'],
    ['SQL Server (R&D Recettes)','SQL Server 2016 — Rennes',99.1,'vert'],
    ['Serveur Métier 1 (Apps Dir.)','Windows Server 2016 — Rennes',97.8,'ambre'],
    ['Serveur Métier 2 (Apps Dir.)','Windows Server 2016 — Rennes',99.4,'vert'],
    ['SQL Server Partagé (Métier)','SQL Server 2016 — Rennes',99.6,'vert'],
    ['NAS Fichiers Nœud 1','Serveur de fichiers redondé — Rennes',100.0,'vert'],
    ['NAS Fichiers Nœud 2','Serveur de fichiers redondé — Rennes',100.0,'vert'],
  ].forEach(([name,env,uptime,rag]) => db.insert('servers',{name,env,uptime,rag}));

  // ── ESN Contacts ──────────────────────────────────────────────────────────
  [
    ['Econocom','Office 365','Kick-off déploiement O365 — plan de migration mailboxes validé',3,4.0],
    ['Sopra Steria','Refonte Web · Migration Azure','Réunion lancement Refonte Web S14 — setup env. dev en cours',7,3.5],
    ['Capgemini','App Mobile Clients · App Mobile Fourn.',"Présentation d'offre reçue — revue technique prévue le 28 avr.",12,null],
    ['CGI','CRM','RFP envoyé le 6 avril — réponse attendue avant le 30 avril',14,null],
    ['Équipe interne','CI/CD · Auth. Forte · MAJ Paie · Stockage · Sauvegarde','Stand-up quotidien — montée en charge pipeline CI/CD en cours',1,null],
  ].forEach(([name,projets,dernier_cr,jours,note]) => db.insert('esn_contacts',{name,projets,dernier_cr,jours_depuis_contact:jours,note}));

  // ── Blocking Points ───────────────────────────────────────────────────────
  [
    ['Accès VPN Sopra Steria non configuré — bloque setup environnement Refonte Web','Refonte Web',3,'DSI Infra / Sopra Steria','Ouvert'],
    ['Licences Azure DevOps non provisionnées — bloque pipeline CI/CD','CI/CD',5,'T. Bernard / DSI','Ouvert'],
    ['Décision progiciel CRM non finalisée — arbitrage Salesforce vs HubSpot','CRM',3,'DSI + Direction Commerciale','Ouvert'],
    ["RFP Capgemini — réponse deadline 30 avr. (App Mobile délai en suspens)",'App Mobile Clients & Fourn.',14,'L. Moreau / DSI','En cours'],
  ].forEach(([titre,projet,jours,resp,statut]) => db.insert('blocking_points',{titre,projet,jours,responsable:resp,statut}));

  // ── Patch Notes ───────────────────────────────────────────────────────────
  [
    ['Office 365 — Environnement de pilote activé (50 comptes testeurs)','Econocom / Interne','2026-04-18'],
    ['CI/CD — Premier pipeline Jenkins déployé (env. de dev Refonte Web)','Équipe interne','2026-04-15'],
    ['Refonte Web — Maquettes UX validées par MOA (Sprint 1)','Sopra Steria','2026-04-14'],
  ].forEach(([titre,esn,date_livraison]) => db.insert('patches',{titre,esn,date_livraison}));

  // ── CRM KPIs (mensuels — §2.2 Tableau de bord pilotage CRM) ──────────────
  // Statuts initiaux (projet pas encore démarré — préparatoire)
  db.insert('crm_kpis', {
    mois: 'Avr 2026',
    jalons: [
      { id:'J1', desc:'Validation note de cadrage + RACI',          date_cible:'2026-06-15', statut:'À venir' },
      { id:'J2', desc:'Choix éditeur CRM — contractualisation',     date_cible:'2026-06-30', statut:'À venir' },
      { id:'J3', desc:'Livraison environnement de recette',         date_cible:'2026-08-31', statut:'À venir' },
      { id:'J4', desc:'Tests fonctionnels et validation métier',    date_cible:'2026-10-31', statut:'À venir' },
      { id:'J5', desc:'Go-live — mise en production + formations',  date_cible:'2026-11-30', statut:'À venir' },
    ],
    kpis: {
      budget_pct: null, ipc: null, reserve_pct: 100,
      jalons_pct: null, ipd: null, retard_j: 0,
      couverture_tests: null, anomalies_bloquantes: 0, satisfaction_pct: null,
    },
    statut_global: 'vert',
    points_vigilance: ['Décision progiciel CRM non finalisée (arbitrage DSI + Dir. Commerciale)', 'RFP Capgemini — réponse attendue le 30 avr.', 'Prérequis Office 365 à valider avant démarrage CRM'],
    decisions_copil: ['Choisir entre Salesforce et HubSpot avant le 30 avril', 'Valider le budget réserve aléas (15 K€)'],
    risques: [
      { risque:'Données non conformes RGPD', proba:'Élevée', impact:'Élevé', criticite:'Critique', mitigation:'Audit de données dès juin N — DPO impliqué au démarrage' },
      { risque:"Retard de l'éditeur CRM", proba:'Moyenne', impact:'Élevé', criticite:'Majeur', mitigation:'Contractualiser SLA avec pénalités — jalons intermédiaires contractuels' },
      { risque:'Résistance au changement', proba:'Moyenne', impact:'Moyen', criticite:'Majeur', mitigation:'Plan conduite du changement — Key Users impliqués dès le cadrage' },
      { risque:'Office 365 non terminé', proba:'Faible', impact:'Moyen', criticite:'Mineur', mitigation:'Planning conditionnel — CRM peut démarrer en mode dégradé' },
      { risque:'Perte de données migration', proba:'Faible', impact:'Critique', criticite:'Majeur', mitigation:'Sauvegarde avant migration — tests de non-régression' },
      { risque:'Dépassement budgétaire', proba:'Faible', impact:'Élevé', criticite:'Majeur', mitigation:'Jalons de validation budget J2/J3/J4 — réserve de 10%' },
    ],
    // Satisfaction client interne — mesurée via 4 axes CDQ + Fonctionnalités
    satisfaction_client: [
      { projet:'Refonte Web',  cout:75, delai:70, qualite:80, fonctionnalites:85, commentaire:'Sprint 1 validé — env. dev bloqué S14, retard setup Sopra Steria' },
      { projet:'Office 365',  cout:90, delai:85, qualite:90, fonctionnalites:80, commentaire:'Migration mailboxes en bonne voie — pilote 50 comptes validé' },
      { projet:'CI/CD',       cout:85, delai:80, qualite:75, fonctionnalites:70, commentaire:'Pipeline opérationnel — agent build réseau dev encore instable' },
    ],
    // Satisfaction équipe — questionnaires post-sprint et rétrospectives
    satisfaction_equipe: [
      { sprint:'Sprint 1 — Refonte Web',  date:'2026-04-14', score:3.8, participants:6, points_positifs:['Bonne dynamique équipe','Maquettes UX bien reçues par MOA'], points_amelioration:['Setup environnement trop long (VPN)','Manque de visibilité sur dépendances Azure'] },
      { sprint:'Sprint 1 — Office 365',   date:'2026-04-18', score:4.1, participants:4, points_positifs:['Econocom réactif','Plan migration clair'], points_amelioration:['Accès admin tenant en attente','Documentation insuffisante'] },
      { sprint:'Sprint 1 — CI/CD',        date:'2026-04-17', score:3.5, participants:5, points_positifs:['Pipeline fonctionnel en 3j','Bonne collaboration interne'], points_amelioration:['Licences Azure DevOps manquantes','Build agent instable réseau dev'] },
    ]
  });
}

seed();
module.exports = db;
