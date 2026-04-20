param(
  [string]$ApiBase = "http://localhost:8000",
  [string]$AdminApiKey = ""
)

$rules = Get-Content -Raw -Path "$PSScriptRoot/seed-routing-rules.json" | ConvertFrom-Json
$headers = @{}
if ($AdminApiKey -ne "") {
  $headers["X-Admin-Api-Key"] = $AdminApiKey
}

foreach ($rule in $rules) {
  Invoke-RestMethod -Method Post -Uri "$ApiBase/v1/admin/routing-rules/upsert" -Headers $headers -Body ($rule | ConvertTo-Json -Depth 4) -ContentType "application/json"
}

Write-Host "Seed routing rules complete"
