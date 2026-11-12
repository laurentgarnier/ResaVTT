// En-tête et menu communs aux pages du site. Pour ajouter une page : créer son dossier avec un index.html,
// puis ajouter une ligne ici. Les liens sont calculés à partir de l'emplacement de ce fichier,
// ce qui fonctionne aussi quand le site est publié dans un sous-dossier.
export const PAGES = [
  { titre: 'Accueil', chemin: '' },
  { titre: 'Sorties', chemin: 'sorties/' },
];

const racine = new URL('../', import.meta.url);

function lien(page) {
  return new URL(page.chemin, racine).href;
}

function pageCourante(page) {
  const ici = location.href.split('#')[0].replace(/index\.html$/, '');
  return ici === lien(page);
}

export function insererEntete() {
  const entete = document.createElement('header');
  entete.className = 'entete-site';
  entete.innerHTML = `<a class="logo" href="${lien(PAGES[0])}">🚵 VTT <span>Club</span></a>
    <nav>${PAGES.map((p) => `<a href="${lien(p)}"${pageCourante(p) ? ' aria-current="page"' : ''}>${p.titre}</a>`).join('')}</nav>`;
  document.body.prepend(entete);
  const pied = document.createElement('footer');
  pied.className = 'pied-site';
  pied.innerHTML = `<a href="${new URL('confidentialite.html', racine).href}">Données personnelles</a>`;
  document.body.append(pied);
}

insererEntete();
