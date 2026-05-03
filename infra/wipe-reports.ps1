# Wipe reports + their dependent rows (media, events, clusters,
# assignments, resolution proofs, notifications, check-ins) from the
# deployed API. Reference data (reps, routing rules, wards, jurisdictions)
# is NOT touched.
#
# DESTRUCTIVE — cannot be undone.
#
# Usage:
#   # Wipe the 15 most-recent reports
#   .\wipe-reports.ps1 -ApiBase "https://..." -AdminApiKey "<key>" -Limit 15
#
#   # Wipe ALL reports (full reset)
#   .\wipe-reports.ps1 -ApiBase "https://..." -AdminApiKey "<key>"
#
#   # Skip the confirmation prompt (for scripting)
#   .\wipe-reports.ps1 -ApiBase "..." -AdminApiKey "..." -Limit 5 -SkipConfirm

param(
  [Parameter(Mandatory=$true)]
  [string]$ApiBase,

  [Parameter(Mandatory=$true)]
  [string]$AdminApiKey,

  # Optional: limit the wipe to the N most recent reports.
  # Omit to wipe everything.
  [int]$Limit = 0,

  [switch]$SkipConfirm
)

$endpoint = "$ApiBase/v1/admin/reports/wipe-all"
$scopeText = if ($Limit -gt 0) { "the $Limit most-recent reports" } else { "ALL reports" }

if (-not $SkipConfirm) {
  Write-Host ""
  Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
  Write-Host "║              DESTRUCTIVE OPERATION                       ║" -ForegroundColor Yellow
  Write-Host "║  About to delete $scopeText" -ForegroundColor Yellow
  Write-Host "║  + their media, events, clusters, etc.                   ║" -ForegroundColor Yellow
  Write-Host "║                                                          ║" -ForegroundColor Yellow
  Write-Host "║  Target: $ApiBase" -ForegroundColor Yellow
  Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
  Write-Host ""
  $confirm = Read-Host "Type 'WIPE' to confirm (anything else cancels)"
  if ($confirm -ne "WIPE") {
    Write-Host "Cancelled." -ForegroundColor Cyan
    exit 0
  }
}

if ($Limit -gt 0) {
  $endpoint = "${endpoint}?limit=$Limit"
}

$headers = @{ "X-Admin-Api-Key" = $AdminApiKey }

Write-Host ""
Write-Host "POST $endpoint" -ForegroundColor Cyan

try {
  $resp = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers
  Write-Host ""
  Write-Host "✓ Deleted reports: $($resp.deleted_reports)" -ForegroundColor Green
  Write-Host "  $($resp.note)" -ForegroundColor Green
} catch {
  Write-Host ""
  Write-Host "✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.ErrorDetails) {
    Write-Host "  Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
  }
  exit 1
}
