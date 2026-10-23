[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateSet('Init','Start','Status','Approve','Resume','Revise','Revoke','Recover','Checks','Export')][string]$Action,
    [string]$RunId = 'wallet-001',
    [string]$Revision,
    [string]$Reviewer,
    [string]$Rules,
    [string]$Stories,
    [ValidateSet('HU-01','HU-02','HU-04')][string]$Story,
    [string]$FeedbackFile,
    [switch]$Construction,
    [string]$Gate,
    [switch]$HostRunner
)
$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
$compose = Join-Path $repository 'agents/runner/compose.yaml'
$control = Join-Path $repository '.wallet-control'
$operatorSecret = Join-Path $repository '.wallet-operator'
$output = Join-Path $repository 'agents/runs'
$hostVenv = Join-Path $repository '.wallet-venv'
$hostPython = Join-Path $hostVenv 'Scripts/python.exe'
if ($RunId -notmatch '^[a-zA-Z0-9][a-zA-Z0-9-]{0,63}$') { throw 'RunId invalido' }

function Initialize-HostRunner {
    if (Test-Path $hostPython) { return }
    & py -3.12 -m venv $hostVenv
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el venv: se requiere Python 3.12 (py -3.12)' }
    $pyproject = Join-Path $repository 'agents/runner/pyproject.toml'
    $install = 'import subprocess, sys, tomllib; deps = tomllib.load(open(sys.argv[1], "rb"))["project"]["dependencies"]; sys.exit(subprocess.call([sys.executable, "-m", "pip", "install", "--no-cache-dir", *deps]))'
    & $hostPython -c $install $pyproject
    if ($LASTEXITCODE -ne 0) { throw 'Fallo la instalacion de dependencias del runner' }
    & $hostPython -m copilot download-runtime
    if ($LASTEXITCODE -ne 0) { throw 'Fallo la descarga del runtime de Copilot' }
}

function Invoke-HostRunnerCommand {
    param([string[]]$Arguments)
    Write-Warning 'HostRunner: el runner corre en el host sin aislamiento de contenedor; usa tu sesion de Copilot.'
    Initialize-HostRunner
    $inputs = Join-Path $repository '.wallet-inputs'
    $mapped = @($Arguments | ForEach-Object { if ($_ -like '/inputs/*') { Join-Path $inputs $_.Substring(8) } else { $_ } })
    # The private signing key is deliberately absent: the runner can verify but never sign.
    $common = @('--repository',$repository,'--output',$output,'--control',$control,
        '--signing-key',(Join-Path $hostVenv 'no-signing-key/operator.key'))
    if ($mapped[0] -eq 'start') {
        $mapped += @('--stories',(Join-Path $repository 'docs/requirements/user-stories'),'--policy',(Join-Path $control 'policy.json'))
    }
    $saved = @{}
    $overrides = @{
        PYTHONPATH = (Join-Path $repository 'agents/runner/src')
        CREWAI_DISABLE_TELEMETRY = 'true'; OTEL_SDK_DISABLED = 'true'
        CREWAI_TRACING_ENABLED = 'false'; DO_NOT_TRACK = 'true'
    }
    foreach ($name in $overrides.Keys) { $saved[$name] = [Environment]::GetEnvironmentVariable($name); [Environment]::SetEnvironmentVariable($name,$overrides[$name]) }
    try { & $hostPython -m wallet_agents.main @common @mapped }
    finally { foreach ($name in $saved.Keys) { [Environment]::SetEnvironmentVariable($name,$saved[$name]) } }
}

function Invoke-WalletCommand {
    param([string]$Service, [string[]]$Arguments)
    if ($HostRunner -and $Service -eq 'runner') {
        Invoke-HostRunnerCommand $Arguments
    } else {
        & podman compose --file $compose run --rm $Service @Arguments
    }
    if ($LASTEXITCODE -ne 0) { throw "Fallo el comando del runner ($LASTEXITCODE)" }
}

