// Détail d'une sortie : informations, traces GPX, inscription, liste des inscrits, discussion.
import { echapper, initiales, couleurAvatar } from '../logique/html.js';
import { libelleJour } from '../logique/dates.js';
import { lienWhatsApp } from '../logique/modeles.js';
import { lirePoints } from '../logique/gpx.js';
import { badgeSortie } from './calendrier.js';
import { afficherCarte } from './carte.js';

const MESSAGES_VISIBLES = 2;
const INTERVALLE_DISCUSSION_MS = 30000;
let minuteurDiscussion = null;

// Un seul rafraîchissement de discussion à la fois, arrêté à chaque changement d'écran.
export function arreterDiscussion() {
  clearInterval(minuteurDiscussion);
  minuteurDiscussion = null;
}

function heureMessage(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

function renderMessage(m) {
  if (m.systeme) return `<div class="msg systeme">${echapper(m.texte)}</div>`;
  return `<div class="msg${m.a_moi ? ' moi' : ''}" data-id="${echapper(m.id)}">${m.a_moi ? `<button class="suppr" data-supprimer="${echapper(m.id)}" title="Supprimer">✕</button>` : ''}<div class="auteur">${echapper(m.auteur_nom)} · ${echapper(heureMessage(m.horodatage))}</div>${echapper(m.texte)}${m.trace_id ? `<div><button class="lien-plus" data-telecharger="${echapper(m.trace_id)}">⬇ Trace jointe</button></div>` : ''}</div>`;
}

export function renderDiscussion(messages, tousMessages) {
  const caches = tousMessages ? 0 : Math.max(0, messages.length - MESSAGES_VISIBLES);
  const visibles = messages.slice(caches);
  const lienPlus = caches === 1 ? 'Voir le message précédent' : `Voir les ${caches} messages précédents`;
  return `<div class="section">💬 Discussion <span>${messages.length} message${messages.length > 1 ? 's' : ''}</span></div>
    ${caches ? `<button class="lien-plus" data-action="tous-messages">${lienPlus}</button>` : ''}
    ${visibles.map(renderMessage).join('')}
    <form class="saisie" id="form-message">
      <input name="texte" maxlength="1000" placeholder="Écrire un message…" autocomplete="off" aria-label="Message">
      <button class="btn p" type="submit">➤</button>
    </form>`;
}

function renderTraces(sortie) {
  if (!sortie.traces.length) return '';
  return `<div class="section">🗺 Traces GPX</div>${sortie.traces.map((t) => `
    <div class="trace" data-trace="${echapper(t.id)}">
      <div class="srow"><span>${echapper(t.nom_fichier)}</span><span>${t.km ? `${echapper(t.km)} km` : ''}${t.dplus ? ` · ⛰ ${echapper(t.dplus)} m D+` : ''}</span></div>
      <div class="actions-trace"><button data-carte="${echapper(t.id)}">▸ Voir la carte</button><button data-telecharger="${echapper(t.id)}">⬇ Télécharger</button>${sortie.peut_modifier ? `<button data-supprimer-trace="${echapper(t.id)}">✕ Retirer</button>` : ''}</div>
      <div class="carte-trace" hidden></div>
    </div>`).join('')}`;
}

// Départs (sortie récurrente à plusieurs points de départ) : départ de mes inscrits, sinon le premier.
const departsSortie = (sortie) => sortie.departs || [{ id: 'd1', heure: sortie.heure, point_rdv: sortie.point_rdv }];
const monDepart = (sortie) => (sortie.inscrits.find((i) => i.a_moi) || {}).depart_id || 'd1';

function choixDepart(sortie) {
  const departs = departsSortie(sortie);
  if (departs.length < 2) return '';
  const actuel = monDepart(sortie);
  return `<div class="choix-depart"><div class="petit mut">Mon départ</div>${departs.map((d) => `<label class="case"><input type="radio" name="depart" value="${echapper(d.id)}"${d.id === actuel ? ' checked' : ''}> ${echapper(d.heure)} ${echapper(d.point_rdv)}</label>`).join('')}</div>`;
}

export function renderInscription(sortie, personnes) {
  if (sortie.statut === 'annulee') return '';
  if (!sortie.inscriptions_ouvertes) return '<p class="mut">Inscriptions closes : l\'heure du rendez-vous est passée.</p>';
  const inscrites = new Set(sortie.inscrits.filter((i) => i.a_moi).map((i) => i.personne_id));
  const plusieursDeparts = departsSortie(sortie).length > 1;
  if (plusieursDeparts && personnes.length === 1 && inscrites.size) {
    return `<form id="form-inscription" data-inscrit="1">
    ${choixDepart(sortie)}
    <input type="hidden" name="personne" value="${echapper(personnes[0].id)}">
    <div class="actions"><button class="btn p" type="submit" name="choix" value="changer" style="flex:1">Changer de départ</button><button class="btn o" type="submit" name="choix" value="desinscrire" style="flex:1">Me désinscrire</button></div>
  </form>`;
  }
  const choix = personnes.length > 1
    ? `<div class="choix-personnes">${personnes.map((p) => `<label><input type="checkbox" name="personne" value="${echapper(p.id)}"${inscrites.has(p.id) ? ' checked' : ''}> ${echapper(p.nom_affiche)}</label>`).join('')}</div>`
    : `<input type="hidden" name="personne" value="${echapper(personnes[0] ? personnes[0].id : '')}">`;
  let bouton;
  if (personnes.length > 1) bouton = inscrites.size ? 'Mettre à jour mon inscription' : "M'inscrire";
  else bouton = inscrites.size ? 'Me désinscrire' : "M'inscrire";
  return `<form id="form-inscription" data-inscrit="${inscrites.size ? '1' : '0'}">
    ${choixDepart(sortie)}
    ${choix}
    <button class="btn ${inscrites.size && personnes.length === 1 ? 'o' : 'p'}" type="submit" style="width:100%;margin-top:10px">${inscrites.size && personnes.length === 1 ? '✓ Inscrit · ' : ''}${bouton}</button>
  </form>`;
}

// Ce qui change quand les inscrits d'une fiche ouverte sont relus : la liste, et mes propres inscriptions (dont dépend
// le formulaire : pour un compte d'une seule personne, son bouton inscrit ou désinscrit selon cette liste).
export function changementInscrits(avant, apres) {
  const cle = (liste) => JSON.stringify(liste);
  const miennes = (liste) => liste.filter((i) => i.a_moi).map((i) => `${i.personne_id}@${i.depart_id || 'd1'}`).sort().join(',');
  return { liste: cle(avant) !== cle(apres), miennes: miennes(avant) !== miennes(apres) };
}

const noms = (liste) => `<div class="noms">${liste.map((i) => `<div class="nm${i.a_moi ? ' moi' : ''}"><span class="av" style="background:${couleurAvatar(i.nom_affiche)}">${echapper(initiales(i.nom_affiche))}</span><span class="n">${echapper(i.nom_affiche)}</span>${i.inscrit_par ? ` <small>(par ${echapper(i.inscrit_par)})</small>` : ''}</div>`).join('')}</div>`;

export function renderInscrits(sortie) {
  const n = sortie.inscrits.length;
  const tete = `<div class="section">Inscrits <span>${n} · ordre alphabétique</span></div>`;
  const departs = departsSortie(sortie);
  if (departs.length < 2) return tete + noms(sortie.inscrits);
  return tete + departs.map((d) => {
    const liste = sortie.inscrits.filter((i) => (i.depart_id || 'd1') === d.id);
    return `<div class="sous-section">${echapper(d.point_rdv)} · ${echapper(d.heure)} — ${liste.length}</div>${noms(liste)}`;
  }).join('');
}

// Sortie libre, pour qui peut la modifier (son créateur, ou un admin) : la faire connaître sur WhatsApp.
// nouvelle : juste après la création, l'encart invite à prévenir le club.
function renderPartage(sortie, partage, nouvelle) {
  if (!partage || sortie.type !== 'libre' || !sortie.peut_modifier || sortie.statut === 'annulee') return '';
  const bouton = `<a class="btn whatsapp" href="${echapper(lienWhatsApp(partage.texte))}" target="_blank" rel="noopener">📲 Partager sur WhatsApp</a>`;
  return nouvelle
    ? `<div class="encart partage"><b>Prévenir le club</b><br>Le message est prêt, avec la météo et le lien d'inscription : choisissez le groupe du club dans WhatsApp, puis Envoyer.${bouton}</div>`
    : `<div class="partage">${bouton}</div>`;
}

// Sa propre sortie libre, une fois annulée : prévenir le club sur WhatsApp. Pas pour l'admin qui annule la sortie
// d'un autre : le club est alors prévenu automatiquement par mail et WhatsApp.
function renderPartageAnnulation(sortie, partageAnnulation, recente) {
  if (!partageAnnulation || sortie.type !== 'libre' || !sortie.mienne || sortie.statut !== 'annulee') return '';
  const bouton = `<a class="btn whatsapp" href="${echapper(lienWhatsApp(partageAnnulation.texte))}" target="_blank" rel="noopener">📲 Prévenir de l'annulation sur WhatsApp</a>`;
  return recente
    ? `<div class="encart partage"><b>Prévenir le club de l'annulation</b><br>Le message est prêt : choisissez le groupe du club dans WhatsApp, puis Envoyer.${bouton}</div>`
    : `<div class="partage">${bouton}</div>`;
}

// Un départ : « PDL · 09:00 » comme avant ; plusieurs : « 09:00 PDL · 09:30 Parking gare », chacun modifiable.
function enteteDeparts(sortie, annulee) {
  const departs = departsSortie(sortie);
  const heure = (h) => `<b style="color:var(--txt)">${echapper(h)}</b>`;
  if (departs.length < 2) return `${echapper(sortie.point_rdv)} · ${heure(sortie.heure)}`;
  const modifier = (d) => (sortie.peut_changer_horaire && !annulee ? ` <button class="lien-plus" data-action="horaire" data-depart="${echapper(d.id)}" title="Changer l'heure">✎</button>` : '');
  return departs.map((d) => `${heure(d.heure)} ${echapper(d.point_rdv)}${modifier(d)}`).join(' · ');
}

export function renderSortie(sortie, messages, personnes, { tousMessages = false, partage = null, nouvelle = false, partageAnnulation = null, annulationRecente = false } = {}) {
  const annulee = sortie.statut === 'annulee';
  const details = [sortie.lieu && `Secteur : ${echapper(sortie.lieu)}`, sortie.km && `${echapper(sortie.km)} km`, sortie.dplus && `${echapper(sortie.dplus)} m D+`].filter(Boolean).join(' · ');
  return `<article class="detail">
    <a class="retour" href="#/jour/${sortie.date}">‹ ${echapper(libelleJour(sortie.date))}</a>
    <div class="srow"><h1>${echapper(sortie.titre)}</h1>${badgeSortie(sortie)}</div>
    <div class="meta">📍 ${enteteDeparts(sortie, annulee)}${sortie.modifie_par && sortie.type === 'recurrente' ? ` <span class="modifie">(modifié par ${echapper(sortie.modifie_par)})</span>` : ''}
      ${sortie.peut_changer_horaire && !annulee && departsSortie(sortie).length < 2 ? '<button class="lien-plus" data-action="horaire" data-depart="d1">✎ changer l\'heure</button>' : ''}</div>
    ${details ? `<div class="meta">${details}</div>` : ''}
    ${sortie.description ? `<p class="meta" style="white-space:pre-wrap">${echapper(sortie.description)}</p>` : ''}
    ${renderPartage(sortie, partage, nouvelle)}
    ${renderPartageAnnulation(sortie, partageAnnulation, annulationRecente)}
    ${annulee ? `<p class="encart">Sortie annulée. Motif : ${echapper(sortie.motif_annulation || 'non précisé')}</p>` : ''}
    ${renderTraces(sortie)}
    <div id="zone-inscription">${renderInscription(sortie, personnes)}</div>
    <div id="inscrits">${renderInscrits(sortie)}</div>
    <div class="discussion" id="discussion">${renderDiscussion(messages, tousMessages)}</div>
    ${sortie.peut_modifier && !annulee ? `<div class="actions"><a class="btn o" href="#/modifier/${encodeURIComponent(sortie.id)}">✎ Modifier</a><button class="btn d" data-action="annuler">Annuler la sortie</button></div>` : ''}
  </article>`;
}

function telecharger(nom, contenu) {
  const url = URL.createObjectURL(new Blob([contenu], { type: 'application/gpx+xml' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Appels à envoyer pour passer des inscriptions actuelles (deja : personne → départ) aux personnes voulues, toutes
// au départ choisi : ajout et changement de départ en un appel, puis retrait des personnes décochées.
export function planInscription({ deja, voulues, depart }) {
  const appels = [];
  if (voulues.some((p) => !deja.has(p) || deja.get(p) !== depart)) appels.push({ personne_ids: voulues, inscrit: true, depart_id: depart });
  const retirer = [...deja.keys()].filter((p) => !voulues.includes(p));
  if (retirer.length) appels.push({ personne_ids: retirer, inscrit: false });
  return appels;
}

export function brancherSortie(racine, actions, sortie) {
  let messages = [];
  let tousMessages = false;
  const id = sortie.id;
  const zoneDiscussion = () => racine.querySelector('#discussion');

  const afficherDiscussion = () => {
    zoneDiscussion().innerHTML = renderDiscussion(messages, tousMessages);
    brancherSaisie();
  };
  // Inscrits relus avec la discussion : la liste suit les inscriptions faites depuis d'autres appareils.
  const mettreAJourInscrits = (inscrits) => {
    if (!Array.isArray(inscrits)) return;
    const change = changementInscrits(sortie.inscrits, inscrits);
    if (!change.liste) return;
    sortie.inscrits = inscrits; // la sortie est celle du calendrier en mémoire : il en profite aussi
    const zone = racine.querySelector('#inscrits');
    if (zone) zone.innerHTML = renderInscrits(sortie);
    const zoneForm = racine.querySelector('#zone-inscription');
    if (change.miennes && zoneForm) zoneForm.innerHTML = renderInscription(sortie, actions.etat.cal ? actions.etat.cal.personnes : []);
  };
  const chargerMessages = async () => {
    const depuis = messages.length ? messages[messages.length - 1].horodatage : '';
    const r = await actions.appeler('discussion_lire', { sortie_id: id, depuis, avec_inscrits: true });
    const nouveaux = Array.isArray(r) ? r : r.messages;
    mettreAJourInscrits(Array.isArray(r) ? null : r.inscrits);
    if (nouveaux.length || !messages.length) {
      messages = messages.concat(nouveaux);
      afficherDiscussion();
    }
  };
  const brancherSaisie = () => {
    const form = racine.querySelector('#form-message');
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const texte = form.texte.value.trim();
      if (!texte) return;
      try {
        await actions.appeler('discussion_ecrire', { sortie_id: id, texte });
        form.texte.value = '';
        await chargerMessages();
      } catch (e) { actions.toast(e.message); }
    });
  };

  racine.addEventListener('click', async (ev) => {
    const cible = ev.target.closest('button');
    if (!cible) return;
    try {
      if (cible.dataset.action === 'tous-messages') { tousMessages = true; afficherDiscussion(); }
      if (cible.dataset.action === 'horaire') {
        const depart = departsSortie(sortie).find((d) => d.id === (cible.dataset.depart || 'd1')) || departsSortie(sortie)[0];
        const heure = prompt(`Nouvelle heure de rendez-vous${departsSortie(sortie).length > 1 ? ` (${depart.point_rdv})` : ''} (HH:MM) :`, depart.heure);
        if (heure) { await actions.appeler('sortie_horaire', { sortie_id: id, depart_id: depart.id, heure: heure.trim() }); actions.toast('Horaire modifié.'); await actions.rafraichir(); }
      }
      if (cible.dataset.action === 'annuler') {
        const motif = prompt('Motif de l\'annulation (affiché aux adhérents) :');
        if (motif !== null) {
          await actions.appeler('sortie_annuler', { sortie_id: id, motif });
          actions.toast('Sortie annulée.');
          actions.etat.sortieAnnulee = id; // la fiche propose alors de prévenir le club sur WhatsApp
          await actions.rafraichir();
        }
      }
      if (cible.dataset.supprimer) {
        await actions.appeler('discussion_supprimer', { message_id: cible.dataset.supprimer });
        messages = messages.filter((m) => m.id !== cible.dataset.supprimer);
        afficherDiscussion();
      }
      if (cible.dataset.telecharger) {
        const t = await actions.appeler('trace_lire', { trace_id: cible.dataset.telecharger });
        telecharger(t.nom_fichier, t.contenu);
      }
      if (cible.dataset.supprimerTrace && confirm('Retirer cette trace de la sortie ?')) {
        await actions.appeler('trace_supprimer', { sortie_id: id, trace_id: cible.dataset.supprimerTrace });
        await actions.rafraichir();
      }
      if (cible.dataset.carte) {
        const boite = cible.closest('.trace').querySelector('.carte-trace');
        if (!boite.hidden) { boite.hidden = true; cible.textContent = '▸ Voir la carte'; return; }
        boite.hidden = false;
        cible.textContent = '▾ Masquer la carte';
        if (!boite.dataset.chargee) {
          const t = await actions.appeler('trace_lire', { trace_id: cible.dataset.carte });
          afficherCarte(boite, lirePoints(t.contenu));
          boite.dataset.chargee = '1';
        }
      }
    } catch (e) {
      actions.toast(e.message);
    }
  });

  // Écoute sur la racine : le formulaire peut être remplacé quand mes inscriptions changent ailleurs.
  if (racine.querySelector('#form-inscription')) {
    racine.addEventListener('submit', async (ev) => {
      if (ev.target.id !== 'form-inscription') return;
      ev.preventDefault();
      const formInscription = ev.target;
      const champs = [...formInscription.querySelectorAll('[name="personne"]')];
      const deja = new Map(sortie.inscrits.filter((i) => i.a_moi).map((i) => [i.personne_id, i.depart_id || 'd1']));
      const choixDepart = formInscription.querySelector('[name="depart"]:checked');
      const depart = choixDepart ? choixDepart.value : 'd1';
      const bouton = ev.submitter && ev.submitter.value;
      let voulues;
      if (champs.length === 1 && champs[0].type === 'hidden') {
        if (bouton === 'changer') voulues = [champs[0].value];
        else voulues = deja.size ? [] : [champs[0].value];
      } else voulues = champs.filter((c) => c.checked).map((c) => c.value);
      const appels = planInscription({ deja, voulues, depart });
      try {
        for (const a of appels) await actions.appeler('inscription', { sortie_id: id, ...a });
        actions.toast(appels.length ? 'Inscription enregistrée.' : 'Rien à changer.');
        await actions.rafraichir();
      } catch (e) {
        actions.toast(e.message);
        if (e.code === 'inscriptions_closes') await actions.rafraichir();
      }
    });
  }

  chargerMessages().catch((e) => actions.toast(e.message));
  arreterDiscussion();
  minuteurDiscussion = setInterval(() => {
    if (document.visibilityState === 'visible') chargerMessages().catch(() => {});
  }, INTERVALLE_DISCUSSION_MS);
}
