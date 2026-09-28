param(
  [string]$ReleaseRoot = '',
  [switch]$SkipCloudflare,
  [switch]$SkipGitHub
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
if (-not $ReleaseRoot) {
  $ReleaseRoot = Join-Path $repositoryRoot 'outputs'
}
$env:CYB_RELEASE_ROOT = (Resolve-Path -LiteralPath $ReleaseRoot).Path
$release = Get-Content -LiteralPath (Join-Path $repositoryRoot 'release\release.json') -Raw | ConvertFrom-Json

Push-Location $repositoryRoot
try {
  node scripts/release/verify.mjs --require-artifacts
  if ($LASTEXITCODE -ne 0) { throw 'Release verification failed' }

  if (-not $SkipCloudflare) {
    npm ci --prefix work/cyb-math-download
    if ($LASTEXITCODE -ne 0) { throw 'Download-center dependency installation failed' }
    $wrangler = Join-Path $repositoryRoot 'work\cyb-math-download\node_modules\.bin\wrangler.cmd'
    foreach ($site in $release.sites) {
      Write-Output "Deploying $($site.project) -> $($site.domain)"
      & $wrangler pages deploy (Join-Path $repositoryRoot "sites\$($site.directory)") --project-name $site.project --branch main --commit-dirty=true
      if ($LASTEXITCODE -ne 0) { throw "Pages deployment failed: $($site.project)" }
    }

    & $wrangler deploy --config (Join-Path $repositoryRoot 'work\cyb-personal-home\wrangler.jsonc')
    if ($LASTEXITCODE -ne 0) { throw 'Personal-home deployment failed' }

    npm run assets --prefix work/cyb-math-download
    if ($LASTEXITCODE -ne 0) { throw 'Download asset preparation failed' }
    npm run check --prefix work/cyb-math-download
    if ($LASTEXITCODE -ne 0) { throw 'Download-center validation failed' }
    npm run deploy --prefix work/cyb-math-download
    if ($LASTEXITCODE -ne 0) { throw 'Download-center deployment failed' }
  }

  if (-not $SkipGitHub) {
    if (-not $env:GITHUB_TOKEN) {
      $credentialInput = "protocol=https`nhost=github.com`nusername=$($release.github.owner)`n`n"
      $credential = $credentialInput | git credential fill
      $password = $credential | Where-Object { $_ -like 'password=*' } | Select-Object -First 1
      if ($password) { $env:GITHUB_TOKEN = $password.Substring('password='.Length) }
    }
    if (-not $env:GITHUB_TOKEN) { throw 'GitHub authentication is unavailable. Set GITHUB_TOKEN or sign in with Git Credential Manager.' }
    node scripts/release/github-release.mjs
    if ($LASTEXITCODE -ne 0) { throw 'GitHub Release publication failed' }
  }
} finally {
  Pop-Location
}
