// Page « Remorque » : calendrier mois par mois, demande de réservation, mes demandes, espace des gestionnaires.
import { echapper } from '../logique/html.js';
import { semainesDuMois, periodeDuJour, moisVoisin, libelleMois } from '../logique/remorque.js';

const STATUTS = {
  demandee: 'Demandée',
  validee: 'Réservée',
  bloquee: 'Bloquée',
  refusee: 'Refusée',
  annulee: 'Annulée',
};
const MOTIFS = { club: 'Utilisation par le club', indisponible: 'Non disponible' };
const JOURS_COURTS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const dateFr = (iso) => { const [a, m, j] = String(iso).split('-'); return `${j}/${m}/${a}`; };
export const periodeFr = (p) => (p.debut === p.fin ? `le ${dateFr(p.debut)}` : `du ${dateFr(p.debut)} au ${dateFr(p.fin)}`);

function libellePeriode(p) {
  const qui = p.statut === 'bloquee' ? MOTIFS[p.motif] || 'Bloquée' : p.demandeur_nom ? `${STATUTS[p.statut]} par ${p.demandeur_nom}` : STATUTS[p.statut];
  return `${qui} ${periodeFr(p)}${p.a_moi ? ' (votre demande)' : ''}${p.commentaire ? ` — ${p.commentaire}` : ''}`;
}

function grille(d, mois, choix) {
  const semaines = semainesDuMois(mois);
  const cases = semaines.map((s) => `<tr>${s.map((date) => {
    if (!date) return '<td class="hors"></td>';
    const p = periodeDuJour(date, d.periodes);
    const classes = [p ? `r-${p.statut}` : 'r-libre', date === d.aujourdhui ? 'r-aujourdhui' : '', date < d.aujourdhui ? 'r-passe' : '',
      choix && choix.debut && date >= choix.debut && date <= (choix.fin || choix.debut) ? 'r-choisi' : ''].filter(Boolean).join(' ');
    const titre = p ? libellePeriode(p) : 'Libre';
    return `<td><button type="button" class="${classes}" data-jour="${date}" title="${echapper(titre)}" aria-label="${Number(date.slice(8))} : ${echapper(titre)}">${Number(date.slice(8))}${p && p.statut === 'bloquee' ? '<i aria-hidden="true">🔒</i>' : ''}</button></td>`;
  }).join('')}</tr>`).join('');
  return `<div class="bloc remorque-mois">
    <div class="remorque-nav">
      <a class="btn o" href="#/remorque/${moisVoisin(mois, -1)}" aria-label="Mois précédent">‹</a>
      <h2>${libelleMois(mois)}</h2>
      <a class="btn o" href="#/remorque/${moisVoisin(mois, 1)}" aria-label="Mois suivant">›</a>
    </div>
    <table class="remorque-grille"><thead><tr>${JOURS_COURTS.map((j) => `<th>${j}</th>`).join('')}</tr></thead><tbody>${cases}</tbody></table>
    <div class="remorque-legende"><span class="r-libre">Libre</span><span class="r-demandee">Demandée</span><span class="r-validee">Réservée</span><span class="r-bloquee">🔒 Bloquée</span></div>
    <p class="meta" id="remorque-detail" aria-live="polite">Touchez un jour libre pour choisir le début puis la fin de votre demande.</p>
  </div>`;
}

function formulaireDemande(choix) {
  return `<form class="bloc" id="form-remorque-demande">
    <h3>Demander la remorque</h3>
    <div class="ligne2">
      <div><label for="remorque-debut">Du</label><input id="remorque-debut" type="date" name="debut" required value="${echapper(choix.debut || '')}"></div>
      <div><label for="remorque-fin">Au (inclus)</label><input id="remorque-fin" type="date" name="fin" required value="${echapper(choix.fin || choix.debut || '')}"></div>
    </div>
    <label for="remorque-commentaire">Pour quoi faire ?</label>
    <input id="remorque-commentaire" name="commentaire" maxlength="300" placeholder="Ex. week-end en Ardèche">
    <p class="meta">Les gestionnaires de la remorque sont prévenus par email ; vous recevez leur réponse par email si votre adresse est connue du club.</p>
    <button class="btn p" type="submit" style="width:100%;margin-top:10px">Envoyer la demande</button>
  </form>`;
}

