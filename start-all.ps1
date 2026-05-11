# ParkIQ Start All Services (PowerShell)
# Run this from the project root: .\start-all.ps1

function Stop-Port($port) {
    $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($listener in $listeners) {
        Write-Host "Stopping process $($listener.OwningProcess) on port $port" -ForegroundColor Yellow
        Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "  =====================================" -ForegroundColor Cyan
Write-Host "  ParkIQ System Initializer" -ForegroundColor Cyan
Write-Host "  =====================================" -ForegroundColor Cyan
Write-Host "  AI Smart Parking Management System" -ForegroundColor Gray
Write-Host ""

3000,3001,3002,3003,3004,3005,5173 | ForEach-Object { Stop-Port $_ }

Write-Host "Starting services with concurrently..." -ForegroundColor Yellow
Write-Host ""

npx concurrently "npm run dev:gateway" "npm run dev:user" "npm run dev:parking" "npm run dev:booking" "npm run dev:pricing" "npm run dev:payment" "npm run dev:frontend"
