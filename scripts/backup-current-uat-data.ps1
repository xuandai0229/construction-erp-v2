<#
.SYNOPSIS
Backup script for Construction ERP V2.
Backs up the PostgreSQL database, the storage folder, and optionally the .env file.
.DESCRIPTION
This script safely copies data into a timestamped backups folder.
It searches for pg_dump.exe in the system PATH or common installation directories.
#>

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$timestamp = Get-Date -Format "yyyy-MM-dd-HHmm"
$backupDir = Join-Path $workspaceRoot "backups\$timestamp"

$logsDir = Join-Path $workspaceRoot "backups\logs"
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
$logFile = Join-Path $logsDir "backup-$(Get-Date -Format 'yyyy-MM-dd').log"
Start-Transcript -Path $logFile -Append

Write-Host "Creating backup directory: $backupDir" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

# 1. Backup .env
$envPath = Join-Path $workspaceRoot ".env"
$copyEnv = $false # By default, avoid copying sensitive data if possible. Change to $true if strictly needed.

Write-Host "WARNING: .env file contains sensitive database credentials!" -ForegroundColor Yellow
if ($copyEnv) {
    if (Test-Path $envPath) {
        Write-Host "Backing up .env file..."
        Copy-Item $envPath -Destination $backupDir
    } else {
        Write-Host ".env file not found." -ForegroundColor Yellow
    }
} else {
    Write-Host "Skipping .env backup for security reasons. Only those with proper authorization should copy .env manually." -ForegroundColor Yellow
}

# 2. Backup Storage Folder
$storagePath = Join-Path $workspaceRoot "storage"
$storageBackupZip = Join-Path $backupDir "storage.zip"

if (Test-Path $storagePath) {
    Write-Host "Compressing storage folder to $storageBackupZip..."
    Compress-Archive -Path "$storagePath\*" -DestinationPath $storageBackupZip -Force
    $zipSize = (Get-Item $storageBackupZip).Length
    Write-Host "-> Storage Backup Size: $zipSize bytes" -ForegroundColor Green
} else {
    Write-Host "Storage folder not found." -ForegroundColor Yellow
}

# 3. Backup PostgreSQL DB
Write-Host "Extracting connection string from .env for DB backup..."
$dbUrl = ""
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    foreach ($line in $envContent) {
        if ($line -match '^DATABASE_URL="(.*)"') {
            $dbUrl = $matches[1]
            break
        }
    }
}

if ($dbUrl -eq "") {
    Write-Host "Could not find DATABASE_URL in .env. FAILED DB BACKUP." -ForegroundColor Red
    exit 1
}

# Strip ?schema= query params which pg_dump doesn't like
if ($dbUrl -match '(.*\?[^&]*)schema=.*') {
    $dbUrl = $dbUrl -replace '\?schema=[^&]*', '' -replace '&schema=[^&]*', ''
}

$dbBackupFile = Join-Path $backupDir "database.sql"

# Find pg_dump
$pgDumpPath = ""
if (Get-Command pg_dump -ErrorAction SilentlyContinue) {
    $pgDumpPath = "pg_dump"
} else {
    $commonPaths = @(
        "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe"
    )
    foreach ($p in $commonPaths) {
        if (Test-Path $p) {
            $pgDumpPath = $p
            break
        }
    }
}

if ($pgDumpPath -eq "") {
    Write-Host "pg_dump.exe NOT FOUND. Cannot backup database." -ForegroundColor Red
    exit 1
}

Write-Host "Using pg_dump at: $pgDumpPath" -ForegroundColor Cyan
Write-Host "Running pg_dump to backup database..."

try {
    # Execute pg_dump
    $processOptions = @{
        FilePath = $pgDumpPath
        ArgumentList = @("--dbname=$dbUrl", "--clean", "--if-exists", "--file=$dbBackupFile")
        NoNewWindow = $true
        Wait = $true
    }
    Start-Process @processOptions

    if (Test-Path $dbBackupFile) {
        $dbSize = (Get-Item $dbBackupFile).Length
        if ($dbSize -gt 0) {
            Write-Host "Database backed up successfully to $dbBackupFile" -ForegroundColor Green
            Write-Host "-> DB Backup Size: $dbSize bytes" -ForegroundColor Green
        } else {
            Write-Host "pg_dump ran but database.sql is empty (size 0)." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "pg_dump ran but backup file was not created." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Failed to run pg_dump: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nBackup Process Completed Successfully!" -ForegroundColor Green
Write-Host "Location: $backupDir"
Write-Host "`nTo Restore:"
Write-Host "1. DB: psql --dbname=`"postgresql://user:pass@host:port/dbname`" -f `"$dbBackupFile`""
Write-Host "2. Storage: Expand-Archive -Path `"$storageBackupZip`" -DestinationPath `"storage`""

Stop-Transcript
