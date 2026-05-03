# Wipe ALL reports + related rows (media, events, clusters, assignments,
# resolution proofs, notifications, check-ins) from the deployed API.
#
# Reference data (elected representatives, routing rules, wards,
# jurisdictions) is NOT touched.
#
# DESTRUCTIVE — this cannot be undone. Used for clearing test data
# before launch or during a debugging round.
#
# Usage:
#   .\wipe-reports.ps1 `
#     -ApiBase "https://ente-nadu-production.up.railway.app" `
#     -AdminApiKey "<your admin key>"

param(
  [Parameter(Mandatory=$true)]
  [string]$ApiBase,

  [Parameter(Mandatory=$true)]
  [string]$AdminApiKey,

  [switch]$SkipConfirm
)

if (-not $SkipConfirm) {
  Write-Host ""
  Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
  Write-Host "║              DESTRUCTIVE OPERATION                       ║" -ForegroundColor Yellow
  Write-Host "║  About to delete ALL reports + media + events + clusters ║" -ForegroundColor Yellow
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

$endpoint = "$ApiBase/v1/admin/reports/wipe-all"
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
