// Page d'administration : code par email, récurrences, fermetures, paramètres, messages et envois.
import { echapper } from '../logique/html.js';
import { aujourdhuiLocal } from '../logique/dates.js';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const ONGLETS_ADMIN = [['recurrences', 'Récurrences'], ['fermetures', 'Fermetures'], ['parametres', 'Paramètres'], ['messages', 'Messages'], ['stats', 'Statistiques']];
const LIBELLES_MODELES = {
  rappel_mail_objet: 'Rappel du jeudi : objet du mail',
  rappel_mail_corps: 'Rappel du jeudi : texte du mail',
  rappel_whatsapp: 'Rappel du jeudi : message WhatsApp',
  annulation_mail_objet: 'Annulation : objet du mail',
  annulation_mail_corps: 'Annulation : texte du mail',
  annulation_whatsapp: 'Annulation : message WhatsApp',
};

export function renderCode({ envoye = false, erreur = '', essais_restants: essais } = {}) {
  return `<section class="admin">
    <a class="retour" href="#/">‹ Calendrier</a>
    <h1 style="font-size:20px;margin:0">⚙ Administration</h1>
    <div class="bloc">
      <p>Pour protéger l'administration, un code à 6 chiffres est demandé une fois sur chaque appareil.</p>
      ${envoye ? `<p class="mut">Un code a été envoyé à votre adresse email. Il est valable 15 minutes.</p>
      <form id="form-code">
        <input class="code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="\\d{6}" required aria-label="Code reçu par email">
        ${erreur ? `<p class="erreur">${echapper(erreur)}${essais != null ? ` (${essais} essai${essais > 1 ? 's' : ''} restant${essais > 1 ? 's' : ''})` : ''}</p>` : ''}
        <button class="btn p" type="submit" style="width:100%;margin-top:10px">Valider</button>
      </form>
      <button class="lien-plus" data-action="demander-code">Renvoyer un code</button>`
    : `${erreur ? `<p class="erreur">${echapper(erreur)}</p>` : ''}<button class="btn p" data-action="demander-code" style="width:100%">Recevoir un code par email</button>`}
    </div>
  </section>`;
}

function frequence(n) {
  const f = Number(n) || 1;
  return f === 1 ? 'Chaque semaine' : `Toutes les ${f} semaines`;
}

function optionsJours(choisi) {
  return JOURS.map((j, i) => `<option value="${i}"${String(i) === String(choisi) ? ' selected' : ''}>${j}</option>`).join('');
}

function formulaireRegle(regle, sorties) {
  const r = regle || { nom: '', jour: '1', heure: '18:30', point_rdv: '', frequence_semaines: '1', date_depart: aujourdhuiLocal(), active: true };
  return `<form class="bloc" id="form-regle" data-id="${echapper(regle ? regle.id : '')}">
    <h3>${regle ? `✎ Modifier « ${echapper(regle.nom)} »` : '+ Nouvelle récurrence'}</h3>
    <label>Nom</label><input name="nom" value="${echapper(r.nom)}" required maxlength="60" placeholder="Mardi soir">
    <div class="ligne2">
      <div><label>Jour</label><select name="jour">${optionsJours(r.jour)}</select></div>
      <div><label>Heure</label><input name="heure" type="time" value="${echapper(r.heure)}" required></div>
    </div>
    <label>Point de rendez-vous</label><input name="point_rdv" value="${echapper(r.point_rdv)}" maxlength="120">
    <div class="ligne2">
      <div><label>Fréquence</label><select name="frequence_semaines">${[1, 2, 3, 4].map((n) => `<option value="${n}"${String(n) === String(r.frequence_semaines) ? ' selected' : ''}>${frequence(n)}</option>`).join('')}</select></div>
      <div><label>À partir du</label><input name="date_depart" type="date" value="${echapper(r.date_depart)}" required></div>
    </div>
    <label>Sorties créées (une par ligne, par exemple les groupes de niveau)</label>
    <textarea name="titres" required>${echapper(sorties.map((s) => s.titre).join('\n'))}</textarea>
    <div class="actions"><button class="btn p" type="submit">Enregistrer</button><a class="btn o" href="#/admin/recurrences">Annuler</a></div>
  </form>`;
}

