# One-time publish: creates the GitHub repo `arise` under 4445392, pushes, and turns on GitHub Pages (Actions source).
# Prereqs: GitHub CLI installed (winget install GitHub.cli) and logged in (gh auth login).
$ErrorActionPreference = 'Continue'
$user = '4445392'

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Host 'GitHub CLI not found. Install it with:  winget install GitHub.cli   (then reopen the terminal)' -ForegroundColor Yellow
  exit 1
}
gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Not logged in. Run:  gh auth login   (choose GitHub.com, HTTPS, login with browser)' -ForegroundColor Yellow
  exit 1
}

Set-Location (Join-Path $PSScriptRoot '..')
npm test
if ($LASTEXITCODE -ne 0) { throw 'Tests failed - not publishing.' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed - not publishing.' }

gh repo view "$user/arise" 2>$null
if ($LASTEXITCODE -ne 0) {
  gh repo create arise --public --source . --remote origin --push
} else {
  if (-not (git remote get-url origin 2>$null)) { git remote add origin "https://github.com/$user/arise.git" }
  git push -u origin main
}

# Enable Pages with "GitHub Actions" as the source (ignore the error if it is already enabled).
gh api -X POST "repos/$user/arise/pages" -f build_type=workflow 2>$null
gh api -X PUT "repos/$user/arise/pages" -f build_type=workflow 2>$null

Write-Host ''
Write-Host "Published. The first deploy takes about 1-2 minutes: https://$user.github.io/arise/" -ForegroundColor Green
Write-Host "Watch it: gh run watch   |   Install on phone: see README.md"
