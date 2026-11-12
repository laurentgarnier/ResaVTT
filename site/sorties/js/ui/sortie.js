// Détail d'une sortie : informations, traces GPX, inscription, liste des inscrits, discussion.
import { echapper, initiales, couleurAvatar } from '../logique/html.js';
import { libelleJour } from '../logique/dates.js';
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

function renderInscription(sortie, personnes) {
  if (sortie.statut === 'annulee') return '';
  if (!sortie.inscriptions_ouvertes) return '<p class="mut">Inscriptions closes : l\'heure du rendez-vous est passée.</p>';
  const inscrites = new Set(sortie.inscrits.filter((i) => i.a_moi).map((i) => i.personne_id));
  const choix = personnes.length > 1
    ? `<div class="choix-personnes">${personnes.map((p) => `<label><input type="checkbox" name="personne" value="${echapper(p.id)}"${inscrites.has(p.id) ? ' checked' : ''}> ${echapper(p.nom_affiche)}</label>`).join('')}</div>`
    : `<input type="hidden" name="personne" value="${echapper(personnes[0] ? personnes[0].id : '')}">`;
  let bouton;
  if (personnes.length > 1) bouton = inscrites.size ? 'Mettre à jour mon inscription' : "M'inscrire";
  else bouton = inscrites.size ? 'Me désinscrire' : "M'inscrire";
  return `<form id="form-inscription" data-inscrit="${inscrites.size ? '1' : '0'}">
    ${choix}
    <button class="btn ${inscrites.size && personnes.length === 1 ? 'o' : 'p'}" type="submit" style="width:100%;margin-top:10px">${inscrites.size && personnes.length === 1 ? '✓ Inscrit · ' : ''}${bouton}</button>
  </form>`;
}

function renderInscrits(sortie) {
  const n = sortie.inscrits.length;
  return `<div class="section">Inscrits <span>${n} · ordre alphabétique</span></div>
    <div class="noms">${sortie.inscrits.map((i) => `<div class="nm${i.a_moi ? ' moi' : ''}"><span class="av" style="background:${couleurAvatar(i.nom_affiche)}">${echapper(initiales(i.nom_affiche))}</span><span class="n">${echapper(i.nom_affiche)}</span>${i.inscrit_par ? ` <small>(par ${echapper(i.inscrit_par)})</small>` : ''}</div>`).join('')}</div>`;
}

export function renderSortie(sortie, messages, personnes, { tousMessages = false } = {}) {
  const annulee = sortie.statut === 'annulee';
  const details = [sortie.lieu && `Secteur : ${echapper(sortie.lieu)}`, sortie.km && `${echapper(sortie.km)} km`, sortie.dplus && `${echapper(sortie.dplus)} m D+`].filter(Boolean).join(' · ');
  return `<article class="detail">
    <a class="retour" href="#/jour/${sortie.date}">‹ ${echapper(libelleJour(sortie.date))}</a>
    <div class="srow"><h1>${echapper(sortie.titre)}</h1>${badgeSortie(sortie)}</div>
    <div class="meta">📍 ${echapper(sortie.point_rdv)} · <b style="color:var(--txt)">${echapper(sortie.heure)}</b>${sortie.modifie_par && sortie.type === 'recurrente' ? ` <span class="modifie">(modifié par ${echapper(sortie.modifie_par)})</span>` : ''}
      ${sortie.peut_changer_horaire && !annulee ? '<button class="lien-plus" data-action="horaire">✎ changer l\'heure</button>' : ''}</div>
    ${details ? `<div class="meta">${details}</div>` : ''}
    ${sortie.description ? `<p class="meta" style="white-space:pre-wrap">${echapper(sortie.description)}</p>` : ''}
    ${annulee ? `<p class="encart">Sortie annulée. Motif : ${echapper(sortie.motif_annulation || 'non précisé')}</p>` : ''}
    ${renderTraces(sortie)}
    ${renderInscription(sortie, personnes)}
    ${renderInscrits(sortie)}
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

export function brancherSortie(racine, actions, sortie) {
  let messages = [];
  let tousMessages = false;
  const id = sortie.id;
  const zoneDiscussion = () => racine.querySelector('#discussion');

  const afficherDiscussion = () => {
    zoneDiscussion().innerHTML = renderDiscussion(messages, tousMessages);
    brancherSaisie();
  };
  const chargerMessages = async () => {
    const depuis = messages.length ? messages[messages.length - 1].horodatage : '';
    const nouveaux = await actions.appeler('discussion_lire', { sortie_id: id, depuis });
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
        const heure = prompt('Nouvelle heure de rendez-vous (HH:MM) :', sortie.heure);
        if (heure) { await actions.appeler('sortie_horaire', { sortie_id: id, heure: heure.trim() }); actions.toast('Horaire modifié.'); await actions.rafraichir(); }
      }
      if (cible.dataset.action === 'annuler') {
        const motif = prompt('Motif de l\'annulation (affiché aux adhérents) :');
        if (motif !== null) { await actions.appeler('sortie_annuler', { sortie_id: id, motif }); actions.toast('Sortie annulée.'); await actions.rafraichir(); }
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

  const formInscription = racine.querySelector('#form-inscription');
  if (formInscription) {
    formInscription.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const champs = [...formInscription.querySelectorAll('[name="personne"]')];
      const deja = new Set(sortie.inscrits.filter((i) => i.a_moi).map((i) => i.personne_id));
      let voulues;
      if (champs.length === 1 && champs[0].type === 'hidden') voulues = deja.size ? [] : [champs[0].value];
      else voulues = champs.filter((c) => c.checked).map((c) => c.value);
      const ajouter = voulues.filter((p) => !deja.has(p));
      const retirer = [...deja].filter((p) => !voulues.includes(p));
      try {
        if (ajouter.length) await actions.appeler('inscription', { sortie_id: id, personne_ids: ajouter, inscrit: true });
        if (retirer.length) await actions.appeler('inscription', { sortie_id: id, personne_ids: retirer, inscrit: false });
        actions.toast(ajouter.length || retirer.length ? 'Inscription enregistrée.' : 'Rien à changer.');
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
