[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$ProjectRoot = $PSScriptRoot
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
    $ProjectRoot = $PSScriptRoot
}

if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
    $ProjectRoot = (Get-Location).Path
}

$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$ComposeFile = Join-Path $ProjectRoot 'infra\docker-compose.yml'
$BackendPython = Join-Path $ProjectRoot '.venv\Scripts\python.exe'
$FrontendDir = Join-Path $ProjectRoot 'apps\frontend'

if (-not (Test-Path $ComposeFile)) {
    throw "Docker Compose file not found: $ComposeFile"
}

if (-not (Test-Path $BackendPython)) {
    throw "Python virtual environment not found: $BackendPython"
}

if (-not (Test-Path $FrontendDir)) {
    throw "Frontend directory not found: $FrontendDir"
}

function Start-DetachedPowerShell {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory,

        [Parameter(Mandatory = $true)]
        [string]$Command
    )

    if ($PSCmdlet.ShouldProcess($Name, $Command)) {
        Start-Process -FilePath 'powershell.exe' -ArgumentList @(
            '-NoProfile',
            '-ExecutionPolicy', 'Bypass',
            '-NoExit',
            '-Command',
            $Command
        ) -WorkingDirectory $WorkingDirectory
    }
}

if ($PSCmdlet.ShouldProcess('database', "docker compose -f `"$ComposeFile`" up -d")) {
    Push-Location $ProjectRoot
    try {
        docker compose -f $ComposeFile up -d
    }
    finally {
        Pop-Location
    }
}

$BackendCommand = "Set-Location '$ProjectRoot'; `$env:PYTHONUNBUFFERED='1'; & '$BackendPython' -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"
Start-DetachedPowerShell -Name 'backend' -WorkingDirectory $ProjectRoot -Command $BackendCommand

$FrontendCommand = "Set-Location '$FrontendDir'; npm run dev"
Start-DetachedPowerShell -Name 'frontend' -WorkingDirectory $FrontendDir -Command $FrontendCommand

Write-Host ''
Write-Host 'Project web startup triggered.' -ForegroundColor Green
Write-Host 'Frontend: http://localhost:3000'
Write-Host 'Backend API docs: http://localhost:8000/docs'
Write-Host ''
Write-Host 'Jika salah satu jendela tertutup karena error, cek terminal baru yang terbuka.'
