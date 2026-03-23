#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Supabase Keep-Alive Ping Script
    
.DESCRIPTION
    Sends a lightweight ping to your Supabase project to prevent deep sleep.
    This PowerShell wrapper provides better Windows integration and logging.
    
.PARAMETER Verbose
    Show detailed output
    
.EXAMPLE
    .\ping-supabase.ps1
    .\ping-supabase.ps1 -Verbose
#>

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptPath

# Logging function
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    switch ($Level) {
        "SUCCESS" { Write-Host $logMessage -ForegroundColor Green }
        "ERROR"   { Write-Host $logMessage -ForegroundColor Red }
        "WARNING" { Write-Host $logMessage -ForegroundColor Yellow }
        default   { 
            if ($Verbose) {
                Write-Host $logMessage -ForegroundColor Cyan
            }
        }
    }
    
    # Also write to log file
    $logFile = Join-Path $ProjectRoot "logs\supabase-ping.log"
    $logDir = Split-Path -Parent $logFile
    
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    
    Add-Content -Path $logFile -Value $logMessage
}

try {
    Write-Log "Starting Supabase keep-alive ping..." "INFO"
    Write-Log "Project Root: $ProjectRoot" "INFO"
    
    # Check if Node.js is available
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Node.js is not installed or not in PATH"
    }
    Write-Log "Node.js version: $nodeVersion" "INFO"
    
    # Check if script exists
    $scriptPath = Join-Path $ProjectRoot "scripts\ping-supabase.js"
    if (-not (Test-Path $scriptPath)) {
        throw "Ping script not found at: $scriptPath"
    }
    
    # Run the ping script
    Write-Log "Executing ping script..." "INFO"
    
    $output = node $scriptPath 2>&1
    $exitCode = $LASTEXITCODE
    
    if ($Verbose -or $exitCode -ne 0) {
        $output | ForEach-Object { Write-Log $_ "INFO" }
    }
    
    if ($exitCode -eq 0) {
        Write-Log "Ping completed successfully!" "SUCCESS"
        exit 0
    } else {
        Write-Log "Ping failed with exit code: $exitCode" "ERROR"
        exit 1
    }
    
} catch {
    Write-Log "Error: $_" "ERROR"
    Write-Log "Stack Trace: $($_.ScriptStackTrace)" "ERROR"
    exit 1
}