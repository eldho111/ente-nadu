# Seeds elected representatives (MPs, MLAs, corporation councillors) into the
# running API via the /v1/admin/elected-representatives/import endpoint.
#
# Usage:
#   .\seed-kerala-representatives.ps1 -ApiBase "https://api.ente-nadu.in" -AdminApiKey "xxx"
#
# To seed only one tier, use -Files:
#   .\seed-kerala-representatives.ps1 -Files @("seed-kerala-corporation-councillors.json") -AdminApiKey "xxx"
#
# The importer is idempotent: re-running updates existing records by
# (name, role, constituency_name) instead of creating duplicates.

param(
  [string]$ApiBase = "http://localhost:8000",
  [string]$AdminApiKey = "",
  [string[]]$Files = @(
    "seed-kerala-mps.json",
    "seed-kerala-mlas.json",
    "seed-kerala-corporation-councillors.json"
  ),
  [int]$BatchSize = 100
)

if ($AdminApiKey -eq "") {
  Write-Error "AdminApiKey is required. Pass with -AdminApiKey."
  exit 1
}

$headers = @{
  "X-Admin-Api-Key" = $AdminApiKey
  "Content-Type"    = "application/json"
}

$endpoint = "$ApiBase/v1/admin/elected-representatives/import"
$grandTotal = @{ imported = 0; updated = 0; wardLinks = 0 }

foreach ($file in $Files) {
  $path = Join-Path $PSScriptRoot $file
  if (-not (Test-Path $path)) {
    Write-Warning "Skipping missing file: $path"
    continue
  }

  $raw = Get-Content -Raw -Path $path -Encoding UTF8
  $records = $raw | ConvertFrom-Json
  Write-Host ""
  Write-Host "=== $file ($($records.Count) records) ===" -ForegroundColor Cyan

  # Send in batches to keep payloads small and give useful per-batch feedback.
  for ($i = 0; $i -lt $records.Count; $i += $BatchSize) {
    $end = [Math]::Min($i + $BatchSize, $records.Count) - 1
    $batch = $records[$i..$end]
    $body = @{ representatives = $batch } | ConvertTo-Json -Depth 6 -Compress

    try {
      $resp = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -Body $body
      $grandTotal.imported += $resp.imported
      $grandTotal.updated  += $resp.updated
      $grandTotal.wardLinks += $resp.ward_links_created
      Write-Host ("  batch {0,3}-{1,-3} -> imported:{2,3}  updated:{3,3}" -f ($i+1), ($end+1), $resp.imported, $resp.updated)
    } catch {
      Write-Warning "  batch $($i+1)-$($end+1) FAILED: $($_.Exception.Message)"
    }
  }
}

Write-Host ""
Write-Host "=== TOTAL ===" -ForegroundColor Green
Write-Host ("imported:    {0}" -f $grandTotal.imported)
Write-Host ("updated:     {0}" -f $grandTotal.updated)
Write-Host ("ward links:  {0}" -f $grandTotal.wardLinks)
