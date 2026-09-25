$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$javaHome = Join-Path $projectRoot '.toolchain\jdk-21'
$signingRoot = Join-Path $projectRoot 'private-signing'
$keystorePath = Join-Path $signingRoot 'cyb-math-release.jks'
$passwordPath = Join-Path $signingRoot 'keystore-password.txt'

if (-not (Test-Path -LiteralPath (Join-Path $javaHome 'bin\keytool.exe'))) {
  throw 'Missing portable JDK. Run scripts/setup-toolchain.ps1 first.'
}

New-Item -ItemType Directory -Path $signingRoot -Force | Out-Null
if ((Test-Path -LiteralPath $keystorePath) -and (Test-Path -LiteralPath $passwordPath)) {
  Write-Host 'Existing CYB Math release signing key retained.'
  exit 0
}
if ((Test-Path -LiteralPath $keystorePath) -or (Test-Path -LiteralPath $passwordPath)) {
  throw 'Incomplete signing material found. Preserve it and inspect private-signing manually.'
}

$bytes = New-Object byte[] 24
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
$password = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')

& (Join-Path $javaHome 'bin\keytool.exe') -genkeypair -v `
  -keystore $keystorePath `
  -alias 'cyb-math' `
  -keyalg RSA `
  -keysize 4096 `
  -validity 10000 `
  -storepass $password `
  -keypass $password `
  -dname 'CN=CYB Math, O=CYB Math, C=CN'
if ($LASTEXITCODE -ne 0) { throw "keytool failed with exit code $LASTEXITCODE" }

[System.IO.File]::WriteAllText($passwordPath, $password, (New-Object System.Text.UTF8Encoding($false)))
Write-Host 'CYB Math release signing key created.'
