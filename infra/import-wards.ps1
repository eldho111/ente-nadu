param(
  [string]$ApiBase = "http://localhost:8000",
  [string]$GeoJsonPath = "$PSScriptRoot/sample-wards.geojson",
  [string]$AdminApiKey = ""
)

$payload = Get-Content -Raw -Path $GeoJsonPath | ConvertFrom-Json
$body = @{ features_geojson = $payload } | ConvertTo-Json -Depth 25
$headers = @{}
if ($AdminApiKey -ne "") {
  $headers["X-Admin-Api-Key"] = $AdminApiKey
}

Invoke-RestMethod -Method Post -Uri "$ApiBase/v1/admin/wards/import" -Headers $headers -Body $body -ContentType "application/json"
Write-Host "Ward import completed"
