[CmdletBinding()]
param(
  [switch]$Dev,
  [switch]$Rebuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$composeFile = if ($Dev) {
  Join-Path $projectRoot "infra\docker-compose.yml"
} else {
  Join-Path $projectRoot "infra\docker-compose.local-stable.yml"
}
$envFile = Join-Path $projectRoot ".env"
$webRoot = Join-Path $projectRoot "web"

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
  throw ".env not found: $envFile"
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker CLI is not installed."
}

try {
  docker info *> $null
} catch {
  throw "Docker engine is not running. Start Docker Desktop first."
}

Write-Host "Cleaning Next.js build artifacts in $webRoot"
Remove-Item -Path (Join-Path $webRoot ".next") -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path (Join-Path $webRoot ".next-dev") -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path (Join-Path $webRoot ".next-prod") -Recurse -Force -ErrorAction SilentlyContinue

$baseArgs = @("compose", "-f", $composeFile, "--env-file", $envFile)
$upArgs = $baseArgs + @("up", "-d")
if ($Rebuild) {
  $upArgs += "--build"
}
$upArgs += @("api", "web")

& docker @upArgs
if ($LASTEXITCODE -ne 0) {
  throw "Failed to restart API/web after cleanup."
}

Wait-HttpHealthy "http://localhost:3000"
Wait-HttpHealthy "http://localhost:8000/health"

Write-Host "Web recovery complete."
Write-Host "Web: http://localhost:3000"
Write-Host "App shell: http://localhost:3000/app"
