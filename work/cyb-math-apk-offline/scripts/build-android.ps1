param(
  [ValidateSet('Debug', 'Release')]
  [string]$Configuration = 'Debug',
  [switch]$Offline
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolRoot = if ($env:CYB_TOOLCHAIN_ROOT) { $env:CYB_TOOLCHAIN_ROOT } else { Join-Path $projectRoot '.toolchain' }
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
$env:ANDROID_USER_HOME = if ($env:ANDROID_USER_HOME) { $env:ANDROID_USER_HOME } else { Join-Path $projectRoot '.android-home' }
Remove-Item Env:ANDROID_SDK_HOME -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $env:ANDROID_USER_HOME -Force | Out-Null
if (-not $env:GRADLE_USER_HOME) { $env:GRADLE_USER_HOME = Join-Path $projectRoot '.gradle' }
$env:Path = "$(Join-Path $javaHome 'bin');$(Join-Path $sdkRoot 'platform-tools');$env:Path"
$env:npm_config_cache = Join-Path $projectRoot '.npm-cache'

if ($Configuration -eq 'Release') {
  if (-not ($env:CYB_ANDROID_KEYSTORE -and $env:CYB_ANDROID_KEYSTORE_PASSWORD)) {
    $signingRoot = Join-Path $projectRoot 'private-signing'
    $keystorePath = Join-Path $signingRoot 'cyb-math-release.jks'
    $passwordPath = Join-Path $signingRoot 'keystore-password.txt'
    if (-not ((Test-Path -LiteralPath $keystorePath) -and (Test-Path -LiteralPath $passwordPath))) {
      throw 'Release signing key is missing. Supply the existing CYB_ANDROID_KEYSTORE and password to preserve installed-app upgrades. Use create-signing.ps1 explicitly only for a new application.'
    }
    $password = (Get-Content -LiteralPath $passwordPath -Raw).Trim()
    $env:CYB_ANDROID_KEYSTORE = $keystorePath
    $env:CYB_ANDROID_KEYSTORE_PASSWORD = $password
    $env:CYB_ANDROID_KEY_ALIAS = 'cyb-math'
    $env:CYB_ANDROID_KEY_PASSWORD = $password
  }
  if (-not (Test-Path -LiteralPath $env:CYB_ANDROID_KEYSTORE)) { throw 'Configured release keystore does not exist.' }
}

Push-Location $projectRoot
try {
  npm run sync
  if ($LASTEXITCODE -ne 0) { throw 'Android web synchronization failed.' }
  Push-Location (Join-Path $projectRoot 'android')
  try {
    $task = if ($Configuration -eq 'Release') { 'assembleRelease' } else { 'assembleDebug' }
    $arguments = @($task, '--no-daemon')
    if ($Offline) { $arguments += '--offline' }
    & $gradle @arguments
    if ($LASTEXITCODE -ne 0) { throw "Gradle build failed with exit code $LASTEXITCODE" }
  } finally {
    Pop-Location
  }
} finally {
  Pop-Location
}
