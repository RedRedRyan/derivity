param(
    [string]$Branch = "main",
    [string]$StartCommand = "npm run start",
    [int]$StartupTimeoutSeconds = 90,
    [int]$StabilitySeconds = 10,
    [string]$Remote = "origin",
    [switch]$StopServerAfterPush
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "[dev-commit-push] $Message"
}

function Stop-DevServer {
    param([System.Diagnostics.Process]$Process)

    if ($Process -and -not $Process.HasExited) {
        Write-Step "Stopping development server (PID $($Process.Id))."
        try {
            $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$($Process.Id)" -ErrorAction SilentlyContinue
            foreach ($child in $children) {
                Stop-Process -Id $child.ProcessId -Force -ErrorAction SilentlyContinue
            }
            $Process.Kill($true)
        } catch {
            Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
        }
    }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

if (-not (Test-Path "package.json")) {
    throw "package.json was not found. Run this script from inside the repository."
}

git rev-parse --is-inside-work-tree *> $null
if ($LASTEXITCODE -ne 0) {
    throw "This directory is not a Git repository."
}

$currentBranch = (git branch --show-current).Trim()
if ($currentBranch -ne $Branch) {
    Write-Step "Checking out $Branch from $currentBranch."
    git checkout $Branch
    if ($LASTEXITCODE -ne 0) {
        throw "Could not check out $Branch."
    }
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logPath = Join-Path $repoRoot "dev-server-$timestamp.log"

Write-Step "Starting development server: $StartCommand"
Write-Step "Server log: $logPath"

$processInfo = [System.Diagnostics.ProcessStartInfo]::new()
$processInfo.FileName = "powershell.exe"
$processInfo.Arguments = '-NoProfile -ExecutionPolicy Bypass -Command "' + $StartCommand + ' 2>&1"'
$processInfo.WorkingDirectory = $repoRoot
$processInfo.RedirectStandardOutput = $true
$processInfo.RedirectStandardError = $true
$processInfo.UseShellExecute = $false
$processInfo.CreateNoWindow = $true

$serverProcess = [System.Diagnostics.Process]::new()
$serverProcess.StartInfo = $processInfo

$outputBuffer = [System.Collections.Concurrent.ConcurrentQueue[string]]::new()
$logWriter = [System.IO.StreamWriter]::new($logPath, $false)
$logWriter.AutoFlush = $true

$outputHandler = [System.Diagnostics.DataReceivedEventHandler]{
    param($sender, $eventArgs)
    if ($eventArgs.Data) {
        $outputBuffer.Enqueue($eventArgs.Data)
        $logWriter.WriteLine($eventArgs.Data)
        Write-Host $eventArgs.Data
    }
}

$serverProcess.add_OutputDataReceived($outputHandler)
$serverProcess.add_ErrorDataReceived($outputHandler)

try {
    [void]$serverProcess.Start()
    $serverProcess.BeginOutputReadLine()
    $serverProcess.BeginErrorReadLine()

    $started = $false
    $failed = $false
    $detectedUrl = $null
    $deadline = (Get-Date).AddSeconds($StartupTimeoutSeconds)
    $readyPatterns = @(
        "ready",
        "compiled successfully",
        "Local:",
        "localhost:",
        "https?://(localhost|127\.0\.0\.1|\[::1\])"
    )
    $errorPatterns = @(
        "\berror\b",
        "failed",
        "EADDRINUSE",
        "Unhandled",
        "Cannot find module",
        "Build errors"
    )

    Write-Step "Waiting up to $StartupTimeoutSeconds seconds for startup."
    while ((Get-Date) -lt $deadline) {
        if ($serverProcess.HasExited) {
            $failed = $true
            break
        }

        $line = $null
        while ($outputBuffer.TryDequeue([ref]$line)) {
            if (-not $detectedUrl -and $line -match "(https?://(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?)") {
                $detectedUrl = $Matches[1]
            }

            if ($readyPatterns | Where-Object { $line -match $_ }) {
                $started = $true
            }

            if ($errorPatterns | Where-Object { $line -match $_ }) {
                $failed = $true
            }
        }

        if ($started -or $failed) {
            break
        }

        Start-Sleep -Milliseconds 500
    }

    if (-not $started -or $failed) {
        throw "Development server did not start cleanly. Review $logPath."
    }

    $serverLocation = if ($detectedUrl) { " at $detectedUrl" } else { "" }
    Write-Step "Development server started successfully$serverLocation."
    Write-Step "Watching for $StabilitySeconds more seconds for early errors."
    Start-Sleep -Seconds $StabilitySeconds

    if ($serverProcess.HasExited) {
        throw "Development server exited during the stability window. Review $logPath."
    }

    $remainingLine = $null
    while ($outputBuffer.TryDequeue([ref]$remainingLine)) {
        if ($errorPatterns | Where-Object { $remainingLine -match $_ }) {
            throw "Development server reported an error after startup. Review $logPath."
        }
    }

    Write-Step "Server is running without startup errors. Staging changes."
    git add -A
    if ($LASTEXITCODE -ne 0) {
        throw "git add failed."
    }

    $pendingChanges = git diff --cached --name-only
    if (-not $pendingChanges) {
        Write-Step "No staged changes found. Nothing to commit or push."
        exit 0
    }

    $commitMessage = "chore: automated update $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))"
    Write-Step "Committing: $commitMessage"
    git commit -m $commitMessage
    if ($LASTEXITCODE -ne 0) {
        throw "git commit failed."
    }

    Write-Step "Pushing to $Remote/$Branch."
    git push $Remote $Branch
    if ($LASTEXITCODE -ne 0) {
        throw "git push failed."
    }

    Write-Step "Push completed successfully."
} finally {
    if ($StopServerAfterPush) {
        Stop-DevServer -Process $serverProcess
    } elseif ($serverProcess -and -not $serverProcess.HasExited) {
        Write-Step "Development server remains running (PID $($serverProcess.Id)). Use -StopServerAfterPush to stop it automatically."
    }

    if ($logWriter) {
        $logWriter.Dispose()
    }
}