function mesDemandes(d) {
  if (!d.mes_demandes.length) return '';
  return `<div class="bloc"><h3>Mes demandes</h3>
    ${d.mes_demandes.map((m) => `<div class="remorque-ligne">
      <span><span class="badge r-${m.statut}">${STATUTS[m.statut]}</span> ${periodeFr(m)}${m.commentaire ? `<br><small class="mut">${echapper(m.commentaire)}</small>` : ''}${m.statut === 'refusee' && m.motif ? `<br><small class="mut">Motif : ${echapper(m.motif)}</small>` : ''}</span>
      ${['demandee', 'validee'].includes(m.statut) && m.fin >= d.aujourdhui ? `<button type="button" class="btn o" data-annuler="${echapper(m.id)}">Annuler</button>` : ''}
    </div>`).join('')}
  </div>`;
}

function blocCode({ envoye, erreur }) {
  return `<div class="bloc"><h3>Gestion de la remorque</h3>
    <p>Vous êtes gestionnaire de la remorque. Pour valider les demandes, un code à 6 chiffres est demandé une fois sur chaque appareil.</p>
    ${envoye ? `<p class="mut">Un code a été envoyé à votre adresse email. Il est valable 15 minutes.</p>
    <form id="form-remorque-code">
      <input class="code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="\\d{6}" required aria-label="Code reçu par email">
      ${erreur ? `<p class="erreur">${echapper(erreur)}</p>` : ''}
      <button class="btn p" type="submit" style="width:100%;margin-top:10px">Valider</button>
    </form>
    <button type="button" class="lien-plus" data-action="code-remorque">Renvoyer un code</button>`
    : `${erreur ? `<p class="erreur">${echapper(erreur)}</p>` : ''}<button type="button" class="btn p" data-action="code-remorque" style="width:100%">Recevoir un code par email</button>`}
  </div>`;
}

function espaceGestionnaire(d, code) {
  if (!d.est_gestionnaire) return '';
  if (!d.verifie) return blocCode(code);
  return `<div class="bloc"><h3>À valider <span class="badge r-demandee">${d.a_valider.length}</span></h3>
      ${d.a_valider.length ? d.a_valider.map((p) => `<div class="remorque-ligne">
        <span><b>${echapper(p.demandeur_nom)}</b> ${periodeFr(p)}${p.commentaire ? `<br><small class="mut">${echapper(p.commentaire)}</small>` : ''}</span>
        <span class="remorque-actions"><button type="button" class="btn p" data-valider="${echapper(p.id)}">Valider</button><button type="button" class="btn o" data-refuser="${echapper(p.id)}">Refuser</button></span>
      </div>`).join('') : '<p class="mut">Aucune demande en attente.</p>'}
    </div>
    <form class="bloc" id="form-remorque-blocage">
      <h3>Bloquer la remorque</h3>
      <div class="ligne2">
        <div><label for="blocage-debut">Du</label><input id="blocage-debut" type="date" name="debut" required></div>
        <div><label for="blocage-fin">Au (inclus)</label><input id="blocage-fin" type="date" name="fin" required></div>
      </div>
      <label for="blocage-motif">Motif</label>
      <select id="blocage-motif" name="motif">${Object.entries(MOTIFS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
      <label for="blocage-commentaire">Précision (facultatif)</label>
      <input id="blocage-commentaire" name="commentaire" maxlength="300" placeholder="Ex. révision, rando du club">
      <p class="meta">Les demandes en attente sur cette période sont refusées et leurs demandeurs prévenus.</p>
      <button class="btn p" type="submit" style="width:100%;margin-top:10px">Bloquer</button>
    </form>
    ${d.blocages.length ? `<div class="bloc"><h3>Blocages en cours</h3>${d.blocages.map((p) => `<div class="remorque-ligne">
      <span>🔒 ${MOTIFS[p.motif] || ''} ${periodeFr(p)}${p.commentaire ? `<br><small class="mut">${echapper(p.commentaire)}</small>` : ''}</span>
      <button type="button" class="btn o" data-debloquer="${echapper(p.id)}">Débloquer</button>
    </div>`).join('')}</div>` : ''}`;
}

export function renderRemorque(d, { mois, choix = {}, code = {} } = {}) {
  return `<section class="admin remorque">
    <a class="retour" href="#/">‹ Calendrier</a>
    <h1 style="font-size:20px;margin:0">🚚 Remorque</h1>
    ${grille(d, mois, choix)}
    ${formulaireDemande(choix)}
    ${mesDemandes(d)}
    ${espaceGestionnaire(d, code)}
  </section>`;
}

