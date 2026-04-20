[CmdletBinding()]
param(
  [string]$ComposeFile = "infra/docker-compose.local-stable.yml",
  [string]$EnvFile = ".env",
  [int]$LogTail = 250
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-Http([string]$Url) {
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 6
    return @{
      ok = $true
      code = [int]$response.StatusCode
      error = ""
    }
  } catch {
    return @{
      ok = $false
      code = 0
      error = $_.Exception.Message
    }
  }
}

function Test-HttpWithContent([string]$Url) {
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 8
    return @{
      ok = $true
      code = [int]$response.StatusCode
      error = ""
      content = [string]$response.Content
    }
  } catch {
    return @{
      ok = $false
      code = 0
      error = $_.Exception.Message
      content = ""
    }
  }
}

function Add-Issue([System.Collections.Generic.List[string]]$List, [string]$Issue) {
  if (-not $List.Contains($Issue)) {
    $List.Add($Issue)
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

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if ((Get-Location).Path -ne $projectRoot) {
  Set-Location $projectRoot
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "docker CLI not found in PATH."
}

$issues = New-Object 'System.Collections.Generic.List[string]'
$notes = New-Object 'System.Collections.Generic.List[string]'
$lowMemory = $false

Write-Host "== Civic Pulse UI Diagnostics =="
Write-Host "Project: $projectRoot"
Write-Host "Compose: $ComposeFile"
Write-Host "Env: $EnvFile"
Write-Host ""

try {
  docker info *> $null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Docker daemon is reachable."
    $memGiB = Get-DockerMemoryGiB
    if ($memGiB -ne $null) {
      Write-Host "[INFO] Docker VM memory: $memGiB GiB"
      if ($memGiB -lt 6) {
        $lowMemory = $true
        $notes.Add("Docker VM memory is below 6 GiB. Rebuilds and concurrent workloads may be unstable.")
      }
    }
  }
} catch {
  Add-Issue $issues "docker_daemon_unreachable"
  Write-Host "[FAIL] Docker daemon is not reachable."
}

if (-not (Test-Path $ComposeFile)) {
  Add-Issue $issues "compose_file_missing"
  Write-Host "[FAIL] Compose file missing: $ComposeFile"
}

if (-not (Test-Path $EnvFile)) {
  Add-Issue $issues "env_file_missing"
  Write-Host "[FAIL] Env file missing: $EnvFile"
}

if ($issues.Count -gt 0) {
  Write-Host ""
  Write-Host "Diagnosis stopped early due to startup blockers:"
  $issues | ForEach-Object { Write-Host " - $_" }
  Write-Host ""
  Write-Host "Recommended fix:"
  Write-Host "1) Start Docker Desktop and wait for Engine running."
  Write-Host "2) Ensure .env exists in repo root."
  Write-Host "3) Re-run: .\diagnose-ui.ps1"
  exit 1
}

$composeArgs = @("compose", "-f", $ComposeFile, "--env-file", $EnvFile)

$psOutput = (& docker @composeArgs "ps" 2>&1) | Out-String
if ($LASTEXITCODE -ne 0) {
  Add-Issue $issues "compose_ps_failed"
  Write-Host "[FAIL] Unable to read compose status."
  Write-Host $psOutput
} else {
  Write-Host "[OK] Compose status read."
}

$composeHasWeb = $psOutput -match "(?im)\bweb\b"
$composeHasApi = $psOutput -match "(?im)\bapi\b"

if ($psOutput -match "(?im)web.+(Exit|Restarting|unhealthy)") { Add-Issue $issues "web_container_unhealthy" }
if ($psOutput -match "(?im)api.+(Exit|Restarting|unhealthy)") { Add-Issue $issues "api_container_unhealthy" }

$webRoot = Test-Http "http://localhost:3000"
$webApp = Test-HttpWithContent "http://localhost:3000/app"
$webAppSafe = Test-Http "http://localhost:3000/app?safe=1"
$webDoctor = Test-Http "http://localhost:3000/doctor"
$webDoctorRuntime = Test-Http "http://localhost:3000/doctor/runtime"
$webPlain = Test-Http "http://localhost:3000/plain.html"
$webClearCache = Test-Http "http://localhost:3000/clear-cache"
$webDiag = Test-Http "http://localhost:3000/diag.html"
$apiHealth = Test-Http "http://localhost:8000/health"

if ($webRoot.ok) {
  Write-Host "[OK] http://localhost:3000 => $($webRoot.code)"
} else {
  Add-Issue $issues "web_http_unreachable"
  Write-Host "[FAIL] http://localhost:3000 unreachable: $($webRoot.error)"
}

if ($webApp.ok) {
  Write-Host "[OK] http://localhost:3000/app => $($webApp.code)"
} else {
  Add-Issue $issues "web_app_route_unreachable"
  Write-Host "[FAIL] http://localhost:3000/app unreachable: $($webApp.error)"
}
if ($webAppSafe.ok) {
  Write-Host "[OK] http://localhost:3000/app?safe=1 => $($webAppSafe.code)"
} else {
  Add-Issue $issues "web_app_safe_route_unreachable"
  Write-Host "[FAIL] http://localhost:3000/app?safe=1 unreachable: $($webAppSafe.error)"
}
if ($webDoctor.ok) {
  Write-Host "[OK] http://localhost:3000/doctor => $($webDoctor.code)"
} else {
  Add-Issue $issues "web_doctor_route_unreachable"
  Write-Host "[FAIL] http://localhost:3000/doctor unreachable: $($webDoctor.error)"
}
if ($webDoctorRuntime.ok) {
  Write-Host "[OK] http://localhost:3000/doctor/runtime => $($webDoctorRuntime.code)"
} else {
  Add-Issue $issues "web_doctor_runtime_route_unreachable"
  Write-Host "[FAIL] http://localhost:3000/doctor/runtime unreachable: $($webDoctorRuntime.error)"
}
if ($webPlain.ok) {
  Write-Host "[OK] http://localhost:3000/plain.html => $($webPlain.code)"
} else {
  Add-Issue $issues "web_plain_probe_route_unreachable"
  Write-Host "[FAIL] http://localhost:3000/plain.html unreachable: $($webPlain.error)"
}
if ($webClearCache.ok) {
  Write-Host "[OK] http://localhost:3000/clear-cache => $($webClearCache.code)"
} else {
  Add-Issue $issues "web_clear_cache_route_unreachable"
  Write-Host "[FAIL] http://localhost:3000/clear-cache unreachable: $($webClearCache.error)"
}
if ($webDiag.ok) {
  Write-Host "[OK] http://localhost:3000/diag.html => $($webDiag.code)"
} else {
  Add-Issue $issues "web_diag_route_unreachable"
  Write-Host "[FAIL] http://localhost:3000/diag.html unreachable: $($webDiag.error)"
}

if ($apiHealth.ok) {
  Write-Host "[OK] http://localhost:8000/health => $($apiHealth.code)"
} else {
  Add-Issue $issues "api_http_unreachable"
  Write-Host "[FAIL] http://localhost:8000/health unreachable: $($apiHealth.error)"
}

if (-not $composeHasWeb) {
  if ($webRoot.ok -or $webApp.ok) {
    $notes.Add("Web is reachable, but selected compose profile does not show a web service. You may be using a different compose file.")
  } else {
    Add-Issue $issues "web_service_missing_or_not_started"
  }
}
if (-not $composeHasApi) {
  if ($apiHealth.ok) {
    $notes.Add("API is reachable, but selected compose profile does not show an api service. You may be using a different compose file.")
  } else {
    Add-Issue $issues "api_service_missing_or_not_started"
  }
}

if ($webApp.ok -and $webApp.content) {
  $assetMatches = [regex]::Matches(
    $webApp.content,
    "(?:src|href)=`"(?<path>\/_next\/static\/[^`"]+)`""
  )
  $assetPaths = @()
  foreach ($match in $assetMatches) {
    $path = $match.Groups["path"].Value
    if ($path -and -not ($assetPaths -contains $path)) {
      $assetPaths += $path
    }
  }

  if ($assetPaths.Count -gt 0) {
    $failedAssets = @()
    foreach ($path in $assetPaths) {
      $assetCheck = Test-Http ("http://localhost:3000" + $path)
      if (-not $assetCheck.ok) {
        $failedAssets += $path
      }
    }
    if ($failedAssets.Count -gt 0) {
      Add-Issue $issues "next_static_asset_failures"
      $notes.Add("Broken app assets: " + ($failedAssets -join ", "))
    } else {
      $notes.Add("All referenced /_next/static assets from /app responded successfully.")
    }
  } else {
    Add-Issue $issues "no_next_assets_detected_in_app_html"
  }
}

$webLogs = (& docker @composeArgs "logs" "--tail" "$LogTail" "web" 2>&1) | Out-String

if ($webLogs -match "Missing required html tags") {
  Add-Issue $issues "next_root_layout_tag_error"
}
if ($webLogs -match "Could not find a production build in the '.next") {
  Add-Issue $issues "next_missing_production_build"
}
if ($webLogs -match "Cannot find module|ChunkLoadError|ENOENT: no such file|module not found") {
  Add-Issue $issues "next_artifact_or_chunk_corruption"
}
if ($webLogs -match "EADDRINUSE|address already in use") {
  Add-Issue $issues "port_conflict"
}
if ($webLogs -match "ECONNREFUSED.+8000|fetch failed") {
  Add-Issue $issues "web_to_api_connectivity_or_config_error"
}

if ($issues.Count -eq 0) {
  $notes.Add("No server-side startup failure detected. If screen is still white, likely browser cache/service-worker or client runtime crash.")
  $notes.Add("Open http://localhost:3000/doctor/runtime and then test http://localhost:3000/app?safe=1.")
}

Write-Host ""
Write-Host "== Findings =="
if ($issues.Count -eq 0) {
  Write-Host "No hard backend/container issue detected."
} else {
  $issues | ForEach-Object { Write-Host " - $_" }
}

Write-Host ""
Write-Host "== Suggested Actions =="
if ($issues.Contains("docker_daemon_unreachable")) {
  Write-Host "1) Start Docker Desktop and wait for Engine running."
}
if ($lowMemory) {
  Write-Host "1) Increase WSL2 memory to at least 6 GiB (8 GiB preferred) and restart Docker Desktop."
}
if (@($notes | Where-Object { $_ -match "compose profile" }).Count -gt 0) {
  Write-Host "1) Re-run with compose profile you used to start services:"
  Write-Host "   .\diagnose-ui.ps1 -ComposeFile infra/docker-compose.yml"
  Write-Host "   or"
  Write-Host "   .\diagnose-ui.ps1 -ComposeFile infra/docker-compose.local-stable.yml"
}
if ($issues.Contains("web_container_unhealthy") -or $issues.Contains("next_artifact_or_chunk_corruption")) {
  Write-Host "1) Run: .\repair-web.ps1 -Rebuild"
}
if ($issues.Contains("next_static_asset_failures")) {
  Write-Host "1) Rebuild web image without cache:"
  Write-Host "   docker compose -f infra/docker-compose.local-stable.yml --env-file .env build --no-cache web"
  Write-Host "2) Restart web:"
  Write-Host "   docker compose -f infra/docker-compose.local-stable.yml --env-file .env up -d web"
}
if ($issues.Contains("next_missing_production_build")) {
  Write-Host "1) Rebuild web image (build and runtime NEXT_DIST_DIR must match):"
  Write-Host "   docker compose -f infra/docker-compose.local-stable.yml --env-file .env build --no-cache web"
  Write-Host "2) Restart web container:"
  Write-Host "   docker compose -f infra/docker-compose.local-stable.yml --env-file .env up -d web"
}
if ($issues.Contains("next_root_layout_tag_error")) {
  Write-Host "1) Ensure Next is launched from repo root only."
  Write-Host "2) Use: npm run preview:web"
}
if ($issues.Contains("web_to_api_connectivity_or_config_error") -or $issues.Contains("api_http_unreachable")) {
  Write-Host "1) Restart full stack: .\start-full.ps1 -Rebuild"
  Write-Host "2) Verify .env API URLs are correct for local mode."
}
if ($issues.Contains("port_conflict")) {
  Write-Host "1) Free port 3000 (or 8000) and restart compose."
}
if ($issues.Count -eq 0) {
  Write-Host "1) Visit: http://localhost:3000/doctor/runtime"
  Write-Host "2) Visit: http://localhost:3000/plain.html"
  Write-Host "3) Visit: http://localhost:3000/app?safe=1"
  Write-Host "4) If needed, visit: http://localhost:3000/clear-cache and hard refresh (Ctrl+Shift+R)."
}

if ($notes.Count -gt 0) {
  Write-Host ""
  Write-Host "== Notes =="
  $notes | ForEach-Object { Write-Host " - $_" }
}
