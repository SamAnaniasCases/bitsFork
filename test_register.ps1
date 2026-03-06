# Step 1: Login
$loginBody = @{ email = "admin@avegabros.com"; password = "admin123" } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResp.token
Write-Host "Token: $token"

# Step 2: Register test employee
$empBody = @{
    firstName = "Test"
    lastName = "SwaggerFix"
    employeeNumber = "EMP-TEST-99"
    email = "test.swaggerfix99@test.com"
    role = "USER"
} | ConvertTo-Json

$headers = @{ Authorization = "Bearer $token" }
$empResp = Invoke-RestMethod -Uri "http://localhost:3001/api/employees" -Method POST -Body $empBody -ContentType "application/json" -Headers $headers
$empResp | ConvertTo-Json -Depth 5
