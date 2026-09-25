$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$toolRoot = Join-Path $projectRoot '.toolchain'
$downloadRoot = Join-Path $toolRoot 'downloads'
$javaHome = Join-Path $toolRoot 'jdk-21'
$sdkRoot = Join-Path $toolRoot 'android-sdk'
$gradleVersion = '8.14.3'
$gradleHome = Join-Path $toolRoot "gradle-$gradleVersion"
$gradleSha256 = 'bd71102213493060956ec229d946beee57158dbd89d0e62b91bca0fa2c5f3531'
$gradleZip = Join-Path $downloadRoot "gradle-$gradleVersion-bin.zip"
$cliVersion = '15859902'
$cliSha256 = '90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a'
$cliZip = Join-Path $downloadRoot "commandlinetools-win-$($cliVersion)_latest.zip"

New-Item -ItemType Directory -Path $downloadRoot -Force | Out-Null

if (-not (Test-Path -LiteralPath (Join-Path $javaHome 'bin\java.exe'))) {
  Write-Host 'Downloading Microsoft Build of OpenJDK 21...'
  $jdkZip = Join-Path $downloadRoot 'microsoft-jdk-21.zip'
  $jdkUrl = 'https://download.visualstudio.microsoft.com/download/pr/f1e5f23f-9d50-4b9f-8ed3-80522ae82bb5/71e8e5f0f13419cc726e470d25e0a0d0/microsoft-jdk-21.0.12.1-windows-x64.zip'
  $jdkSha256 = '192441a9d27da813bada974bb88b4cf64d37a9589ed37f204374d411ca5ce07f'
  & curl.exe -L --fail --retry 5 --retry-all-errors --silent --show-error $jdkUrl -o $jdkZip
  if ($LASTEXITCODE -ne 0) { throw "Unable to download Microsoft OpenJDK (curl exit $LASTEXITCODE)" }
  $actualJdkHash = (Get-FileHash -LiteralPath $jdkZip -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualJdkHash -ne $jdkSha256) { throw 'Microsoft OpenJDK checksum mismatch.' }
  $jdkExtract = Join-Path $toolRoot 'jdk-extract'
  if (Test-Path -LiteralPath $jdkExtract) { Remove-Item -LiteralPath $jdkExtract -Recurse -Force }
  Expand-Archive -LiteralPath $jdkZip -DestinationPath $jdkExtract -Force
  $jdkFolder = Get-ChildItem -LiteralPath $jdkExtract -Directory | Select-Object -First 1
  Move-Item -LiteralPath $jdkFolder.FullName -Destination $javaHome
  Remove-Item -LiteralPath $jdkExtract -Recurse -Force
}

if (-not (Test-Path -LiteralPath (Join-Path $sdkRoot 'cmdline-tools\latest\bin\sdkmanager.bat'))) {
  Write-Host 'Downloading Android SDK command-line tools...'
  $existingCliHash = if (Test-Path -LiteralPath $cliZip) { (Get-FileHash -LiteralPath $cliZip -Algorithm SHA256).Hash.ToLowerInvariant() } else { '' }
  if ($existingCliHash -ne $cliSha256) {
    & curl.exe -L --fail --retry 5 --retry-all-errors --silent --show-error "https://dl.google.com/android/repository/commandlinetools-win-$($cliVersion)_latest.zip" -o $cliZip
    if ($LASTEXITCODE -ne 0) { throw "Unable to download Android command-line tools (curl exit $LASTEXITCODE)" }
  }
  $actualCliHash = (Get-FileHash -LiteralPath $cliZip -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualCliHash -ne $cliSha256) { throw 'Android command-line tools checksum mismatch.' }
  $cliExtract = Join-Path $toolRoot 'android-cli-extract'
  if (Test-Path -LiteralPath $cliExtract) { Remove-Item -LiteralPath $cliExtract -Recurse -Force }
  New-Item -ItemType Directory -Path $cliExtract -Force | Out-Null
  & tar.exe -xf $cliZip -C $cliExtract
  if ($LASTEXITCODE -ne 0) { throw "Unable to extract Android command-line tools (tar exit $LASTEXITCODE)" }
  New-Item -ItemType Directory -Path (Join-Path $sdkRoot 'cmdline-tools') -Force | Out-Null
  Move-Item -LiteralPath (Join-Path $cliExtract 'cmdline-tools') -Destination (Join-Path $sdkRoot 'cmdline-tools\latest')
  Remove-Item -LiteralPath $cliExtract -Recurse -Force
}

if (-not (Test-Path -LiteralPath (Join-Path $gradleHome 'bin\gradle.bat'))) {
  Write-Host 'Preparing Gradle 8.14.3...'
  $existingGradleHash = if (Test-Path -LiteralPath $gradleZip) { (Get-FileHash -LiteralPath $gradleZip -Algorithm SHA256).Hash.ToLowerInvariant() } else { '' }
  if ($existingGradleHash -ne $gradleSha256) {
    & curl.exe -L --fail --retry 5 --retry-all-errors --silent --show-error "https://mirrors.cloud.tencent.com/gradle/gradle-$gradleVersion-bin.zip" -o $gradleZip
    if ($LASTEXITCODE -ne 0) { throw "Unable to download Gradle (curl exit $LASTEXITCODE)" }
  }
  $actualGradleHash = (Get-FileHash -LiteralPath $gradleZip -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualGradleHash -ne $gradleSha256) { throw 'Gradle checksum mismatch.' }
  & tar.exe -xf $gradleZip -C $toolRoot
  if ($LASTEXITCODE -ne 0) { throw "Unable to extract Gradle (tar exit $LASTEXITCODE)" }
}

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:Path = "$(Join-Path $javaHome 'bin');$env:Path"
$sdkManager = Join-Path $sdkRoot 'cmdline-tools\latest\bin\sdkmanager.bat'

Write-Host 'Accepting Android SDK licenses...'
$yes = (1..20 | ForEach-Object { 'y' }) -join "`n"
$yes | & $sdkManager --sdk_root=$sdkRoot --licenses | Out-Host

Write-Host 'Installing Android SDK Platform 36 and build tools...'
& $sdkManager --sdk_root=$sdkRoot 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0'
if ($LASTEXITCODE -ne 0) { throw "sdkmanager failed with exit code $LASTEXITCODE" }

Write-Host 'Portable Android toolchain is ready.'
& (Join-Path $javaHome 'bin\java.exe') -version
& (Join-Path $sdkRoot 'platform-tools\adb.exe') version
& (Join-Path $gradleHome 'bin\gradle.bat') --version
