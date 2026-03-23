#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Setup Windows Task Scheduler for Supabase Keep-Alive Ping
    
.DESCRIPTION
    Creates a scheduled task to run the Supabase ping script every 6 hours
    to prevent the project from entering deep sleep.
    
.PARAMETER TaskName
    Name of the scheduled task (default: SupabaseKeepAlive)
    
.PARAMETER IntervalHours
    Interval in hours between pings (default: 6)
    
.PARAMETER Remove
    Remove the scheduled task instead of creating it
    
.EXAMPLE
    .\setup-scheduled-task.ps1
    .\setup-scheduled-task.ps1 -IntervalHours 4
    .\setup-scheduled-task.ps1 -Remove
#>

param(
    [string]$TaskName = "SupabaseKeepAlive",
    [int]$IntervalHours = 6,
    [switch]$Remove
)

$ErrorActionPreference = "Stop"

function Write-Success { param([string]$Message) Write-Host $Message -ForegroundColor Green }
function Write-Error { param([string]$Message) Write-Host $Message -ForegroundColor Red }
function Write-Info { param([string]$Message) Write-Host $Message -ForegroundColor Cyan }

# Get script paths
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptPath
$BatchScript = Join-Path $ScriptPath "ping-supabase.bat"

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  Supabase Keep-Alive Task Setup" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Warning "This script requires administrator privileges to create scheduled tasks."
    Write-Host "Please run PowerShell as Administrator and try again."
    Write-Host ""
    Write-Host "Alternatively, you can manually create the task using Task Scheduler:"
    Write-Host "  1. Open Task Scheduler"
    Write-Host "  2. Create Basic Task"
    Write-Host "  3. Name: $TaskName"
    Write-Host "  4. Trigger: Daily, repeat every $IntervalHours hours"
    Write-Host "  5. Action: Start a program"
    Write-Host "  6. Program: $BatchScript"
    Write-Host "  7. Arguments: --no-pause"
    exit 1
}

# Remove task if requested
if ($Remove) {
    Write-Info "Removing scheduled task: $TaskName"
    
    try {
        $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        
        if ($task) {
            Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
            Write-Success "Task '$TaskName' removed successfully!"
        } else {
            Write-Info "Task '$TaskName' does not exist."
        }
    } catch {
        Write-Error "Failed to remove task: $_"
        exit 1
    }
    
    exit 0
}

# Verify batch script exists
if (-not (Test-Path $BatchScript)) {
    Write-Error "Batch script not found at: $BatchScript"
    exit 1
}

Write-Info "Project Root: $ProjectRoot"
Write-Info "Batch Script: $BatchScript"
Write-Info "Task Name: $TaskName"
Write-Info "Ping Interval: Every $IntervalHours hours"
Write-Host ""

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Warning "Task '$TaskName' already exists."
    $response = Read-Host "Do you want to replace it? (Y/N)"
    
    if ($response -ne 'Y' -and $response -ne 'y') {
        Write-Info "Operation cancelled."
        exit 0
    }
    
    Write-Info "Removing existing task..."
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Write-Info "Creating scheduled task..."

try {
    # Create the action
    $action = New-ScheduledTaskAction `
        -Execute "cmd.exe" `
        -Argument "/c `"$BatchScript`" --no-pause" `
        -WorkingDirectory $ProjectRoot
    
    # Create the trigger (repeat every X hours)
    $trigger = New-ScheduledTaskTrigger `
        -Once `
        -At (Get-Date) `
        -RepetitionInterval (New-TimeSpan -Hours $IntervalHours) `
        -RepetitionDuration (New-TimeSpan -Days 9999)
    
    # Create the settings
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RunOnlyIfNetworkAvailable `
        -DontStopOnIdleEnd `
        -RestartCount 3 `
        -RestartInterval (New-TimeSpan -Minutes 5) `
        -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
    
    # Create the principal (run as current user)
    $principal = New-ScheduledTaskPrincipal `
        -UserId $env:USERNAME `
        -LogonType S4U `
        -RunLevel Limited
    
    # Register the task
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description "Keeps Supabase project active by sending periodic ping requests" | Out-Null
    
    Write-Success "Task '$TaskName' created successfully!"
    Write-Host ""
    Write-Info "Task Details:"
    Write-Host "  - Name: $TaskName"
    Write-Host "  - Schedule: Every $IntervalHours hours"
    Write-Host "  - Script: $BatchScript"
    Write-Host "  - User: $env:USERNAME"
    Write-Host ""
    Write-Info "You can view/edit this task in Task Scheduler."
    Write-Host ""
    
    # Offer to run the task now
    $runNow = Read-Host "Do you want to run the ping now to test? (Y/N)"
    
    if ($runNow -eq 'Y' -or $runNow -eq 'y') {
        Write-Host ""
        Write-Info "Running task now..."
        Start-ScheduledTask -TaskName $TaskName
        
        # Wait a moment and check result
        Start-Sleep -Seconds 5
        
        $taskInfo = Get-ScheduledTaskInfo -TaskName $TaskName
        if ($taskInfo.LastTaskResult -eq 0) {
            Write-Success "Task executed successfully!"
        } else {
            Write-Warning "Task completed with code: $($taskInfo.LastTaskResult)"
        }
    }
    
} catch {
    Write-Error "Failed to create task: $_"
    Write-Host ""
    Write-Info "You can manually create the task using Task Scheduler."
    exit 1
}

Write-Host ""
Write-Success "Setup complete! Your Supabase project will be pinged every $IntervalHours hours."