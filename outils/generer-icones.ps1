# Génère les icônes de l'appli à partir d'une seule image : site/sorties/icones/logo.png.
# Usage : npm run icones   (ou : powershell -File outils/generer-icones.ps1)
#
# logo.png : image CARRÉE d'au moins 1024 x 1024 px, fond uni (pas de transparence), logo centré dans les 80 % du
# milieu (Android découpe l'icône en cercle ou en goutte). Pour changer le logo du club : remplacer ce fichier,
# lancer npm run icones, puis publier le site.
#
# Produit : icone-192.png et icone-512.png (Android, onglet du navigateur, bandeau, page de connexion) et
# apple-touch-icon.png (iPhone, 180 px). Si logo.png n'existe pas, il est d'abord dessiné (vélo stylisé vert).
# logo-maskable.png (facultatif, même format) : version où le logo tient dans le cercle central, qu'Android découpe
# sans rien rogner ; elle donne icone-maskable-192.png et icone-maskable-512.png (sinon logo.png sert aussi).
# Les deux sources se composent depuis le logo vectoriel : python outils/composer-icone.py docs/logo/<logo>.svg
Add-Type -AssemblyName System.Drawing

$dossier = Join-Path $PSScriptRoot '..\site\sorties\icones'
New-Item -ItemType Directory -Force $dossier | Out-Null
$source = Join-Path $dossier 'logo.png'

function DessinerVelo([int]$taille, [string]$chemin) {
    $bmp = New-Object System.Drawing.Bitmap $taille, $taille
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#121a2b'))
    $u = $taille / 64.0
    $vert = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#c6f432')), (4 * $u)
    $blanc = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#e8ecf4')), (3.5 * $u)
    $blanc.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $blanc.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $blanc.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    # Zone utile réduite pour les icônes « maskable » (marge de sécurité).
    $g.TranslateTransform(6 * $u, 4 * $u)
    $g.ScaleTransform(0.82, 0.82)
    $g.DrawEllipse($vert, 8 * $u, 32 * $u, 20 * $u, 20 * $u)
    $g.DrawEllipse($vert, 36 * $u, 32 * $u, 20 * $u, 20 * $u)
    $points = @(
        (New-Object System.Drawing.PointF (18 * $u), (42 * $u)),
        (New-Object System.Drawing.PointF (28 * $u), (26 * $u)),
        (New-Object System.Drawing.PointF (40 * $u), (26 * $u)),
        (New-Object System.Drawing.PointF (46 * $u), (42 * $u))
    )
    $g.DrawLines($blanc, $points)
    $g.DrawLine($blanc, 28 * $u, 26 * $u, 34 * $u, 42 * $u)
    $g.DrawLine($blanc, 34 * $u, 42 * $u, 18 * $u, 42 * $u)
    $g.DrawLine($blanc, 36 * $u, 20 * $u, 42 * $u, 20 * $u)
    $g.DrawLine($blanc, 39 * $u, 20 * $u, 40 * $u, 26 * $u)
    $bmp.Save($chemin, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
}

function Reduire($image, [int]$taille, [string]$nom) {
    $bmp = New-Object System.Drawing.Bitmap $taille, $taille
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($image, 0, 0, $taille, $taille)
    $bmp.Save((Join-Path $dossier $nom), [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
}

if (-not (Test-Path $source)) {
    DessinerVelo 1024 $source
    Write-Output "logo.png absent : vélo dessiné dans $source"
}

function Ouvrir([string]$chemin) {
    $image = [System.Drawing.Image]::FromFile((Resolve-Path $chemin))
    if ($image.Width -ne $image.Height) { $image.Dispose(); throw "$chemin doit être carré (actuellement $($image.Width) x $($image.Height) px)." }
    if ($image.Width -lt 512) { Write-Warning "$chemin ne fait que $($image.Width) px : 1024 px ou plus conseillés." }
    return $image
}

$image = Ouvrir $source
try {
    Reduire $image 512 'icone-512.png'
    Reduire $image 192 'icone-192.png'
    Reduire $image 180 'apple-touch-icon.png'
} finally {
    $image.Dispose()
}

$sourceDecoupable = Join-Path $dossier 'logo-maskable.png'
if (-not (Test-Path $sourceDecoupable)) { $sourceDecoupable = $source }
$image = Ouvrir $sourceDecoupable
try {
    Reduire $image 512 'icone-maskable-512.png'
    Reduire $image 192 'icone-maskable-192.png'
} finally {
    $image.Dispose()
}
Write-Output "Icônes écrites dans $dossier (icone-512/192, apple-touch-icon, icone-maskable-512/192)"