const lienRegle = (id) => `#/admin/recurrences/${encodeURIComponent(id)}`;

// Écran dédié à une récurrence (création ou modification), comme la création d'une sortie.
function ecranRegle(d, regleEditee) {
  const retour = '<a class="retour" href="#/admin/recurrences">‹ Récurrences</a>';
  if (regleEditee === 'nouvelle') return `${retour}${formulaireRegle(null, [])}`;
  const regle = d.regles.find((r) => r.id === regleEditee);
  if (!regle) return `${retour}<p class="mut">Cette récurrence n'existe plus.</p>`;
  const sorties = d.regle_sorties.filter((s) => s.regle_id === regle.id).sort((a, b) => Number(a.ordre) - Number(b.ordre));
  return `${retour}${formulaireRegle(regle, sorties)}`;
}

function ongletRecurrences(d) {
  const sortiesDe = (id) => d.regle_sorties.filter((s) => s.regle_id === id).sort((a, b) => Number(a.ordre) - Number(b.ordre));
  return `<a class="btn p nouvelle-regle" href="#/admin/recurrences/nouvelle">+ Nouvelle récurrence</a>`
    + d.regles.map((r) => `<div class="bloc">
      <h3><span>${echapper(r.nom)}</span><label class="interrupteur"><input type="checkbox" data-active="${echapper(r.id)}"${r.active ? ' checked' : ''}> active</label></h3>
      <div class="meta">${frequence(r.frequence_semaines)} · ${echapper(r.heure)} · ${echapper(r.point_rdv)} · ${JOURS[Number(r.jour)]}</div>
      <ul>${sortiesDe(r.id).map((s) => `<li>${echapper(s.titre)}</li>`).join('')}</ul>
      <div class="actions"><a class="btn o" href="${echapper(lienRegle(r.id))}">✎ Modifier</a><button class="btn d" data-supprimer-regle="${echapper(r.id)}">Supprimer</button></div>
    </div>`).join('')
    + '<p class="meta">Les sorties apparaissent automatiquement jusqu\'à la fin de la semaine prochaine. Modifier une règle ne change pas les sorties déjà affichées.</p>';
}

function ongletFermetures(d) {
  const nomRegle = (id) => (id ? (d.regles.find((r) => r.id === id) || { nom: 'Règle supprimée' }).nom : 'Toutes les sorties récurrentes');
  return `${d.fermetures.length ? d.fermetures.map((f) => `<div class="bloc">
      <h3><span>${echapper(f.debut)}${f.fin !== f.debut ? ` → ${echapper(f.fin)}` : ''}</span><button class="btn o" data-supprimer-fermeture="${echapper(f.id)}">Retirer</button></h3>
      <div class="meta">${echapper(nomRegle(f.regle_id))} · ${echapper(f.motif)}</div></div>`).join('') : '<p class="mut">Aucune fermeture.</p>'}
    <form class="bloc" id="form-fermeture">
      <h3>+ Fermer une période</h3>
      <div class="ligne2">
        <div><label>Du</label><input name="debut" type="date" required></div>
        <div><label>Au</label><input name="fin" type="date" required></div>
      </div>
      <label>Sorties concernées</label>
      <select name="regle_id"><option value="">Toutes les sorties récurrentes</option>${d.regles.map((r) => `<option value="${echapper(r.id)}">${echapper(r.nom)}</option>`).join('')}</select>
      <label>Motif (affiché aux adhérents)</label><input name="motif" maxlength="200" placeholder="Vacances, arrêté préfectoral…">
      <p class="meta">Les sorties déjà affichées sur la période sont annulées, et les adhérents prévenus par mail et WhatsApp.</p>
      <button class="btn p" type="submit" style="width:100%;margin-top:8px">Fermer la période</button>
    </form>`;
}

