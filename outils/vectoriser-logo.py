# Vectorise le logo du club (PNG rouge sur fond blanc) en SVG modifiable, avec potrace.
# À lancer avec le Python fourni par Inkscape (Pillow, numpy et la bibliothèque potrace y sont) :
#   "C:\Program Files\Inkscape\bin\python.exe" outils\vectoriser-logo.py <logo.png> <sortie.svg>
#
# Le SVG produit :
#   - groupe « diable » : le remplissage clair, puis le trait rouge par-dessus ;
#   - groupe « texte » : les lettres en rouge (léger dégradé) avec une ombre portée (filtre classique, lu par
#     Inkscape comme par les navigateurs) ;
#   - couleurs, dégradé et ombre regroupés dans <defs> pour être modifiés en un seul endroit ;
#   - fond transparent.
import ctypes
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

DOSSIER_INKSCAPE = r'C:\Program Files\Inkscape\bin'

# ——— potrace par ctypes ———
os.add_dll_directory(DOSSIER_INKSCAPE)
potrace = ctypes.CDLL(os.path.join(DOSSIER_INKSCAPE, 'libpotrace-0.dll'))
Mot = ctypes.c_ulong  # potrace_word = unsigned long (32 bits sous Windows)
BITS = ctypes.sizeof(Mot) * 8


class Progres(ctypes.Structure):
    _fields_ = [('callback', ctypes.c_void_p), ('data', ctypes.c_void_p), ('min', ctypes.c_double), ('max', ctypes.c_double), ('epsilon', ctypes.c_double)]


class Parametres(ctypes.Structure):
    _fields_ = [('turdsize', ctypes.c_int), ('turnpolicy', ctypes.c_int), ('alphamax', ctypes.c_double), ('opticurve', ctypes.c_int),
                ('opttolerance', ctypes.c_double), ('progress', Progres)]


class Bitmap(ctypes.Structure):
    _fields_ = [('w', ctypes.c_int), ('h', ctypes.c_int), ('dy', ctypes.c_int), ('map', ctypes.POINTER(Mot))]


class Point(ctypes.Structure):
    _fields_ = [('x', ctypes.c_double), ('y', ctypes.c_double)]


class Courbe(ctypes.Structure):
    _fields_ = [('n', ctypes.c_int), ('tag', ctypes.POINTER(ctypes.c_int)), ('c', ctypes.POINTER(Point * 3))]


class Chemin(ctypes.Structure):
    pass


Chemin._fields_ = [('area', ctypes.c_int), ('sign', ctypes.c_int), ('curve', Courbe), ('next', ctypes.POINTER(Chemin)),
                   ('childlist', ctypes.POINTER(Chemin)), ('sibling', ctypes.POINTER(Chemin)), ('priv', ctypes.c_void_p)]


class Etat(ctypes.Structure):
    _fields_ = [('status', ctypes.c_int), ('plist', ctypes.POINTER(Chemin)), ('priv', ctypes.c_void_p)]


potrace.potrace_param_default.restype = ctypes.POINTER(Parametres)
potrace.potrace_trace.restype = ctypes.POINTER(Etat)
potrace.potrace_trace.argtypes = [ctypes.POINTER(Parametres), ctypes.POINTER(Bitmap)]
potrace.potrace_state_free.argtypes = [ctypes.POINTER(Etat)]
potrace.potrace_param_free.argtypes = [ctypes.POINTER(Parametres)]
CURVETO = 1


