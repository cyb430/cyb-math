param(
  [ValidateSet('Debug', 'Release')]
  [string]$Configuration = 'Debug'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolRoot = Join-Path $projectRoot '.toolchain'
$javaHome = Join-Path $toolRoot 'jdk-21'
$sdkRoot = Join-Path $toolRoot 'android-sdk'
$gradle = Join-Path $toolRoot 'gradle-8.14.3\bin\gradle.bat'

if (-not (Test-Path -LiteralPath (Join-Path $javaHome 'bin\java.exe'))) {
  throw 'Missing portable JDK. Run scripts/setup-toolchain.ps1 first.'
}
if (-not (Test-Path -LiteralPath (Join-Path $sdkRoot 'platform-tools\adb.exe'))) {
  throw 'Missing Android SDK. Run scripts/setup-toolchain.ps1 first.'
}
if (-not (Test-Path -LiteralPath $gradle)) {
  throw 'Missing Gradle. Run scripts/setup-toolchain.ps1 first.'
}

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:Path = "$(Join-Path $javaHome 'bin');$(Join-Path $sdkRoot 'platform-tools');$env:Path"
$env:npm_config_cache = Join-Path $projectRoot '.npm-cache'

if ($Configuration -eq 'Release') {
  $signingRoot = Join-Path $projectRoot 'private-signing'
  $keystorePath = Join-Path $signingRoot 'cyb-math-release.jks'
  $passwordPath = Join-Path $signingRoot 'keystore-password.txt'
  if (-not ((Test-Path -LiteralPath $keystorePath) -and (Test-Path -LiteralPath $passwordPath))) {
    & (Join-Path $PSScriptRoot 'create-signing.ps1')
  }
  $password = (Get-Content -LiteralPath $passwordPath -Raw).Trim()
  $env:CYB_ANDROID_KEYSTORE = $keystorePath
  $env:CYB_ANDROID_KEYSTORE_PASSWORD = $password
  $env:CYB_ANDROID_KEY_ALIAS = 'cyb-math'
  $env:CYB_ANDROID_KEY_PASSWORD = $password
}

Push-Location $projectRoot
try {
  npm run sync
  Push-Location (Join-Path $projectRoot 'android')
  try {
    if ($Configuration -eq 'Release') { & $gradle assembleRelease --no-daemon }
    else { & $gradle assembleDebug --no-daemon }
    if ($LASTEXITCODE -ne 0) { throw "Gradle build failed with exit code $LASTEXITCODE" }
  } finally {
    Pop-Location
  }
} finally {
  Pop-Location
}