function ongletParametres(d) {
  const p = d.parametres;
  const c = (nom, libelle, attributs = '') => `<label>${libelle}</label><input name="${nom}" value="${echapper(p[nom])}" ${attributs}>`;
  return `<form class="bloc" id="form-parametres">
    <h3>Commune (pour la météo)</h3>
    <div class="ligne2"><div><input name="commune_nom" value="${echapper(p.commune_nom)}" aria-label="Commune"></div><button class="btn o" type="button" data-action="geocoder">Rechercher</button></div>
    <input type="hidden" name="commune_lat" value="${echapper(p.commune_lat)}"><input type="hidden" name="commune_lon" value="${echapper(p.commune_lon)}">
    <div id="resultats-commune" class="meta">Coordonnées : ${echapper(p.commune_lat)}, ${echapper(p.commune_lon)}</div>
    ${c('point_rdv_defaut', 'Point de rendez-vous par défaut', 'maxlength="120"')}
    <div class="ligne2">
      <div><label>Jour du rappel</label><select name="rappel_jour">${optionsJours(p.rappel_jour)}</select></div>
      <div>${c('rappel_heure', 'Heure du rappel', 'type="time"')}</div>
    </div>
    ${c('adresse_liste', 'Adresse de la liste de diffusion (Google Groupe)', 'type="email"')}
    ${c('destinataires_whatsapp', 'Qui reçoit le message WhatsApp à poster (emails, séparés par des virgules)')}
    ${c('whatsapp_numero', 'Numéro WhatsApp à ouvrir directement (facultatif, sinon choix du groupe)')}
    ${c('email_alertes', 'Email prévenu en cas d\'échec d\'envoi', 'type="email"')}
    ${c('url_appli', 'Adresse de l\'appli (lien des messages)', 'type="url"')}
    ${c('conservation_mois', 'Durée de conservation des sorties (mois) ; leurs chiffres restent dans les statistiques', 'type="number" min="1" max="36"')}
    <button class="btn p" type="submit" style="width:100%;margin-top:12px">Enregistrer les paramètres</button>
  </form>`;
}

function etape(nom, valeur) {
  return valeur === 'ok' ? `<span class="ok">✓ ${nom}</span>` : `<span class="ko">✗ ${nom}</span>`;
}

function ongletMessages(d) {
  return `<div class="bloc">
      <h3>Rappel du jeudi</h3>
      <p class="meta">Envoyé automatiquement chaque semaine. Pour une démonstration ou un test, vous pouvez l'envoyer tout de suite.</p>
      <button class="btn p" data-action="rappel-maintenant" style="width:100%">📨 Envoyer le rappel maintenant</button>
    </div>
    <div class="bloc"><h3>Derniers envois</h3>
      ${d.envois.length ? d.envois.map((e) => `<div class="envoi"><span>${echapper(e.cle)}<br><small class="mut">${echapper(e.horodatage)}</small>${e.derniere_erreur ? `<br><small class="ko">${echapper(e.derniere_erreur)} (${echapper(e.tentatives)} essai·s)</small>` : ''}</span><span>${etape('mail', e.etape_mail)}<br>${etape('WhatsApp', e.etape_whatsapp)}</span></div>`).join('') : '<p class="mut">Aucun envoi pour l\'instant.</p>'}
    </div>
    <form class="bloc" id="form-modeles">
      <h3>Textes des messages</h3>
      <p class="meta">{{lien}} est remplacé par l'adresse de l'appli ; dans le rappel, {{lien_samedi}} et {{lien_dimanche}} par les liens vers le samedi et le dimanche qui suivent l'envoi ; {{liste_annulations}} par la liste des sorties annulées.</p>
      ${Object.entries(LIBELLES_MODELES).map(([cle, libelle]) => `<label>${libelle}</label><textarea name="${cle}">${echapper(d.modeles[cle])}</textarea>`).join('')}
      <button class="btn p" type="submit" style="width:100%;margin-top:12px">Enregistrer les textes</button>
    </form>`;
}

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function decimale(n) {
  return String(Math.round(n * 10) / 10).replace('.', ',');
}

// Barre proportionnelle au maximum de la série (aucune barre si la série est vide).
function barre(valeur, max) {
  return `<span class="jauge"><i style="width:${max ? Math.round((valeur / max) * 100) : 0}%"></i></span>`;
}