function Invoke-WalletJson {
    param([string]$Service, [string[]]$Arguments)
    $text = (Invoke-WalletCommand $Service $Arguments | Out-String)
    $start = $text.IndexOf('{')
    $end = $text.LastIndexOf('}')
    if ($start -lt 0 -or $end -lt $start) { throw 'El runner no devolvio JSON valido' }
    return $text.Substring($start, $end - $start + 1) | ConvertFrom-Json
}

function Invoke-ApprovedChecks {
    $request = Invoke-WalletJson 'operator' @('check-request','--run-id',$RunId)
    foreach ($property in $request.checks.PSObject.Properties) {
        $current = Invoke-WalletJson 'operator' @('check-request','--run-id',$RunId)
        if ($current.snapshot -ne $request.snapshot) { throw 'El snapshot cambio durante los checks' }
        $checkId = $property.Name
        if ($checkId -notmatch '^[a-zA-Z0-9-]+$') { throw 'ID de check invalido' }
        $spec = $property.Value
        $source = Join-Path $output "$RunId/workspace"
        if ($spec.target -eq 'definition') { $source = Join-Path $output "$RunId/definition" }
        $logDirectory = Join-Path $control 'logs'
        New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
        $logName = "$RunId-$checkId-$([guid]::NewGuid().ToString('N')).log"
        $logPath = Join-Path $logDirectory $logName
        $seconds = 600
        if ($spec.timeout_seconds) { $seconds = [int]$spec.timeout_seconds }
        if ($seconds -lt 1 -or $seconds -gt 3600) { throw 'Timeout fuera del limite permitido' }
        $command = @($spec.command | ForEach-Object { $_.Replace('{change_id}',[string]$request.change_id) })
        $arguments = @('run','--rm','--pull=never','--network=none','--read-only',
            "--timeout=$seconds",
            '--cap-drop=all','--security-opt=no-new-privileges','--pids-limit=128',
            '--memory=2g','--cpus=2','--user=65532:65532',
            '--tmpfs','/tmp:rw,nosuid,nodev,size=1g,mode=1777',
            '--volume',"${source}:/workspace:ro")
        if ($spec.target -eq 'definition') {
            foreach ($path in @('openspec','architecture','docs/requirements','agents/config','agents/skills','agents/specialists','AGENTS.md')) {
                $hostPath = Join-Path $repository $path
                $containerPath = "/base/$($path.Replace('\\','/'))"
                $arguments += @('--volume',"${hostPath}:${containerPath}:ro")
            }
            $arguments += @('--volume',"${source}:/generated:ro")
        }
        $arguments += @($spec.image) + $command
        $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
        $startInfo.FileName = 'podman'
        $startInfo.UseShellExecute = $false
        $startInfo.RedirectStandardOutput = $true
        $startInfo.RedirectStandardError = $true
        foreach ($argument in $arguments) { [void]$startInfo.ArgumentList.Add([string]$argument) }
        $process = [System.Diagnostics.Process]::new()
        $process.StartInfo = $startInfo
        if (-not $process.Start()) { throw 'No se pudo iniciar el contenedor de checks' }
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        if (-not $process.WaitForExit(($seconds + 15) * 1000)) {
            $process.Kill($true)
            $process.WaitForExit()
            $checkExit = 124
        } else { $checkExit = $process.ExitCode }
        $logText = $stdout.GetAwaiter().GetResult() + [Environment]::NewLine + $stderr.GetAwaiter().GetResult()
        [System.IO.File]::WriteAllText($logPath, $logText, [System.Text.UTF8Encoding]::new($false))
        $process.Dispose()
        Invoke-WalletCommand 'operator' @('record-check','--run-id',$RunId,'--check-id',$checkId,
            '--snapshot',$request.snapshot,'--exit-code',[string]$checkExit,'--log-file',"/control/logs/$logName")
    }
}

