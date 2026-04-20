<#
.SYNOPSIS
  Launch Cloudflare tunnels for web, API, and MinIO so the app is accessible from a phone.

.DESCRIPTION
  Starts three cloudflared quick-tunnels (no account needed) that expose
  localhost:3000 (web), localhost:8000 (API), and localhost:9000 (MinIO)
  to the internet via HTTPS.

  After the tunnels start, the script prints the URLs and updates .env
  with the tunnel URLs, then restarts the web container so it picks up
  the new NEXT_PUBLIC_API_BASE_URL.

.PARAMETER ComposeFile
  Docker Compose file to use for restarting services.
  Default: infra\docker-compose.yml (dev hot-reload).

.PARAMETER SkipRestart
  Skip restarting Docker services after updating .env.

.EXAMPLE
  .\start-tunnels.ps1
  .\start-tunnels.ps1 -ComposeFile infra\docker-compose.local-stable.yml
#>
[CmdletBinding()]
param(
  [string]$ComposeFile,
  [switch]$SkipRestart
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $projectRoot ".env"

if (-not $ComposeFile) {
  # Auto-detect: prefer local-stable if it exists
  $localStable = Join-Path $projectRoot "infra\docker-compose.local-stable.yml"
  $dev = Join-Path $projectRoot "infra\docker-compose.yml"
  $ComposeFile = if (Test-Path $localStable) { $localStable } else { $dev }
}

if (-not (Get-Command "cloudflared" -ErrorAction SilentlyContinue)) {
  Write-Error "cloudflared is not installed. Run: winget install Cloudflare.cloudflared"
  exit 1
}

Write-Host "Starting Cloudflare tunnels..." -ForegroundColor Cyan
Write-Host "  Web  -> localhost:3000"
Write-Host "  API  -> localhost:8000"
Write-Host "  S3   -> localhost:9000"
Write-Host ""

# Temp files for tunnel output
$webLog  = [System.IO.Path]::GetTempFileName()
$apiLog  = [System.IO.Path]::GetTempFileName()
$s3Log   = [System.IO.Path]::GetTempFileName()

# Start tunnels as background jobs
$webJob  = Start-Job -ScriptBlock { cloudflared tunnel --url http://localhost:3000 2>&1 | Tee-Object -FilePath $using:webLog }
$apiJob  = Start-Job -ScriptBlock { cloudflared tunnel --url http://localhost:8000 2>&1 | Tee-Object -FilePath $using:apiLog }
$s3Job   = Start-Job -ScriptBlock { cloudflared tunnel --url http://localhost:9000 2>&1 | Tee-Object -FilePath $using:s3Log }

function Get-TunnelUrl([string]$LogFile, [int]$TimeoutSeconds = 30) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-Path $LogFile) {
      $content = Get-Content $LogFile -Raw -ErrorAction SilentlyContinue
      if ($content -match '(https://[a-z0-9\-]+\.trycloudflare\.com)') {
        return $Matches[1]
      }
    }
    Start-Sleep -Milliseconds 500
  }
  return $null
}

Write-Host "Waiting for tunnel URLs (up to 30 seconds)..." -ForegroundColor Yellow

$webUrl = Get-TunnelUrl $webLog
$apiUrl = Get-TunnelUrl $apiLog
$s3Url  = Get-TunnelUrl $s3Log

if (-not $webUrl -or -not $apiUrl -or -not $s3Url) {
  Write-Error "Failed to get all tunnel URLs within timeout."
  Write-Host "  Web URL: $webUrl"
  Write-Host "  API URL: $apiUrl"
  Write-Host "  S3  URL: $s3Url"
  Write-Host ""
  Write-Host "Check tunnel logs:"
  Write-Host "  Web: $webLog"
  Write-Host "  API: $apiLog"
  Write-Host "  S3:  $s3Log"
  exit 1
}

Write-Host ""
Write-Host "=== Tunnel URLs ===" -ForegroundColor Green
Write-Host "  Web:  $webUrl" -ForegroundColor Green
Write-Host "  API:  $apiUrl" -ForegroundColor Green
Write-Host "  S3:   $s3Url" -ForegroundColor Green
Write-Host ""

# Update .env with tunnel URLs
$envContent = Get-Content $envFile -Raw

# Replace or add NEXT_PUBLIC_API_BASE_URL
$envContent = $envContent -replace '(?m)^NEXT_PUBLIC_API_BASE_URL=.*$', "NEXT_PUBLIC_API_BASE_URL=$apiUrl"
$envContent = $envContent -replace '(?m)^APP_BASE_URL=.*$', "APP_BASE_URL=$apiUrl"
$envContent = $envContent -replace '(?m)^WEB_BASE_URL=.*$', "WEB_BASE_URL=$webUrl"
$envContent = $envContent -replace '(?m)^S3_PUBLIC_ENDPOINT=.*$', "S3_PUBLIC_ENDPOINT=$s3Url"

# Update CORS_ORIGINS to include the tunnel URL
if ($envContent -match '(?m)^CORS_ORIGINS=') {
  $envContent = $envContent -replace '(?m)^CORS_ORIGINS=.*$', "CORS_ORIGINS=http://localhost:3000,$webUrl"
} else {
  $envContent += "`nCORS_ORIGINS=http://localhost:3000,$webUrl"
}

# Ensure PWA is enabled
$envContent = $envContent -replace '(?m)^NEXT_PUBLIC_ENABLE_PWA=.*$', "NEXT_PUBLIC_ENABLE_PWA=true"

Set-Content -Path $envFile -Value $envContent.TrimEnd() -NoNewline
Write-Host ".env updated with tunnel URLs." -ForegroundColor Cyan

if (-not $SkipRestart) {
  Write-Host ""
  Write-Host "Restarting web and API containers to pick up new env..." -ForegroundColor Yellow
  $baseArgs = @("compose", "-f", $ComposeFile, "--env-file", $envFile)
  & docker @baseArgs up -d --build web api
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Failed to restart containers. You may need to restart manually."
  } else {
    Write-Host "Containers restarted." -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "=== Ready for mobile testing ===" -ForegroundColor Green
Write-Host ""
Write-Host "  Open on your phone:  $webUrl" -ForegroundColor White
Write-Host "  App shell:           $webUrl/app" -ForegroundColor White
Write-Host "  API docs:            $apiUrl/docs" -ForegroundColor White
Write-Host ""
Write-Host "  The PWA install banner will appear at the bottom of the screen." -ForegroundColor White
Write-Host "  Tap 'Install' to add Civic Pulse to your home screen." -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop all tunnels." -ForegroundColor Yellow
Write-Host ""

# Keep script alive and show tunnel status
try {
  while ($true) {
    $webState = (Get-Job -Id $webJob.Id).State
    $apiState = (Get-Job -Id $apiJob.Id).State
    $s3State  = (Get-Job -Id $s3Job.Id).State
    if ($webState -ne "Running" -or $apiState -ne "Running" -or $s3State -ne "Running") {
      Write-Warning "A tunnel has stopped (web=$webState, api=$apiState, s3=$s3State). Exiting."
      break
    }
    Start-Sleep -Seconds 5
  }
} finally {
  Write-Host "Stopping tunnels..."
  Stop-Job $webJob, $apiJob, $s3Job -ErrorAction SilentlyContinue
  Remove-Job $webJob, $apiJob, $s3Job -Force -ErrorAction SilentlyContinue
  Remove-Item $webLog, $apiLog, $s3Log -Force -ErrorAction SilentlyContinue

  # Restore .env to localhost defaults
  $envContent = Get-Content $envFile -Raw
  $envContent = $envContent -replace '(?m)^NEXT_PUBLIC_API_BASE_URL=.*$', "NEXT_PUBLIC_API_BASE_URL=http://localhost:8000"
  $envContent = $envContent -replace '(?m)^APP_BASE_URL=.*$', "APP_BASE_URL=http://localhost:8000"
  $envContent = $envContent -replace '(?m)^WEB_BASE_URL=.*$', "WEB_BASE_URL=http://localhost:3000"
  $envContent = $envContent -replace '(?m)^S3_PUBLIC_ENDPOINT=.*$', "S3_PUBLIC_ENDPOINT=http://localhost:9000"
  if ($envContent -match '(?m)^CORS_ORIGINS=') {
    $envContent = $envContent -replace '(?m)^CORS_ORIGINS=.*$', "CORS_ORIGINS=http://localhost:3000"
  }
  Set-Content -Path $envFile -Value $envContent.TrimEnd() -NoNewline
  Write-Host ".env restored to localhost defaults." -ForegroundColor Cyan
}
