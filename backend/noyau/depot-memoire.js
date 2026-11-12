// Dépôt en mémoire, même interface que le dépôt Google Sheets. Sert aux tests.
// Chaque lecture renvoie des copies, comme une relecture du classeur.

export function creerDepotMemoire(tables = {}) {
  const t = {};
  for (const [nom, lignes] of Object.entries(tables)) t[nom] = lignes.map((l) => ({ ...l }));
  const table = (nom) => (t[nom] ||= []);
  return {
    lire: (onglet) => table(onglet).map((l) => ({ ...l })),
    ajouter: (onglet, objets) => { for (const o of objets) table(onglet).push({ ...o }); },
    modifier: (onglet, filtre, champs) => {
      let n = 0;
      for (const l of table(onglet)) if (filtre(l)) { Object.assign(l, champs); n++; }
      return n;
    },
    supprimer: (onglet, filtre) => {
      const avant = table(onglet).length;
      t[onglet] = table(onglet).filter((l) => !filtre(l));
      return avant - t[onglet].length;
    },
  };
}
