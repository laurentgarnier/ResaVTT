// Contexte serveur de test : dépôt en mémoire initialisé avec le jeu de démo, services factices.
import { createHash } from 'node:crypto';
import { creerDepotMemoire } from '../../backend/noyau/depot-memoire.js';
import { creerDonneesDemo } from '../../backend/noyau/donnees-demo.js';
import { traiter } from '../../backend/noyau/actions.js';
import { TRACES_DEMO } from '../../backend/noyau/traces-demo.js';

export const PORTEUR = { nom: 'Porteur', telephone: '+33611111111', email: 'porteur@example.org' };

export function contexteTest({ maintenant = new Date(2026, 10, 12, 20, 0), porteur = PORTEUR, aujourdhui = '2026-11-12' } = {}) {
  const donnees = creerDonneesDemo(aujourdhui, porteur);
  const depot = creerDepotMemoire(donnees.tables);
  const adherents = donnees.adherents;
  const mails = [];
  const fichiers = new Map();
  const horloge = { maintenant };
  let compteur = 0;
  let mailEnEchec = null;
  const ctx = {
    depot,
    adherents: { lire: () => adherents.map((a) => ({ ...a })) },
    services: {
      maintenant: () => new Date(horloge.maintenant.getTime()),
      uuid: () => `uuid-${++compteur}`,
      hacher: (s) => createHash('sha256').update(String(s)).digest('hex'),
      mail: (destinataires, objet, texte, html) => {
        if (mailEnEchec && mailEnEchec({ destinataires, objet, texte, html })) throw new Error('échec mail simulé');
        mails.push({ destinataires, objet, texte, html });
      },
      fichiers: {
        enregistrer: (nom, contenu) => { const id = `f-${++compteur}`; fichiers.set(id, contenu); return id; },
        lire: (id) => (id.startsWith('demo:') ? TRACES_DEMO[id.slice(5)] : fichiers.get(id)),
        supprimer: (id) => { fichiers.delete(id); },
      },
      http: () => ({ results: [{ name: 'Fontainebleau', admin2: 'Seine-et-Marne', latitude: 48.4, longitude: 2.7 }] }),
    },
    journal: () => {},
  };
  const appel = (action, params = {}) => traiter({ action, ...params }, ctx);
  const connecter = (telephone) => {
    const r = appel('connexion', { telephone });
    if (!r.ok) throw new Error(`connexion impossible : ${r.erreur}`);
    return r.data.jeton;
  };
  const regler = (date) => { horloge.maintenant = date; };
  const echouerMailSi = (f) => { mailEnEchec = f; };
  return { ctx, depot, adherents, mails, fichiers, appel, connecter, regler, echouerMailSi };
}
