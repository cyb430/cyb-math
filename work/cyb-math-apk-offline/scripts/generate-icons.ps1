$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Resolve-Path (Join-Path $projectRoot '..\cyb-math-exe-offline\assets\icon.png')
$resRoot = Join-Path $projectRoot 'android\app\src\main\res'
$source = [System.Drawing.Image]::FromFile($sourcePath)

function Save-ScaledIcon([string]$path, [int]$size, [double]$scale = 1.0) {
  $bitmap = New-Object System.Drawing.Bitmap($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $drawSize = [int]($size * $scale)
    $offset = [int](($size - $drawSize) / 2)
    $graphics.DrawImage($source, $offset, $offset, $drawSize, $drawSize)
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

function Save-RoundIcon([string]$path, [int]$size) {
  $bitmap = New-Object System.Drawing.Bitmap($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $clip = New-Object System.Drawing.Drawing2D.GraphicsPath
  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $clip.AddEllipse(0, 0, $size, $size)
    $graphics.SetClip($clip)
    $graphics.DrawImage($source, 0, 0, $size, $size)
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $clip.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

$legacy = @{ 'mdpi' = 48; 'hdpi' = 72; 'xhdpi' = 96; 'xxhdpi' = 144; 'xxxhdpi' = 192 }
$foreground = @{ 'mdpi' = 108; 'hdpi' = 162; 'xhdpi' = 216; 'xxhdpi' = 324; 'xxxhdpi' = 432 }
foreach ($density in $legacy.Keys) {
  $dir = Join-Path $resRoot "mipmap-$density"
  Save-ScaledIcon (Join-Path $dir 'ic_launcher.png') $legacy[$density]
  Save-RoundIcon (Join-Path $dir 'ic_launcher_round.png') $legacy[$density]
  Save-ScaledIcon (Join-Path $dir 'ic_launcher_foreground.png') $foreground[$density] 0.72
}

Get-ChildItem -LiteralPath $resRoot -Recurse -Filter 'splash.png' | ForEach-Object {
  $existing = [System.Drawing.Image]::FromFile($_.FullName)
  $width = $existing.Width
  $height = $existing.Height
  $existing.Dispose()
  $bitmap = New-Object System.Drawing.Bitmap($width, $height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#f7f9fc'))
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $side = [int]([Math]::Min($width, $height) * 0.24)
    $x = [int](($width - $side) / 2)
    $y = [int](($height - $side) / 2)
    $graphics.DrawImage($source, $x, $y, $side, $side)
    $bitmap.Save($_.FullName, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

$source.Dispose()
Write-Host 'Android launcher icons and splash screens generated.'