def tracer(masque, lissage=1.0, petites_taches=4):
    """Contours (chemin SVG « d ») d'un masque booléen, en coordonnées image."""
    h, w = masque.shape
    dy = (w + BITS - 1) // BITS
    mots = np.zeros((h, dy), dtype=np.uint64)
    for x in range(w):
        mots[:, x // BITS] |= masque[:, x].astype(np.uint64) << np.uint64(BITS - 1 - (x % BITS))
    # potrace compte les lignes de bas en haut : la première ligne du tableau est le bas de l'image.
    donnees = (Mot * (h * dy))(*[int(v) for v in mots[::-1].reshape(-1)])
    bm = Bitmap(w, h, dy, ctypes.cast(donnees, ctypes.POINTER(Mot)))
    param = potrace.potrace_param_default()
    param.contents.turdsize = petites_taches
    param.contents.alphamax = lissage
    param.contents.opticurve = 1
    param.contents.opttolerance = 0.2
    etat = potrace.potrace_trace(param, ctypes.byref(bm))
    if not etat or etat.contents.status != 0:
        raise RuntimeError('potrace a échoué')
    morceaux = []
    p = etat.contents.plist
    fmt = lambda pt: f'{pt.x:.1f} {h - pt.y:.1f}'  # retour au repère SVG (y vers le bas)
    while p:
        c = p.contents.curve
        dernier = c.c[c.n - 1]
        d = [f'M{fmt(dernier[2])}']
        for i in range(c.n):
            seg = c.c[i]
            if c.tag[i] == CURVETO:
                d.append(f'C{fmt(seg[0])} {fmt(seg[1])} {fmt(seg[2])}')
            else:
                d.append(f'L{fmt(seg[1])} {fmt(seg[2])}')
        morceaux.append(''.join(d) + 'Z')
        p = p.contents.next
    potrace.potrace_state_free(etat)
    potrace.potrace_param_free(param)
    return ''.join(morceaux)


# ——— Séparation des couleurs ———

def composantes(masque):
    """Étiquette les zones connexes (8-voisinage) d'un masque booléen."""
    h, w = masque.shape
    etiq = np.zeros((h, w), dtype=np.int32)
    n = 0
    for y0, x0 in zip(*np.nonzero(masque)):
        if etiq[y0, x0]:
            continue
        n += 1
        etiq[y0, x0] = n
        file = deque([(y0, x0)])
        while file:
            y, x = file.popleft()
            for yy in (y - 1, y, y + 1):
                for xx in (x - 1, x, x + 1):
                    if 0 <= yy < h and 0 <= xx < w and masque[yy, xx] and not etiq[yy, xx]:
                        etiq[yy, xx] = n
                        file.append((yy, xx))
    return etiq, n


def dilater(masque, r):
    m = masque.copy()
    for _ in range(r):
        d = m.copy()
        d[1:, :] |= m[:-1, :]; d[:-1, :] |= m[1:, :]; d[:, 1:] |= m[:, :-1]; d[:, :-1] |= m[:, 1:]
        m = d
    return m


def eroder(masque, r):
    return ~dilater(~masque, r)


def principal(source, sortie):
    a = np.asarray(Image.open(source).convert('RGB')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    h, w = r.shape
    # Rouge (trait et lettres, reflets roses compris) : nettement plus rouge que vert et bleu.
    rouge = (r - np.maximum(g, b) > 45)
    # Remplissage clair du diable : blanc légèrement grisé (≈ 250), distinct du fond blanc pur (255).
    gris_clair = (a.min(axis=2) >= 236) & (a.min(axis=2) <= 253) & (a.max(axis=2) - a.min(axis=2) < 14)

    etiq, n = composantes(rouge)
    haut = {}
    for k in range(1, n + 1):
        ys = np.nonzero(etiq == k)[0]
        haut[k] = (ys.min(), len(ys))
    # Le texte est sous le dessin : une zone rouge qui commence sous la ligne 520 appartient au texte.
    texte_ids = [k for k, (ymin, taille) in haut.items() if ymin >= 520 and taille > 30]
    texte_strict = np.isin(etiq, texte_ids)
    trait = rouge & ~texte_strict
    # Lettres : on ajoute leurs reflets rose pâle (effet de relief) et on comble les petits trous, sans déborder
    # sur l'ombre grise ni sur le dessin.
    proche = dilater(texte_strict, 3)
    rose = (r - np.maximum(g, b) > 12) & proche
    texte = eroder(dilater(texte_strict | rose, 2), 2) & ~trait

    # Remplissage du diable, élargi de 2 px pour passer sous le trait sans liseré blanc.
    remplissage = dilater(gris_clair & ~texte, 2) & ~dilater(texte, 1)

    d_remplissage = tracer(remplissage, lissage=1.0, petites_taches=40)
    d_trait = tracer(trait, lissage=1.0, petites_taches=4)
    d_texte = tracer(texte, lissage=0.9, petites_taches=4)

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">
  <title>Corbas VTT</title>
  <!-- Logo vectorisé depuis l'image du club (outils/vectoriser-logo.py, potrace).
       Couleurs, dégradé et ombre : à modifier ici, dans <defs>. -->
  <defs>
    <style>
      .rouge {{ fill: #c00000; }}
      .remplissage {{ fill: #fafafa; }}
    </style>
    <linearGradient id="degrade-lettres" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e42a2a"/>
      <stop offset="0.45" stop-color="#c80000"/>
      <stop offset="1" stop-color="#a00000"/>
    </linearGradient>
    <!-- Ombre portée du texte : décalage (dx, dy), flou (stdDeviation), opacité (flood-opacity). -->
    <filter id="ombre" x="-5%" y="-5%" width="115%" height="125%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="flou"/>
      <feOffset in="flou" dx="3" dy="5" result="decale"/>
      <feFlood flood-color="#000000" flood-opacity="0.35"/>
      <feComposite in2="decale" operator="in" result="ombre"/>
      <feMerge><feMergeNode in="ombre"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g id="diable">
    <path id="diable-remplissage" class="remplissage" d="{d_remplissage}"/>
    <path id="diable-trait" class="rouge" d="{d_trait}"/>
  </g>
  <g id="texte" filter="url(#ombre)">
    <path id="texte-lettres" fill="url(#degrade-lettres)" d="{d_texte}"/>
  </g>
</svg>
'''
    with open(sortie, 'w', encoding='utf-8', newline='\n') as f:
        f.write(svg)
    print(f'{sortie} : {len(svg) // 1024} Ko, {len(texte_ids)} lettres/éléments de texte')


if __name__ == '__main__':
    principal(sys.argv[1], sys.argv[2])
