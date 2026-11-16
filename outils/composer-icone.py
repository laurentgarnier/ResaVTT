# Compose les images sources des icônes de l'appli à partir du logo vectoriel du club.
#   python outils/composer-icone.py docs/logo/corbas-vtt.svg
# Écrit deux SVG carrés (fond blanc) dans docs/logo/, puis les exporte en PNG 1024 px avec Inkscape dans
# site/sorties/icones/ :
#   - logo.png : logo en grand (88 % de la largeur) : iPhone, onglet, bandeau, page de connexion, icône Android « any » ;
#   - logo-maskable.png : logo réduit pour tenir dans le cercle central (80 % du diamètre), qu'Android peut découper
#     en cercle, en goutte ou en carré arrondi sans rogner le texte.
# Ensuite : npm run icones (toutes les tailles), puis publier le site.
import math
import re
import subprocess
import sys
from pathlib import Path

INKSCAPE = r'C:\Program Files\Inkscape\bin\inkscape.exe'
COTE = 1024
FOND = '#ffffff'


def composer(source: Path, cible: Path, echelle_max_largeur: float, dans_cercle: bool) -> None:
    texte = source.read_text(encoding='utf-8')
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', texte).group(1).split()]
    w, h = vb[2], vb[3]
    interieur = texte[texte.index('>', texte.index('<svg')) + 1:texte.rindex('</svg>')]
    if dans_cercle:
        # La diagonale du logo tient dans le cercle de sécurité (80 % du côté).
        k = 0.80 * COTE / math.hypot(w, h)
    else:
        k = min(echelle_max_largeur * COTE / w, echelle_max_largeur * COTE / h)
    tx, ty = (COTE - w * k) / 2, (COTE - h * k) / 2
    cible.write_text(f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {COTE} {COTE}" width="{COTE}" height="{COTE}">
  <!-- Icône de l'appli composée par outils/composer-icone.py depuis {source.name}. -->
  <rect width="{COTE}" height="{COTE}" fill="{FOND}"/>
  <g transform="translate({tx:.1f} {ty:.1f}) scale({k:.4f})">{interieur}</g>
</svg>
''', encoding='utf-8', newline='\n')


def exporter(svg: Path, png: Path) -> None:
    subprocess.run([INKSCAPE, str(svg), '--export-type=png', f'--export-filename={png}', f'--export-width={COTE}',
                    f'--export-height={COTE}', f'--export-background={FOND}', '--export-background-opacity=1'], check=True)


def principal(source: str) -> None:
    src = Path(source)
    icones = Path('site/sorties/icones')
    normale = src.with_name(src.stem + '-icone.svg')
    decoupable = src.with_name(src.stem + '-icone-maskable.svg')
    composer(src, normale, 0.88, dans_cercle=False)
    composer(src, decoupable, 0.80, dans_cercle=True)
    exporter(normale, icones / 'logo.png')
    exporter(decoupable, icones / 'logo-maskable.png')
    print(f'{normale}, {decoupable} -> {icones}/logo.png, {icones}/logo-maskable.png')


if __name__ == '__main__':
    principal(sys.argv[1] if len(sys.argv) > 1 else 'docs/logo/corbas-vtt.svg')
