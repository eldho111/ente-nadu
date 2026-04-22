# Send a trial civic-report email via the deployed API → SendGrid.
#
# Requires:
#   - SENDGRID_API_KEY set on the API service (Railway)
#   - NOTIFY_FROM_EMAIL set (a verified SendGrid sender)
#   - Admin API key (X-Admin-Api-Key) for the API
#
# Usage:
#   .\send-trial-email.ps1 `
#       -ApiBase "https://ente-nadu-production.up.railway.app" `
#       -AdminApiKey "<your admin key>" `
#       -To "eldhokurian777@gmail.com"
#
# Optional overrides: -Category, -Location, -Note

param(
  [Parameter(Mandatory=$true)]
  [string]$ApiBase,

  [Parameter(Mandatory=$true)]
  [string]$AdminApiKey,

  [Parameter(Mandatory=$true)]
  [string]$To,

  [string]$Category = "pothole",
  [string]$Location = "Kadavanthra, Ernakulam",
  [string]$Note = $null
)

$headers = @{
  "X-Admin-Api-Key" = $AdminApiKey
  "Content-Type"    = "application/json"
}

$payload = @{
  to       = $To
  category = $Category
  location = $Location
}
if ($Note) { $payload.note = $Note }

$endpoint = "$ApiBase/v1/admin/notify/test-email"
$body = $payload | ConvertTo-Json -Depth 4 -Compress

Write-Host "POST $endpoint" -ForegroundColor Cyan
Write-Host "    -> $To" -ForegroundColor Cyan

try {
  $resp = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -Body $body
  Write-Host ""
  Write-Host "✓ Sent: $($resp.sent)" -ForegroundColor Green
  Write-Host "  Subject: $($resp.subject)" -ForegroundColor Green
  Write-Host "  Note:    $($resp.note)" -ForegroundColor Green
  Write-Host ""
  Write-Host "If the inbox stays empty:" -ForegroundColor Yellow
  Write-Host "  1. Check the spam folder." -ForegroundColor Yellow
  Write-Host "  2. Confirm NOTIFY_FROM_EMAIL is a verified SendGrid sender." -ForegroundColor Yellow
  Write-Host "  3. Tail the API logs — SendGrid errors log there." -ForegroundColor Yellow
} catch {
  Write-Host ""
  Write-Host "✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.ErrorDetails) {
    Write-Host "  Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
  }
  exit 1
}