function ongletStats(s) {
  const annees = `<nav class="annees">${s.annees.map((a) => `<a href="#/admin/stats/${a}"${a === s.annee ? ' class="on"' : ''}>${a}</a>`).join('')}</nav>`;
  if (!s.sorties) return `${annees}<div class="bloc"><p class="mut">Aucune sortie passée en ${s.annee}.</p></div>`;
  const maxMois = Math.max(...s.par_mois.map((m) => m.participants));
  const maxDemi = Math.max(...s.par_demi_journee.flatMap((d) => [d.matin, d.apres_midi]));
  return `${annees}
    <div class="chiffres">
      <div><b>${s.sorties}</b> sorties proposées</div>
      <div><b>${s.participants}</b> participants<br><small class="mut">${decimale(s.participants / s.sorties)} par sortie</small></div>
    </div>
    ${s.annulees ? `<p class="meta">${s.annulees} sortie${s.annulees > 1 ? 's' : ''} annulée${s.annulees > 1 ? 's' : ''}, non comptée${s.annulees > 1 ? 's' : ''}.</p>` : ''}
    <div class="bloc stats">
      <h3>Participants par mois</h3>
      ${s.par_mois.map((m) => `<div class="ligne-stat"><span>${MOIS[m.mois - 1]}</span>${barre(m.participants, maxMois)}<small>${m.participants} participants · ${m.sorties} sorties</small></div>`).join('')}
    </div>
    <div class="bloc stats">
      <h3>Participants par demi-journée</h3>
      <table class="demi-journees"><thead><tr><th></th><th>Matin</th><th>Après-midi</th></tr></thead><tbody>
      ${s.par_demi_journee.map((d) => `<tr><th>${JOURS[d.jour]}</th><td>${barre(d.matin, maxDemi)}${d.matin}</td><td>${barre(d.apres_midi, maxDemi)}${d.apres_midi}</td></tr>`).join('')}
      </tbody></table>
      <p class="meta">Matin : départ avant 13 h. Sorties annulées non comptées.</p>
    </div>`;
}

export function renderAdmin(d, onglet, { regleEditee } = {}) {
  if (onglet === 'recurrences' && regleEditee) return `<section class="admin">${ecranRegle(d, regleEditee)}</section>`;
  const contenu = { recurrences: () => ongletRecurrences(d), fermetures: () => ongletFermetures(d), parametres: () => ongletParametres(d), messages: () => ongletMessages(d), stats: () => ongletStats(d) }[onglet] || (() => ongletRecurrences(d));
  return `<section class="admin">
    <a class="retour" href="#/">‹ Calendrier</a>
    <h1 style="font-size:20px;margin:0">⚙ Administration</h1>
    <nav class="menu-admin">${ONGLETS_ADMIN.map(([id, titre]) => `<a href="#/admin/${id}"${id === onglet ? ' class="on"' : ''}>${titre}</a>`).join('')}</nav>
    ${contenu()}
  </section>`;
}

export function brancherCode(racine, actions, rafraichirEcran) {
  racine.addEventListener('click', async (ev) => {
    if (!ev.target.closest('[data-action="demander-code"]')) return;
    try {
      await actions.appeler('admin_code_demander');
      rafraichirEcran({ envoye: true });
    } catch (e) {
      rafraichirEcran({ envoye: false, erreur: e.message });
    }
  });
  racine.addEventListener('submit', async (ev) => {
    if (ev.target.id !== 'form-code') return;
    ev.preventDefault();
    try {
      await actions.appeler('admin_code_verifier', { code: ev.target.code.value.trim() });
      actions.toast('Accès administrateur activé sur cet appareil.');
      await actions.rafraichir();
    } catch (e) {
      rafraichirEcran({ envoye: e.code !== 'trop_essais' && e.code !== 'code_expire', erreur: e.message, essais_restants: e.essais_restants });
    }
  });
}

function titresVersSorties(regleId, texte, existantes) {
  return texte.split('\n').map((t) => t.trim()).filter(Boolean).map((titre, i) => {
    const avant = existantes.find((s) => s.titre === titre) || {};
    return { ...avant, regle_id: regleId, ordre: String(i + 1), titre };
  });
}

