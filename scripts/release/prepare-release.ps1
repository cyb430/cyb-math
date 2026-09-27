param(
  [string]$ReleaseRoot = '',
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
if (-not $ReleaseRoot) { $ReleaseRoot = Join-Path $repositoryRoot 'outputs' }
New-Item -ItemType Directory -Path $ReleaseRoot -Force | Out-Null
$env:CYB_RELEASE_ROOT = (Resolve-Path -LiteralPath $ReleaseRoot).Path

Push-Location $repositoryRoot
try {
  $release = Get-Content -LiteralPath (Join-Path $repositoryRoot 'release\release.json') -Raw | ConvertFrom-Json
  $windowsSetup = $release.artifacts | Where-Object id -eq 'windows-setup'
  $windowsPortable = $release.artifacts | Where-Object id -eq 'windows-portable'
  $android = $release.artifacts | Where-Object id -eq 'android'
  $source = $release.artifacts | Where-Object id -eq 'source'

  node scripts/release/sync.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Release metadata sync failed' }

  if (-not $SkipBuild) {
    npm ci --prefix work/cyb-math-exe-offline
    npm run test:math
    npm test --prefix work/cyb-math-exe-offline
    npm run build --prefix work/cyb-math-exe-offline
    Copy-Item -LiteralPath (Join-Path $repositoryRoot "work\cyb-math-exe-offline\dist\$($windowsSetup.fileName)") -Destination $ReleaseRoot -Force
    Copy-Item -LiteralPath (Join-Path $repositoryRoot "work\cyb-math-exe-offline\dist\$($windowsPortable.fileName)") -Destination $ReleaseRoot -Force

    npm ci --prefix work/cyb-math-apk-offline
    npm test --prefix work/cyb-math-apk-offline
    & (Join-Path $repositoryRoot 'work\cyb-math-apk-offline\scripts\setup-toolchain.ps1')
    & (Join-Path $repositoryRoot 'work\cyb-math-apk-offline\scripts\build-android.ps1') Release
    Copy-Item -LiteralPath (Join-Path $repositoryRoot 'work\cyb-math-apk-offline\android\app\build\outputs\apk\release\app-release.apk') -Destination (Join-Path $ReleaseRoot $android.fileName) -Force
  }

  $sourcePath = Join-Path $ReleaseRoot $source.fileName
  git archive --format=zip --output $sourcePath HEAD
  if ($LASTEXITCODE -ne 0) { throw 'Source archive creation failed' }

  node scripts/release/refresh-artifacts.mjs
  node scripts/release/sync.mjs
  node scripts/release/verify.mjs --require-artifacts
  if ($LASTEXITCODE -ne 0) { throw 'Release verification failed' }
} finally {
  Pop-Location
}

Write-Output "Prepared release files in $ReleaseRoot"
