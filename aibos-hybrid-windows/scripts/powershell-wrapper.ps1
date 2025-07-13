# AIBOS PowerShell Wrapper - Handles all syntax issues
# Usage: .\powershell-wrapper.ps1 [command] [args]

param(
    [Parameter(Mandatory=$true)]
    [string]$Command,
    
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Arguments
)

# Set error action to stop on any error
$ErrorActionPreference = "Stop"

# Function to run Deno commands safely
function Invoke-DenoCommand {
    param([string]$DenoCommand, [string[]]$Args)
    
    try {
        $fullCommand = "deno $DenoCommand $Args"
        Write-Host "Executing: $fullCommand" -ForegroundColor Cyan
        Invoke-Expression $fullCommand
    }
    catch {
        Write-Host "Error executing Deno command: $_" -ForegroundColor Red
        exit 1
    }
}

# Function to move files safely
function Move-FileSafely {
    param([string]$Source, [string]$Destination)
    
    try {
        if (Test-Path $Source) {
            if (Test-Path $Destination) {
                Write-Host "Destination exists, removing: $Destination" -ForegroundColor Yellow
                Remove-Item $Destination -Force
            }
            Move-Item $Source $Destination
            Write-Host "Moved: $Source -> $Destination" -ForegroundColor Green
        } else {
            Write-Host "Source not found: $Source" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "Error moving file: $_" -ForegroundColor Red
    }
}

# Function to remove directories safely
function Remove-DirectorySafely {
    param([string]$Path)
    
    try {
        if (Test-Path $Path) {
            Remove-Item $Path -Recurse -Force
            Write-Host "Removed directory: $Path" -ForegroundColor Green
        } else {
            Write-Host "Directory not found: $Path" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "Error removing directory: $_" -ForegroundColor Red
    }
}

# Main command dispatcher
switch ($Command.ToLower()) {
    "dev" {
        Invoke-DenoCommand "run" "--allow-all --watch main.ts"
    }
    
    "build" {
        Invoke-DenoCommand "run" "--allow-all main.ts"
    }
    
    "cleanup" {
        Invoke-DenoCommand "run" "--allow-read --allow-write --allow-run scripts/cleanup-workspace.ts" $Arguments
    }
    
    "validate" {
        Invoke-DenoCommand "run" "--allow-read scripts/validate-ssot.ts"
    }
    
    "setup" {
        Invoke-DenoCommand "run" "--allow-net --allow-read --allow-write --allow-env scripts/setup-supabase.ts"
    }
    
    "clean-legacy" {
        Write-Host "Cleaning legacy files from root..." -ForegroundColor Yellow
        
        # List of legacy files to remove
        $legacyFiles = @(
            "main.ts",
            "config.ts", 
            "index.css",
            "setup-database.ts",
            "os-metadata.json",
            "package.json",
            "package-lock.json",
            "turbo.json",
            "tsconfig.json",
            "deno.json",
            "deno.lock"
        )
        
        # List of legacy directories to remove
        $legacyDirs = @(
            "node_modules"
        )
        
        # Remove legacy files
        foreach ($file in $legacyFiles) {
            if (Test-Path $file) {
                Remove-Item $file -Force
                Write-Host "Removed legacy file: $file" -ForegroundColor Green
            }
        }
        
        # Remove legacy directories
        foreach ($dir in $legacyDirs) {
            Remove-DirectorySafely $dir
        }
        
        # Move documentation files
        $docsToMove = @(
            @{Source="aibos-requirement.md"; Dest="aibos-hybrid-windows\docs\"},
            @{Source="10min-challenge.md"; Dest="aibos-hybrid-windows\docs\"},
            @{Source="ai-agent-preferences-and-requirements.md"; Dest="aibos-hybrid-windows\docs\"}
        )
        
        foreach ($doc in $docsToMove) {
            Move-FileSafely $doc.Source $doc.Dest
        }
        
        Write-Host "Legacy cleanup completed!" -ForegroundColor Green
    }
    
    "status" {
        Write-Host "Current workspace status:" -ForegroundColor Cyan
        Get-ChildItem | Format-Table Name, Length, LastWriteTime
    }
    
    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Write-Host "Available commands: dev, build, cleanup, validate, setup, clean-legacy, status" -ForegroundColor Yellow
        exit 1
    }
} 