// options : { mois, choix, code } ; reafficher(options) redessine la page (après une action ou un choix de jour).
export function brancherRemorque(racine, actions, d, options, reafficher) {
  const executer = async (action, params, message) => {
    try {
      await actions.appeler(action, params);
      actions.toast(message);
      reafficher({ ...options, choix: {} });
    } catch (e) {
      actions.toast(e.message);
    }
  };
  racine.addEventListener('click', async (ev) => {
    const jour = ev.target.closest('[data-jour]');
    if (jour) {
      const date = jour.dataset.jour;
      const p = periodeDuJour(date, d.periodes);
      if (p) { racine.querySelector('#remorque-detail').textContent = libellePeriode(p); return; }
      if (date < d.aujourdhui) return;
      const c = options.choix || {};
      const choix = c.debut && !c.fin && date >= c.debut ? { debut: c.debut, fin: date } : { debut: date };
      reafficher({ ...options, choix });
      return;
    }
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.annuler && window.confirm('Annuler cette demande ?')) executer('remorque_annuler', { id: b.dataset.annuler }, 'Demande annulée.');
    else if (b.dataset.valider) executer('remorque_valider', { id: b.dataset.valider }, 'Réservation validée.');
    else if (b.dataset.refuser) {
      const motif = window.prompt('Motif du refus (facultatif, envoyé au demandeur) :', '');
      if (motif !== null) executer('remorque_refuser', { id: b.dataset.refuser, motif }, 'Demande refusée.');
    } else if (b.dataset.debloquer) executer('remorque_debloquer', { id: b.dataset.debloquer }, 'Période débloquée.');
    else if (b.dataset.action === 'code-remorque') {
      try {
        await actions.appeler('admin_code_demander');
        reafficher({ ...options, code: { envoye: true } });
      } catch (e) {
        reafficher({ ...options, code: { envoye: false, erreur: e.message } });
      }
    }
  });
  racine.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    const champs = Object.fromEntries([...new FormData(f)].map(([k, v]) => [k, String(v).trim()]));
    if (f.id === 'form-remorque-demande') executer('remorque_demander', champs, 'Demande envoyée aux gestionnaires.');
    else if (f.id === 'form-remorque-blocage') executer('remorque_bloquer', champs, 'Remorque bloquée sur cette période.');
    else if (f.id === 'form-remorque-code') {
      try {
        await actions.appeler('admin_code_verifier', { code: champs.code });
        actions.toast('Gestion de la remorque activée sur cet appareil.');
        reafficher({ ...options, code: {} });
      } catch (e) {
        reafficher({ ...options, code: { envoye: e.code !== 'trop_essais' && e.code !== 'code_expire', erreur: e.message } });
      }
    }
  });
}

// ---- Statistiques (Admin → Statistiques) ----

const MOIS_COURTS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export function renderStatsRemorque(s) {
  if (!s) return '';
  const max = Math.max(1, ...s.jours_par_mois);
  const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
  return `<div class="bloc stats remorque-stats">
    <h3>🚚 Remorque ${s.annee}</h3>
    <div class="chiffres">
      <div><b>${s.reservations}</b> réservation${s.reservations > 1 ? 's' : ''}</div>
      <div><b>${s.jours_pret}</b> jour${s.jours_pret > 1 ? 's' : ''} de prêt</div>
      <div><b>${s.adherents}</b> adhérent${s.adherents > 1 ? 's' : ''}</div>
    </div>
    <p class="meta">${s.refusees} demande${s.refusees > 1 ? 's' : ''} refusée${s.refusees > 1 ? 's' : ''} · ${s.annulees} demande${s.annulees > 1 ? 's' : ''} annulée${s.annulees > 1 ? 's' : ''} · bloquée ${pluriel(s.jours_bloques_club, 'jour')} pour le club, ${pluriel(s.jours_bloques_indisponible, 'jour')} indisponible.</p>
    ${s.jours_pret ? s.jours_par_mois.map((n, i) => `<div class="ligne-stat"><span>${MOIS_COURTS[i]}</span><span class="jauge"><i style="width:${Math.round((n / max) * 100)}%"></i></span><small>${pluriel(n, 'jour')}</small></div>`).join('') : ''}
    <p class="meta">Adhérents : comptés tant que leur nom n'a pas été effacé par la durée de conservation.</p>
  </div>`;
}
