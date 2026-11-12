# Génère les icônes PNG de l'appli (fond sombre, vélo stylisé vert). Usage : powershell -File outils/generer-icones.ps1
Add-Type -AssemblyName System.Drawing

$dossier = Join-Path $PSScriptRoot '..\site\sorties\icones'
New-Item -ItemType Directory -Force $dossier | Out-Null

function Dessiner([int]$taille, [string]$nom) {
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
    $bmp.Save((Join-Path $dossier $nom), [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
}

Dessiner 192 'icone-192.png'
Dessiner 512 'icone-512.png'
Dessiner 180 'apple-touch-icon.png'
Write-Output "Icônes écrites dans $dossier"
