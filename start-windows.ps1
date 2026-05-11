$root = $PSScriptRoot

function Stop-Port($port) {
    $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($listener in $listeners) {
        Write-Host "Stopping process $($listener.OwningProcess) on port $port..."
        Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

@(
    3000, 3001, 3002, 3003, 3004, 3005, 5173
) | ForEach-Object { Stop-Port $_ }

function Start-Service($name, $dir) {
    $fullPath = Join-Path $root $dir
    Write-Host "Starting $name..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd \`"$fullPath\`"; Write-Host $name; npm start" -WindowStyle Normal
    Start-Sleep -Seconds 1
}

Start-Service "API Gateway" "api-gateway"
Start-Service "User Service" "services\user-service"
Start-Service "Parking Service" "services\parking-service"
Start-Service "Booking Service" "services\booking-service"
Start-Service "Pricing Service" "services\pricing-service"
Start-Service "Payment Service" "services\payment-service"

Write-Host "Starting Frontend..."
$frontendPath = Join-Path $root "frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd \`"$frontendPath\`"; Write-Host Frontend; npm run dev" -WindowStyle Normal

Write-Host "All services started."