export function brancherAdmin(racine, actions, d, reafficher) {
  // retour : écran à rouvrir après l'enregistrement (la liste, après l'écran d'une récurrence).
  const enregistrer = async (donnees, message, retour) => {
    try {
      await actions.appeler('admin_enregistrer', donnees);
      actions.toast(message);
      if (retour && location.hash !== retour) location.hash = retour;
      else await actions.rafraichir();
    } catch (e) { actions.toast(e.message); }
  };
  racine.addEventListener('change', (ev) => {
    const id = ev.target.dataset && ev.target.dataset.active;
    if (!id) return;
    const regles = d.regles.map((r) => (r.id === id ? { ...r, active: ev.target.checked } : r));
    enregistrer({ regles, regle_sorties: d.regle_sorties }, ev.target.checked ? 'Récurrence activée.' : 'Récurrence suspendue.');
  });
  racine.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.supprimerRegle && confirm('Supprimer cette récurrence ? Les sorties déjà affichées restent.')) {
      enregistrer({ regles: d.regles.filter((r) => r.id !== b.dataset.supprimerRegle), regle_sorties: d.regle_sorties.filter((s) => s.regle_id !== b.dataset.supprimerRegle) }, 'Récurrence supprimée.');
    }
    if (b.dataset.supprimerFermeture) enregistrer({ fermetures: d.fermetures.filter((f) => f.id !== b.dataset.supprimerFermeture) }, 'Fermeture retirée (les sorties déjà annulées le restent).');
    if (b.dataset.action === 'rappel-maintenant') {
      b.disabled = true;
      try {
        const r = await actions.appeler('rappel_envoyer_maintenant');
        actions.toast(r.etape_mail === 'ok' && r.etape_whatsapp === 'ok' ? 'Rappel envoyé : vérifiez vos mails.' : 'Envoi incomplet : voir les derniers envois.');
      } catch (e) { actions.toast(e.message); }
      reafficher({});
    }
    if (b.dataset.action === 'geocoder') {
      const form = racine.querySelector('#form-parametres');
      const zone = racine.querySelector('#resultats-commune');
      try {
        const res = await actions.appeler('admin_geocoder', { nom: form.commune_nom.value });
        zone.innerHTML = res.length ? res.map((c, i) => `<button type="button" class="lien-plus" data-commune="${i}">${echapper(c.nom)} (${echapper(c.departement)})</button>`).join(' · ') : 'Aucune commune trouvée.';
        zone.onclick = (e2) => {
          const cb = e2.target.closest('[data-commune]');
          if (!cb) return;
          const c = res[Number(cb.dataset.commune)];
          form.commune_nom.value = c.nom;
          form.commune_lat.value = String(c.lat);
          form.commune_lon.value = String(c.lon);
          zone.textContent = `Choisie : ${c.nom}, coordonnées ${c.lat}, ${c.lon}. Pensez à enregistrer.`;
        };
      } catch (e) { actions.toast(e.message); }
    }
  });
  racine.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = ev.target;
    if (f.id === 'form-regle') {
      const id = f.dataset.id;
      const regle = { nom: f.nom.value, jour: f.jour.value, heure: f.heure.value, point_rdv: f.point_rdv.value, frequence_semaines: f.frequence_semaines.value, date_depart: f.date_depart.value, active: true };
      if (id) {
        const regles = d.regles.map((r) => (r.id === id ? { ...r, ...regle, active: r.active } : r));
        const autres = d.regle_sorties.filter((s) => s.regle_id !== id);
        enregistrer({ regles, regle_sorties: autres.concat(titresVersSorties(id, f.titres.value, d.regle_sorties.filter((s) => s.regle_id === id))) }, 'Récurrence modifiée.', '#/admin/recurrences');
      } else {
        enregistrer({ regles: d.regles.concat([regle]), regle_sorties: d.regle_sorties.concat(titresVersSorties('__nouvelle_0', f.titres.value, [])) }, 'Récurrence créée.', '#/admin/recurrences');
      }
    }
    if (f.id === 'form-fermeture') {
      const fermeture = { debut: f.debut.value, fin: f.fin.value || f.debut.value, regle_id: f.regle_id.value, motif: f.motif.value };
      enregistrer({ fermetures: d.fermetures.concat([fermeture]) }, 'Période fermée : les adhérents seront prévenus.');
    }
    if (f.id === 'form-parametres') {
      enregistrer({ parametres: Object.fromEntries([...new FormData(f)].map(([k, v]) => [k, String(v)])) }, 'Paramètres enregistrés.');
    }
    if (f.id === 'form-modeles') {
      enregistrer({ modeles: Object.fromEntries([...new FormData(f)].map(([k, v]) => [k, String(v)])) }, 'Textes enregistrés.');
    }
  });
}
