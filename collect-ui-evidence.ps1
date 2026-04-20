[CmdletBinding()]
param(
  [string]$ComposeFile = "infra/docker-compose.local-stable.yml",
  [string]$EnvFile = ".env",
  [string]$OutFile = "ui-evidence.json",
  [int]$LogTail = 200
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

function Invoke-SafeRequest([string]$Url) {
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 8
    return [ordered]@{
      ok = $true
      status = [int]$response.StatusCode
      content_length = ([string]$response.Content).Length
      content = [string]$response.Content
      error = ""
    }
  } catch {
    return [ordered]@{
      ok = $false
      status = 0
      content_length = 0
      content = ""
      error = $_.Exception.Message
    }
  }
}

function Get-AppAssetPaths([string]$Html) {
  if (-not $Html) {
    return @()
  }
  $matches = [regex]::Matches($Html, "(?:src|href)=`"(?<path>\/_next\/static\/[^`"]+)`"")
  $paths = New-Object 'System.Collections.Generic.List[string]'
  foreach ($match in $matches) {
    $path = $match.Groups["path"].Value
    if ($path -and -not $paths.Contains($path)) {
      $paths.Add($path)
    }
  }
  return @($paths)
}

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if ((Get-Location).Path -ne $projectRoot) {
  Set-Location $projectRoot
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "docker CLI not found in PATH."
}

if (-not (Test-Path $ComposeFile)) {
  throw "Compose file not found: $ComposeFile"
}
if (-not (Test-Path $EnvFile)) {
  throw "Env file not found: $EnvFile"
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
  throw "Docker daemon is not reachable."
}

$composeArgs = @("compose", "-f", $ComposeFile, "--env-file", $EnvFile)

$composePs = (& docker @composeArgs "ps" 2>&1) | Out-String
$webLogs = (& docker @composeArgs "logs" "--tail" "$LogTail" "web" 2>&1) | Out-String

$diag = Invoke-SafeRequest "http://localhost:3000/diag.html"
$doctor = Invoke-SafeRequest "http://localhost:3000/doctor"
$doctorRuntime = Invoke-SafeRequest "http://localhost:3000/doctor/runtime"
$doctorRuntimeSnapshot = Invoke-SafeRequest "http://localhost:3000/doctor/runtime/snapshot"
$app = Invoke-SafeRequest "http://localhost:3000/app"
$appSafe = Invoke-SafeRequest "http://localhost:3000/app?safe=1"
$health = Invoke-SafeRequest "http://localhost:8000/health"
$runtimeMeta = Invoke-SafeRequest "http://localhost:8000/v1/meta/runtime"

$assetChecks = @()
$assetPaths = Get-AppAssetPaths $app.content
foreach ($path in $assetPaths) {
  $assetResult = Invoke-SafeRequest ("http://localhost:3000" + $path)
  $assetChecks += [ordered]@{
    path = $path
    ok = $assetResult.ok
    status = $assetResult.status
    error = $assetResult.error
  }
}

$failingAssets = @($assetChecks | Where-Object { -not $_.ok })
$branch = "unknown"
if (-not $app.ok -or -not $diag.ok) {
  $branch = "container_runtime"
} elseif ($app.ok -and $diag.ok -and $appSafe.ok -and $failingAssets.Count -eq 0) {
  $branch = "browser_runtime"
}

$runtimeMetaJson = $null
if ($runtimeMeta.ok -and $runtimeMeta.content) {
  try {
    $runtimeMetaJson = $runtimeMeta.content | ConvertFrom-Json
  } catch {
    $runtimeMetaJson = $null
  }
}

$doctorRuntimeSnapshotJson = $null
if ($doctorRuntimeSnapshot.ok -and $doctorRuntimeSnapshot.content) {
  try {
    $doctorRuntimeSnapshotJson = $doctorRuntimeSnapshot.content | ConvertFrom-Json
  } catch {
    $doctorRuntimeSnapshotJson = $null
  }
}

$summary = [ordered]@{
  timestamp_utc = [DateTime]::UtcNow.ToString("o")
  compose_file = $ComposeFile
  env_file = $EnvFile
  decision_branch = $branch
  checks = [ordered]@{
    diag = [ordered]@{ ok = $diag.ok; status = $diag.status; error = $diag.error }
    doctor = [ordered]@{ ok = $doctor.ok; status = $doctor.status; error = $doctor.error }
    doctor_runtime = [ordered]@{ ok = $doctorRuntime.ok; status = $doctorRuntime.status; error = $doctorRuntime.error }
    doctor_runtime_snapshot = [ordered]@{ ok = $doctorRuntimeSnapshot.ok; status = $doctorRuntimeSnapshot.status; error = $doctorRuntimeSnapshot.error }
    app = [ordered]@{ ok = $app.ok; status = $app.status; content_length = $app.content_length; error = $app.error }
    app_safe = [ordered]@{ ok = $appSafe.ok; status = $appSafe.status; content_length = $appSafe.content_length; error = $appSafe.error }
    api_health = [ordered]@{ ok = $health.ok; status = $health.status; error = $health.error }
    runtime_meta = [ordered]@{ ok = $runtimeMeta.ok; status = $runtimeMeta.status; error = $runtimeMeta.error }
  }
  runtime_doctor_snapshot_json = $doctorRuntimeSnapshotJson
  runtime_meta_json = $runtimeMetaJson
  app_asset_checks = $assetChecks
  compose_ps = $composePs.Trim()
  web_logs_tail = $webLogs.Trim()
}

$json = $summary | ConvertTo-Json -Depth 8
Set-Content -Path $OutFile -Value $json -Encoding UTF8

Write-Host "Evidence written to $OutFile"
Write-Host ""
Write-Host "Decision branch: $branch"
Write-Host "App /diag /safe statuses:"
Write-Host " - /app: $($app.status)"
Write-Host " - /diag.html: $($diag.status)"
Write-Host " - /app?safe=1: $($appSafe.status)"
if ($failingAssets.Count -gt 0) {
  Write-Host "Failing assets:"
  $failingAssets | ForEach-Object { Write-Host (" - {0} ({1})" -f $_.path, $_.status) }
}
