[CmdletBinding()]
param(
  [switch]$SkipWebRebuild,
  [switch]$SkipProfileCleanup,
  [int]$LogTail = 120
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$stableComposeFile = Join-Path $projectRoot "infra\docker-compose.local-stable.yml"
$devComposeFile = Join-Path $projectRoot "infra\docker-compose.yml"
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

function Wait-HttpHealthy([string]$Url, [int]$Attempts = 45, [int]$DelaySeconds = 2) {
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

function Get-DockerMemoryGiB {
  try {
    $memBytesRaw = & docker info --format "{{.MemTotal}}"
    if ($LASTEXITCODE -ne 0) { return $null }
    $memBytes = [double]$memBytesRaw
    if ($memBytes -le 0) { return $null }
    return [Math]::Round($memBytes / 1GB, 3)
  } catch {
    return $null
  }
}

function Check-Url([string]$Url) {
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 8
    Write-Host "[OK] $Url => $($response.StatusCode)"
  } catch {
    Write-Host "[FAIL] $Url => $($_.Exception.Message)"
    throw "Endpoint check failed: $Url"
  }
}

if (-not (Test-Path $stableComposeFile)) {
  throw "Compose file not found: $stableComposeFile"
}
if (-not (Test-Path $devComposeFile)) {
  throw "Compose file not found: $devComposeFile"
}

Ensure-RepoRoot
Ensure-Command "docker"

if (-not (Test-Path $envFile)) {
  if (Test-Path $envExample) {
    Copy-Item $envExample $envFile
    Write-Host "Created .env from .env.example"
  } else {
    throw ".env is missing and .env.example was not found."
  }
}

try {
  docker info *> $null
} catch {
  throw "Docker engine is not running. Start Docker Desktop first."
}

$memGiB = Get-DockerMemoryGiB
if ($memGiB -ne $null) {
  Write-Host "Docker VM memory: $memGiB GiB"
  if ($memGiB -lt 6) {
    Write-Warning "Docker memory is below 6 GiB. Rebuilds may be unstable."
  }
}

$stableArgs = @("compose", "-f", $stableComposeFile, "--env-file", $envFile)
$devArgs = @("compose", "-f", $devComposeFile, "--env-file", $envFile)

function Invoke-ComposeDownSilent([string[]]$BaseArgs, [string]$Label) {
  $previousErrorAction = $ErrorActionPreference
  $exitCode = 0
  try {
    # Docker writes progress to stderr. In Windows PowerShell with ErrorAction=Stop,
    # that can throw even for successful operations.
    $ErrorActionPreference = "Continue"
    & docker @BaseArgs "down" "--remove-orphans" *> $null
    $exitCode = $LASTEXITCODE
  } catch {
    if ($LASTEXITCODE -ne $null) {
      $exitCode = $LASTEXITCODE
    } else {
      $exitCode = 1
    }
  } finally {
    $ErrorActionPreference = $previousErrorAction
  }

  if ($exitCode -ne 0) {
    Write-Warning ("Cleanup failed for {0} profile (exit {1}). Continuing." -f $Label, $exitCode)
  }
}

Write-Host ""
Write-Host "Step 1/8: Ensure only one compose profile is active"
if (-not $SkipProfileCleanup) {
  Invoke-ComposeDownSilent $devArgs "dev"
  Invoke-ComposeDownSilent $stableArgs "stable"
} else {
  Write-Host "Skipped profile cleanup (--SkipProfileCleanup)."
}

Write-Host "Step 2/8: Rebuild web image (clean)"
if (-not $SkipWebRebuild) {
  & docker @stableArgs "build" "--no-cache" "web"
  if ($LASTEXITCODE -ne 0) { throw "Failed to build web image." }
} else {
  Write-Host "Skipped web rebuild (--SkipWebRebuild)."
}

Write-Host "Step 3/8: Start stable stack"
& docker @stableArgs "up" "-d" "postgres" "redis" "minio" "api" "web" "worker"
if ($LASTEXITCODE -ne 0) { throw "Failed to start stable stack." }

Write-Host "Step 4/8: Wait for HTTP readiness"
Wait-HttpHealthy "http://localhost:8000/health"
Wait-HttpHealthy "http://localhost:3000/diag.html"

Write-Host "Step 5/8: Initialize database"
& docker @stableArgs "exec" "api" "python" "-m" "app.db.init_db"
if ($LASTEXITCODE -ne 0) { throw "Database initialization failed." }

Write-Host "Step 6/8: Validate service status and logs"
& docker @stableArgs "ps"
& docker @stableArgs "logs" "--tail" "$LogTail" "web"
& docker @stableArgs "logs" "--tail" "$LogTail" "api"

Write-Host "Step 7/8: Validate endpoints"
Check-Url "http://localhost:3000/diag.html"
Check-Url "http://localhost:3000/doctor"
Check-Url "http://localhost:3000/app"
Check-Url "http://localhost:8000/health"

Write-Host "Step 8/8: Snapshot runtime memory"
& docker "stats" "--no-stream"

Write-Host ""
Write-Host "Local stable run completed."
Write-Host "Web: http://localhost:3000/app"
Write-Host "Diagnostics: .\\diagnose-ui.ps1 -ComposeFile infra\\docker-compose.local-stable.yml"
