[CmdletBinding()]
param(
  [switch]$Rebuild,
  [switch]$Logs,
  [switch]$Stop
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$composeFile = Join-Path $projectRoot "infra\docker-compose.yml"
$envFile = Join-Path $projectRoot ".env"
$envExample = Join-Path $projectRoot ".env.example"

function Ensure-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' is not available in PATH."
  }
}

function Ensure-RepoRoot {
  $current = (Get-Location).Path
  if ($current -ne $projectRoot) {
    Write-Host "Switching working directory to repo root: $projectRoot"
    Set-Location $projectRoot
  }
}

function Wait-HttpHealthy([string]$Url, [int]$Attempts = 30, [int]$DelaySeconds = 2) {
  for ($i = 1; $i -le $Attempts; $i++) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
        return
      }
    } catch {
      Start-Sleep -Seconds $DelaySeconds
      continue
    }
    Start-Sleep -Seconds $DelaySeconds
  }
  throw "Health check failed: $Url did not return HTTP 2xx/3xx in time."
}

if (-not (Test-Path $composeFile)) {
  throw "Compose file not found: $composeFile"
}

if (-not (Test-Path $envFile)) {
  if (Test-Path $envExample) {
    Copy-Item $envExample $envFile
    Write-Host "Created .env from .env.example"
  } else {
    throw ".env is missing and .env.example was not found."
  }
}

Ensure-RepoRoot
Ensure-Command "docker"

try {
  docker info *> $null
} catch {
  throw "Docker engine is not running. Start Docker Desktop first."
}

$baseArgs = @("compose", "-f", $composeFile, "--env-file", $envFile)

if ($Stop) {
  & docker @baseArgs "down"
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to stop UI stack."
  }
  Write-Host "UI stack stopped."
  exit 0
}

$upArgs = $baseArgs + @("up", "-d")
if ($Rebuild) {
  $upArgs += "--build"
}
$upArgs += "web"

& docker @upArgs
if ($LASTEXITCODE -ne 0) {
  throw "Failed to start UI stack."
}

Wait-HttpHealthy "http://localhost:3000"

& docker @baseArgs "ps"
Write-Host ""
Write-Host "UI should be available at: http://localhost:3000"
Write-Warning "UI-only debug mode starts only the web service. Use .\start-full.ps1 for API + worker + database stack."

if ($Logs) {
  Write-Host ""
  Write-Host "Tailing web logs..."
  & docker @baseArgs "logs" "-f" "web"
}
