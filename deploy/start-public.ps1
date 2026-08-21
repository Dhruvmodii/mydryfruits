# Reminder script: ensure MySQL + app are running, then start Cloudflare tunnel.
# Prerequisites: cloudflared installed at C:\cloudflared\cloudflared.exe
#                config at C:\cloudflared\config.yml
#                npm run build already done once

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "1) Make sure XAMPP MySQL is running."
Write-Host "2) Starting API + Web (npm start) in this window..."
Write-Host "   Open a SECOND PowerShell and run:"
Write-Host '   cd C:\cloudflared'
Write-Host '   .\cloudflared.exe tunnel --config C:\cloudflared\config.yml run'
Write-Host ""

Set-Location $Root
npm start
