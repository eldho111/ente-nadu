[CmdletBinding()]
param(
  [switch]$Rebuild,
  [switch]$Stop,
  [switch]$Logs
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$composeFile = Join-Path $projectRoot "infra\docker-compose.prod.yml"
$envFile = Join-Path $projectRoot ".env"

if (-not (Test-Path $composeFile)) {
  throw "Compose file not found: $composeFile"
}
if (-not (Test-Path $envFile)) {
  throw ".env not found: $envFile"
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker CLI is not installed."
}

docker info *> $null

$baseArgs = @("compose", "-f", $composeFile, "--env-file", $envFile)

if ($Stop) {
  & docker @baseArgs "down"
  exit $LASTEXITCODE
}

$upArgs = $baseArgs + @("up", "-d")
if ($Rebuild) {
  $upArgs += "--build"
}
& docker @upArgs
if ($LASTEXITCODE -ne 0) {
  throw "Failed to start production stack."
}

& docker @baseArgs "ps"
Write-Host ""
Write-Host "Proxy endpoint: http://localhost"
Write-Host "API health: http://localhost/health"

if ($Logs) {
  & docker @baseArgs "logs" "-f" "caddy" "api" "web"
}