function Invoke-WalletRun {
    Invoke-WalletCommand 'runner' @('resume','--run-id',$RunId)
    $state = Invoke-WalletJson 'operator' @('status','--run-id',$RunId)
    while ($state.status -eq 'awaiting_checks') {
        Invoke-ApprovedChecks
        Invoke-WalletCommand 'runner' @('resume','--run-id',$RunId)
        $state = Invoke-WalletJson 'operator' @('status','--run-id',$RunId)
    }
    if ($state.status -eq 'completed' -and -not (Test-Path (Join-Path $output "$RunId/delivery"))) {
        Invoke-WalletCommand 'operator' @('export','--run-id',$RunId)
    }
}

switch ($Action) {
    'Init' {
        foreach ($directory in @($control,$operatorSecret,$output,(Join-Path $repository '.wallet-inputs'))) {
            New-Item -ItemType Directory -Path $directory -Force | Out-Null
        }
        foreach ($subdirectory in @('approvals','evidence')) {
            New-Item -ItemType Directory -Path (Join-Path $control $subdirectory) -Force | Out-Null
        }
        $policy = Join-Path $control 'policy.json'
        if (-not (Test-Path $policy)) {
            Copy-Item (Join-Path $repository 'agents/runner/policy.example.json') $policy
        }
        Invoke-WalletCommand 'operator' @('init-control')
        Write-Host 'Configure .wallet-control/policy.json y sus secretos fuera de Git antes de Start.'
    }
    'Start' {
        $catalog = Invoke-WalletJson 'operator' @('list-stories')
        $catalog.stories | Format-Table story_id,title,criteria,selectable,note -AutoSize | Out-Host
        $available = @($catalog.stories | Where-Object { $_.selectable } | ForEach-Object { $_.story_id })
        if (-not $available) { throw 'La carpeta de HUs no contiene historias seleccionables' }
        if (-not $Stories) { $Stories = Read-Host "HU a trabajar, separadas por coma (disponibles: $($available -join ', '))" }
        $chosen = @($Stories -split ',' | ForEach-Object { $_.Trim().ToUpperInvariant() } | Where-Object { $_ })
        if (-not $chosen -or ($chosen | Where-Object { $_ -notin $available })) { throw "Seleccion invalida; disponibles: $($available -join ', ')" }
        $arguments = @('start','--run-id',$RunId,'--select',($chosen -join ','))
        if ($Rules) { $arguments += @('--rules',$Rules) }
        Invoke-WalletCommand 'runner' $arguments
    }
    'Status' { Invoke-WalletCommand 'operator' @('status','--run-id',$RunId) }
    'Approve' {
        if (-not $Revision -or -not $Reviewer) { throw 'Revise los artefactos y proporcione Revision y Reviewer' }
        Invoke-WalletCommand 'operator' @('approve','--run-id',$RunId,'--revision',$Revision,'--reviewer',$Reviewer)
        Invoke-WalletRun
    }
    'Resume' { Invoke-WalletRun }
    'Revise' {
        if (-not $Story -or -not $FeedbackFile) { throw 'Revise requiere Story y FeedbackFile dentro de .wallet-inputs' }
        $inputRoot = (Resolve-Path (Join-Path $repository '.wallet-inputs')).Path
        $feedbackPath = (Resolve-Path $FeedbackFile).Path
        $prefix = $inputRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
        if (-not $feedbackPath.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)) { throw 'FeedbackFile debe estar dentro de .wallet-inputs' }
        $relative = [System.IO.Path]::GetRelativePath($inputRoot,$feedbackPath).Replace('\','/')
        $arguments = @('revise','--run-id',$RunId,'--story',$Story,'--feedback-file',"/inputs/$relative")
        if ($Construction) { $arguments += '--construction' }
        Invoke-WalletCommand 'operator' $arguments
        Invoke-WalletRun
    }
    'Revoke' {
        $arguments = @('revoke','--run-id',$RunId)
        if ($Gate) { $arguments += @('--gate',$Gate) }
        Invoke-WalletCommand 'operator' $arguments
    }
    'Recover' {
        Invoke-WalletCommand 'operator' @('recover','--run-id',$RunId,'--ack-uncertain-call')
        Invoke-WalletRun
    }
    'Checks' { Invoke-ApprovedChecks }
    'Export' { Invoke-WalletCommand 'operator' @('export','--run-id',$RunId) }
}