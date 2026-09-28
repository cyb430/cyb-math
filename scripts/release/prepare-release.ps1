param(
  [string]$ReleaseRoot = '',
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
if (-not $ReleaseRoot) { $ReleaseRoot = Join-Path $repositoryRoot 'outputs' }
New-Item -ItemType Directory -Path $ReleaseRoot -Force | Out-Null
$env:CYB_RELEASE_ROOT = (Resolve-Path -LiteralPath $ReleaseRoot).Path

function Invoke-Checked {
  param([string]$Command, [string[]]$Arguments)
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$Command failed with exit code $LASTEXITCODE" }
}

Push-Location $repositoryRoot
try {
  $release = Get-Content -LiteralPath (Join-Path $repositoryRoot 'release\release.json') -Raw | ConvertFrom-Json
  $windowsSetup = $release.artifacts | Where-Object id -eq 'windows-setup'
  $windowsPortable = $release.artifacts | Where-Object id -eq 'windows-portable'
  $android = $release.artifacts | Where-Object id -eq 'android'
  $source = $release.artifacts | Where-Object id -eq 'source'

  $pending = & git status --porcelain --untracked-files=normal
  if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect source revision' }
  if ($pending) { throw 'Commit source and release configuration before preparing an archive; git archive must match the tested source.' }
  Invoke-Checked node @('scripts/release/sync.mjs')

  if (-not $SkipBuild) {
    Invoke-Checked npm @('ci')
    Invoke-Checked npm @('run', 'test:ux')
    Invoke-Checked npm @('run', 'test:platform')
    Invoke-Checked node @('scripts/ux/test-download.mjs')
    Invoke-Checked npm @('ci', '--prefix', 'work/cyb-math-exe-offline')
    Invoke-Checked npm @('run', 'test:math')
    Invoke-Checked npm @('test', '--prefix', 'work/cyb-math-exe-offline')
    Invoke-Checked npm @('run', 'build', '--prefix', 'work/cyb-math-exe-offline')
    Copy-Item -LiteralPath (Join-Path $repositoryRoot "work\cyb-math-exe-offline\dist\$($windowsSetup.fileName)") -Destination $ReleaseRoot -Force
    Copy-Item -LiteralPath (Join-Path $repositoryRoot "work\cyb-math-exe-offline\dist\$($windowsPortable.fileName)") -Destination $ReleaseRoot -Force

    Invoke-Checked npm @('ci', '--prefix', 'work/cyb-math-apk-offline')
    Invoke-Checked npm @('test', '--prefix', 'work/cyb-math-apk-offline')
    if (-not $env:CYB_TOOLCHAIN_ROOT) { & (Join-Path $repositoryRoot 'work\cyb-math-apk-offline\scripts\setup-toolchain.ps1') }
    & (Join-Path $repositoryRoot 'work\cyb-math-apk-offline\scripts\build-android.ps1') Release
    Invoke-Checked node @('work/cyb-math-apk-offline/scripts/verify-apk.mjs')
    Copy-Item -LiteralPath (Join-Path $repositoryRoot 'work\cyb-math-apk-offline\android\app\build\outputs\apk\release\app-release.apk') -Destination (Join-Path $ReleaseRoot $android.fileName) -Force
  }

  $sourcePath = Join-Path $ReleaseRoot $source.fileName
  Invoke-Checked git @('archive', '--format=zip', '--output', $sourcePath, 'HEAD')

  Invoke-Checked node @('scripts/release/refresh-artifacts.mjs')
  Invoke-Checked node @('scripts/release/sync.mjs')
  Invoke-Checked node @('scripts/release/verify.mjs', '--require-artifacts')
} finally {
  Pop-Location
}

Write-Output "Prepared release files in $ReleaseRoot"
