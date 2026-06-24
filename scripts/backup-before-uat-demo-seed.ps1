$ErrorActionPreference = 'Stop'

$Timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$BackupDir = "backups\before-uat-demo-seed\$Timestamp"
$LogFile = "$BackupDir\backup-log.txt"

New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

function Log($message) {
    $time = (Get-Date).ToString("HH:mm:ss")
    $logMsg = "[$time] $message"
    Write-Host $logMsg
    Add-Content -Path $LogFile -Value $logMsg
}

Log "Starting backup process..."

# Find pg_dump
$PgDumpPath = ""
$CommonPaths = @(
    "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\13\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\12\bin\pg_dump.exe"
)

foreach ($path in $CommonPaths) {
    if (Test-Path $path) {
        $PgDumpPath = $path
        break
    }
}

# If pg_dump not found in common paths, try from PATH
if (-not $PgDumpPath) {
    $PgDumpPath = (Get-Command pg_dump -ErrorAction SilentlyContinue).Source
}

if (-not $PgDumpPath) {
    Log "ERROR: pg_dump not found. Cannot backup database."
    Exit 1
}

Log "Found pg_dump at $PgDumpPath"

# Read DATABASE_URL from .env
$envContent = Get-Content .env
$dbUrl = ""
foreach ($line in $envContent) {
    if ($line.StartsWith("DATABASE_URL=")) {
        $dbUrl = $line.Substring("DATABASE_URL=".Length).Trim('"', "'")
        break
    }
}

if (-not $dbUrl) {
    Log "ERROR: DATABASE_URL not found in .env"
    Exit 1
}

# Remove query parameters like ?schema=public
if ($dbUrl -match "\?(.*)") {
    $dbUrl = $dbUrl.Substring(0, $dbUrl.IndexOf("?"))
}

# 1. Backup DB
$DbDumpPath = "$BackupDir\database.sql"
Log "Dumping database to $DbDumpPath"
try {
    & $PgDumpPath -d $dbUrl -f $DbDumpPath -F c
    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed with exit code $LASTEXITCODE"
    }
} catch {
    Log "ERROR: Database backup failed. Details: $_"
    Exit 1
}

# 2. Backup Storage
$StoragePath = "storage"
$StorageZipPath = "$BackupDir\storage.zip"
if (Test-Path $StoragePath) {
    Log "Zipping storage folder to $StorageZipPath"
    try {
        Compress-Archive -Path "$StoragePath\*" -DestinationPath $StorageZipPath -Force
    } catch {
        Log "ERROR: Storage backup failed. Details: $_"
        Exit 1
    }
} else {
    Log "Storage folder not found, skipping storage backup."
}

# 3. Create Manifest
Log "Creating manifest..."
$dbSize = 0
if (Test-Path $DbDumpPath) {
    $dbSize = (Get-Item $DbDumpPath).Length
}

$storageSize = 0
if (Test-Path $StorageZipPath) {
    $storageSize = (Get-Item $StorageZipPath).Length
}

$gitStatus = & git status --short

# Mask password in URL: postgresql://USER:PASSWORD@HOST:PORT/DB
$maskedUrl = $dbUrl -replace "(://.*?):(.*?)@", "`$1:***@"

$manifest = @{
    timestamp = $Timestamp
    databaseUrl = $maskedUrl
    databaseSize = $dbSize
    storageSize = $storageSize
    gitStatus = $gitStatus -join "`n"
}

$manifest | ConvertTo-Json | Out-File -FilePath "$BackupDir\backup-manifest.json"

Log "Backup completed successfully!"
Log "Manifest created at $BackupDir\backup-manifest.json"
