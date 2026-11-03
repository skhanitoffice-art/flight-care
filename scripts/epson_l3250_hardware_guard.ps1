# ========================================================================
# Flight Care - EPSON EcoTank L3250 Tamper-Proof Windows Hardware Guard (Native PowerShell)
# Runs as an invisible background daemon on the Counter PC (Windows 10/11 native, no Python needed)
# Enforces the Manager's Cloud Lock command from the website dashboard.
# ========================================================================

$ErrorActionPreference = "SilentlyContinue"
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 -bor [System.Net.SecurityProtocolType]::Tls13

$PRINTER_PATTERNS = @("EPSON L3250", "EPSON L3250 Series", "L3250", "EPSON EcoTank", "EPSON")
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$LOCAL_STATE_FILE = Join-Path $SCRIPT_DIR "..\server\printer\lock_state.json"

$CLOUD_URLS = @(
    "https://flightcaresbd.com/api/printer/epson_lock.php",
    "https://www.flightcaresbd.com/api/printer/epson_lock.php",
    "http://localhost:8081/api/printer/epson_lock.php"
)

function Get-EpsonPrinters {
    try {
        $printers = Get-Printer -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name
        $matched = @()
        foreach ($p in $printers) {
            foreach ($pat in $PRINTER_PATTERNS) {
                if ($p -like "*$pat*") {
                    $matched += $p
                    break
                }
            }
        }
        return ($matched | Select-Object -Unique)
    } catch {
        return @()
    }
}

function Set-PrinterStatus {
    param (
        [string]$PrinterName,
        [bool]$Paused
    )
    $statusStr = if ($Paused) { "paused" } else { "resumed" }
    
    # Method 1: PrintUIEntry native DLL
    try {
        Start-Process rundll32.exe -ArgumentList "printui.dll,PrintUIEntry /Xs /n `"$PrinterName`" status `"$statusStr`"" -WindowStyle Hidden -Wait
    } catch {}

    # Method 2: PowerShell Job Control
    try {
        if ($Paused) {
            Get-PrintJob -PrinterName $PrinterName -ErrorAction SilentlyContinue | Suspend-PrintJob -ErrorAction SilentlyContinue
        } else {
            Get-PrintJob -PrinterName $PrinterName -ErrorAction SilentlyContinue | Resume-PrintJob -ErrorAction SilentlyContinue
        }
    } catch {}
}

function Report-ViolationToCloud {
    param (
        [string]$DocName,
        [string]$UserName,
        [string]$PrinterName
    )
    $payload = @{
        security_alert = @{
            type = "UNAUTHORIZED_PRINT_ATTEMPT_BLOCKED"
            document = $DocName
            user = $UserName
            printer = $PrinterName
            timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        }
    } | ConvertTo-Json -Compress

    foreach ($url in $CLOUD_URLS) {
        try {
            Invoke-RestMethod -Uri $url -Method Post -Body $payload -ContentType "application/json" -TimeoutSec 3 -ErrorAction SilentlyContinue
            break
        } catch {}
    }
}

function Purge-UnauthorizedJobs {
    param (
        [string]$PrinterName
    )
    try {
        $jobs = Get-PrintJob -PrinterName $PrinterName -ErrorAction SilentlyContinue
        if ($jobs) {
            foreach ($job in $jobs) {
                $doc = if ($job.DocumentName) { $job.DocumentName } else { "Document" }
                $usr = if ($job.UserName) { $job.UserName } else { "Staff" }
                $jobId = $job.Id
                
                # Delete immediately
                Remove-PrintJob -PrinterName $PrinterName -ID $jobId -ErrorAction SilentlyContinue
                
                # Report security violation to Cloud Dashboard
                Report-ViolationToCloud -DocName $doc -UserName $usr -PrinterName $PrinterName
            }
        }
    } catch {}
}

function Get-LockState {
    # 1. Try Cloud REST API
    foreach ($url in $CLOUD_URLS) {
        try {
            $resp = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 3 -ErrorAction SilentlyContinue
            if ($resp -and $resp.ok -and $resp.state) {
                $st = $resp.state
                $isLocked = [bool]$st.locked
                $tempUntil = $st.temp_unlock_until
                
                # Check temp unlock
                if ($tempUntil) {
                    $nowTs = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
                    if ([double]$tempUntil -gt $nowTs) {
                        return @{ Locked = $false; Reason = "Temp Unlocked ($([math]::Round([double]$tempUntil - $nowTs))s left)" }
                    }
                }
                return @{ Locked = $isLocked; Reason = "Cloud State" }
            }
        } catch {}
    }

    # 2. Try Local File fallback
    if (Test-Path $LOCAL_STATE_FILE) {
        try {
            $raw = Get-Content -Raw $LOCAL_STATE_FILE -ErrorAction SilentlyContinue | ConvertFrom-Json
            if ($raw -and $raw.ok -and $raw.state) {
                return @{ Locked = [bool]$raw.state.locked; Reason = "Local File" }
            }
        } catch {}
    }

    # Fail-safe default: Locked
    return @{ Locked = $true; Reason = "Default Fail-Safe Lock" }
}

# Daemon Loop
$lastState = $null
while ($true) {
    try {
        $state = Get-LockState
        $printers = Get-EpsonPrinters

        if ($printers -and $printers.Count -gt 0) {
            foreach ($p in $printers) {
                if ($state.Locked) {
                    # Enforce Lock
                    Set-PrinterStatus -PrinterName $p -Paused $true
                    Purge-UnauthorizedJobs -PrinterName $p
                } else {
                    # Allow Print
                    Set-PrinterStatus -PrinterName $p -Paused $false
                }
            }
        }
    } catch {}

    Start-Sleep -Milliseconds 1500
}

