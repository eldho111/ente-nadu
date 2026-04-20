[CmdletBinding()]
param(
  [string]$ComposeFile = "infra/docker-compose.yml",
  [string]$EnvFile = ".env",
  [int]$WarnDepth = 200,
  [int]$CriticalDepth = 1000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker CLI is not available."
}

if (-not (Test-Path $ComposeFile)) {
  throw "Compose file not found: $ComposeFile"
}

if (-not (Test-Path $EnvFile)) {
  throw "Env file not found: $EnvFile"
}

$args = @("compose", "-f", $ComposeFile, "--env-file", $EnvFile, "exec", "-T", "redis", "redis-cli")

$classification = & docker @args "LLEN" "rq:queue:classification"
$failed = & docker @args "LLEN" "rq:queue:failed"

$classificationDepth = [int]($classification | Select-Object -Last 1)
$failedDepth = [int]($failed | Select-Object -Last 1)

Write-Host "classification queue depth: $classificationDepth"
Write-Host "failed queue depth: $failedDepth"

if ($classificationDepth -ge $CriticalDepth -or $failedDepth -ge 1) {
  Write-Host "queue status: CRITICAL" -ForegroundColor Red
  exit 2
}

if ($classificationDepth -ge $WarnDepth) {
  Write-Host "queue status: WARNING" -ForegroundColor Yellow
  exit 1
}

Write-Host "queue status: OK" -ForegroundColor Green
exit 0

