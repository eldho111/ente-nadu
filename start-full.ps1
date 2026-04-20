[CmdletBinding()]
param(
  [switch]$Rebuild,
  [switch]$Logs,
  [switch]$Stop,
  [switch]$Dev,
  [switch]$NoProfileCleanup
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$stableComposeFile = Join-Path $projectRoot "infra\docker-compose.local-stable.yml"
$devComposeFile = Join-Path $projectRoot "infra\docker-compose.yml"
$composeFile = if ($Dev) {
  $devComposeFile
} else {
  $stableComposeFile
}
$otherComposeFile = if ($Dev) {
  $stableComposeFile
} else {
  $devComposeFile
}
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

function Assert-ServiceRunning([string[]]$BaseArgs, [string]$ServiceName) {
  $running = & docker @BaseArgs "ps" "--services" "--status" "running"
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to inspect running services."
  }
  if ($running -notcontains $ServiceName) {
    throw "Required service '$ServiceName' is not running."
  }
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

if ($Dev) {
  $modeLabel = "development hot-reload"
} else {
  $modeLabel = "stable local (prod-like runtime)"
}

if (-not (Test-Path $composeFile)) {
  throw "Compose file not found: $composeFile"
}

if (-not (Test-Path $otherComposeFile)) {
  throw "Compose file not found: $otherComposeFile"
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

$memGiB = Get-DockerMemoryGiB
if ($memGiB -ne $null) {
  Write-Host ("Docker VM memory: {0} GiB" -f $memGiB)
  if ($memGiB -lt 6) {
    Write-Warning "Docker memory is below 6 GiB. Stability may degrade under rebuild/load."
  }
}

$baseArgs = @("compose", "-f", $composeFile, "--env-file", $envFile)
$otherArgs = @("compose", "-f", $otherComposeFile, "--env-file", $envFile)

if ($Stop) {
  Invoke-ComposeDownSilent $baseArgs "selected"
  if (-not $NoProfileCleanup) {
    Invoke-ComposeDownSilent $otherArgs "other"
  }
  Write-Host "Full stack stopped."
  exit 0
}

if (-not $NoProfileCleanup) {
  Write-Host "Stopping potentially conflicting compose profiles..."
  Invoke-ComposeDownSilent $baseArgs "selected"
  Invoke-ComposeDownSilent $otherArgs "other"
}

$upArgs = $baseArgs + @("up", "-d")
if ($Rebuild) {
  $upArgs += "--build"
}

& docker @upArgs
if ($LASTEXITCODE -ne 0) {
  throw "Failed to start full stack."
}

Wait-HttpHealthy "http://localhost:3000"
Wait-HttpHealthy "http://localhost:8000/health"
Assert-ServiceRunning $baseArgs "worker"

& docker @baseArgs "ps"
Write-Host ""
Write-Host "Mode: $modeLabel"
Write-Host "Web: http://localhost:3000"
Write-Host "App shell: http://localhost:3000/app"
Write-Host "API health: http://localhost:8000/health"

if ($Logs) {
  Write-Host ""
  Write-Host "Tailing api/web/worker logs..."
  & docker @baseArgs "logs" "-f" "api" "web" "worker"
}
