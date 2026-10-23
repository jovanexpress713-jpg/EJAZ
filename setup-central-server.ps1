$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "=== VICTORIA Logistics ERP - Local Central Server Setup ===" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js LTS is missing. Install Node.js LTS, restart PowerShell, then run this script again."
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm is missing. Reinstall Node.js LTS and ensure npm is on PATH."
}

if (-not (Test-Path ".env")) {
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  function New-Secret([int]$Bytes = 48) {
    $buffer = New-Object byte[] $Bytes
    $rng.GetBytes($buffer)
    return ([Convert]::ToHexString($buffer)).ToLowerInvariant()
  }
  $jwt = New-Secret 48
  $setup = New-Secret 48
  @(
    "NODE_ENV=production"
    "HOST=0.0.0.0"
    "PORT=3000"
    "JWT_SECRET=$jwt"
    "OWNER_SETUP_KEY=$setup"
  ) | Set-Content -Path ".env" -Encoding ascii
  Write-Host "Created .env with random secrets." -ForegroundColor Green
  Write-Host "One-time owner setup key (save it securely and enter it on the first phone):" -ForegroundColor Yellow
  Write-Host $setup -ForegroundColor Yellow
  Write-Host "Do not share this key publicly. It is stored in the server .env file." -ForegroundColor Yellow
} else {
  Write-Host ".env already exists; it was not overwritten." -ForegroundColor Yellow
}

Write-Host "Installing project dependencies..." -ForegroundColor Cyan
npm ci
if ($LASTEXITCODE -ne 0) { throw "npm ci failed." }

Write-Host "Building web client served by the local central server..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "npm run build failed." }

try {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  $isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if ($isAdmin) {
    netsh advfirewall firewall add rule name="VICTORIA EJAZ Central Server TCP 3000" dir=in action=allow protocol=TCP localport=3000 remoteip=LocalSubnet | Out-Null
    Write-Host "Windows Firewall rule added for local subnet only." -ForegroundColor Green
  } else {
    Write-Host "Run PowerShell as Administrator to add the local-only firewall rule automatically." -ForegroundColor Yellow
  }
} catch {
  Write-Host "Firewall rule was not added automatically. See CENTRAL-SERVER-SETUP.md." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Setup complete. Start the server with: npm start" -ForegroundColor Green
Write-Host "Keep this computer powered on and connect all phones to the same Wi-Fi/LAN."
