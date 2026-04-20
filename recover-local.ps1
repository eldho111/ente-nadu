[CmdletBinding()]
param(
  [switch]$OpenBrowser
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$stableCompose = Join-Path $projectRoot "infra\docker-compose.local-stable.yml"
$devCompose = Join-Path $projectRoot "infra\docker-compose.yml"
$envFile = Join-Path $projectRoot ".env"
$envExample = Join-Path $projectRoot ".env.example"

function Ensure-RepoRoot {
  if ((Get-Location).Path -ne $projectRoot) {
    Set-Location $projectRoot
  }
}

function Wait-Http([string]$Url, [int]$Attempts = 50, [int]$DelaySeconds = 2) {
  for ($i = 1; $i -le $Attempts; $i++) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 6
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
        return
      }
    } catch {
      Start-Sleep -Seconds $DelaySeconds
    }
  }
  throw "Health check failed: $Url"
}

function ComposeDownSilent([string[]]$BaseArgs) {
  $previous = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    & docker @BaseArgs "down" "--remove-orphans" 1>$null 2>$null
  } finally {
    $ErrorActionPreference = $previous
  }
}

Ensure-RepoRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "docker CLI is not available in PATH."
}

if (-not (Test-Path $envFile)) {
  if (Test-Path $envExample) {
    Copy-Item $envExample $envFile
  } else {
    throw ".env missing and .env.example not found."
  }
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
  throw "Docker daemon not reachable. Start Docker Desktop first."
}

$stableArgs = @("compose", "-f", $stableCompose, "--env-file", $envFile)
$devArgs = @("compose", "-f", $devCompose, "--env-file", $envFile)

Write-Host "Step 1/4: Cleaning conflicting compose profiles..."
ComposeDownSilent $devArgs
ComposeDownSilent $stableArgs

Write-Host "Step 2/4: Starting stable stack..."
& docker @stableArgs "up" "-d" "--build" "postgres" "redis" "minio" "api" "web" "worker"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to start stable stack."
}

Write-Host "Step 3/4: Waiting for services..."
Wait-Http "http://localhost:3000/plain.html"
Wait-Http "http://localhost:3000/app"
Wait-Http "http://localhost:8000/health"

Write-Host "Step 4/4: Status"
& docker @stableArgs "ps"

Write-Host ""
Write-Host "Ready."
Write-Host "Static probe: http://localhost:3000/plain.html"
Write-Host "App safe:     http://localhost:3000/app"
Write-Host "Full map:     http://localhost:3000/app?safe=0"
Write-Host "Doctor:       http://localhost:3000/doctor/runtime"

if ($OpenBrowser) {
  Start-Process "http://localhost:3000/plain.html"
  Start-Process "http://localhost:3000/app"
}
