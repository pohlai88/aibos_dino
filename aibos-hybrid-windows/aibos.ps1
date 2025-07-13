# AIBOS Workspace Manager
# Usage: .\aibos.ps1 [command]

# Navigate to the correct directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Import the wrapper
. "$scriptPath\scripts\powershell-wrapper.ps1"

# Pass all arguments to the wrapper
& "$scriptPath\scripts\powershell-wrapper.ps1" $args 