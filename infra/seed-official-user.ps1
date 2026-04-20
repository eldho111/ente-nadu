param(
  [Parameter(Mandatory = $true)][string]$FirebaseUid,
  [string]$Role = "dept_manager",
  [string]$DepartmentName = "BBMP Operations",
  [string]$DisplayName = "Ops Manager",
  [string]$Email = "",
  [string]$ApiBase = "http://localhost:8000",
  [string]$AdminApiKey = ""
)

$headers = @{}
if ($AdminApiKey -ne "") {
  $headers["X-Admin-Api-Key"] = $AdminApiKey
}

$body = @{
  firebase_uid    = $FirebaseUid
  role            = $Role
  department_name = $DepartmentName
  display_name    = $DisplayName
  email           = if ($Email -ne "") { $Email } else { $null }
  active          = $true
} | ConvertTo-Json -Depth 4

Invoke-RestMethod -Method Post -Uri "$ApiBase/v1/admin/official-users/upsert" -Headers $headers -Body $body -ContentType "application/json"
Write-Host "Official user upserted"
