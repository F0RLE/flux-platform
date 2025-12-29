# ==========================================
# Portable Runtime Installer with GUI
# Installs Python, Node.js, Electron, and MinGit
# ==========================================

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Paths
$AppData = "$env:APPDATA\FluxData"
$RuntimeDir = "$AppData\data\runtime"
$LogsDir = "$AppData\data\logs"
$TempDir = "$AppData\data\temp"

# Component directories
$PythonDir = "$RuntimeDir\python"
$NodeDir = "$RuntimeDir\nodejs"
$ElectronDir = "$RuntimeDir\electron"
$GitDir = "$RuntimeDir\git"

# Create directories
@($RuntimeDir, $LogsDir, $TempDir) | ForEach-Object {
    if (-not (Test-Path $_)) {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
    }
}

# Logging
$LogFile = "$LogsDir\setup_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').log"
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    try {
        Add-Content -Path $LogFile -Value $logMessage -Encoding UTF8 -ErrorAction SilentlyContinue
    } catch {
        # Ignore log write errors
    }
    Write-Host $logMessage
}

function Write-Error-Log {
    param([string]$Message, $Exception = $null)
    Write-Log "ERROR: $Message" "ERROR"
    if ($Exception) {
        $errorMsg = if ($Exception -is [Exception]) { $Exception.Message } else { $Exception.ToString() }
        Write-Log "Exception: $errorMsg" "ERROR"
        if ($Exception -is [Exception] -and $Exception.StackTrace) {
            Write-Log "StackTrace: $($Exception.StackTrace)" "ERROR"
        }
    }
    if ($Error.Count -gt 0) {
        $lastError = $Error[0]
        $errorText = if ($lastError.Exception) { $lastError.Exception.Message } else { $lastError.ToString() }
        Write-Log "PS Error: $errorText" "ERROR"
    }
}

# GUI Form
$form = New-Object System.Windows.Forms.Form
$form.Text = "Launcher Setup"
$form.Size = New-Object System.Drawing.Size(600, 450)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.TopMost = $true

# Title Label
$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "Installing Runtime Components"
$titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
$titleLabel.AutoSize = $true
$titleLabel.Location = New-Object System.Drawing.Point(20, 20)
$form.Controls.Add($titleLabel)

# Status Label
$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = "Initializing..."
$statusLabel.AutoSize = $true
$statusLabel.Location = New-Object System.Drawing.Point(20, 60)
$statusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$form.Controls.Add($statusLabel)

# Progress Bar
$progressBar = New-Object System.Windows.Forms.ProgressBar
$progressBar.Location = New-Object System.Drawing.Point(20, 90)
$progressBar.Size = New-Object System.Drawing.Size(550, 25)
$progressBar.Style = "Continuous"
$form.Controls.Add($progressBar)

# Log TextBox
$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Multiline = $true
$logBox.ReadOnly = $true
$logBox.ScrollBars = "Vertical"
$logBox.Location = New-Object System.Drawing.Point(20, 130)
$logBox.Size = New-Object System.Drawing.Size(550, 250)
$logBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$form.Controls.Add($logBox)

# Update GUI function
function Update-GUI {
    param([string]$Status, [int]$Progress = -1)
    if ($Status) {
        $statusLabel.Text = $Status
        $logBox.AppendText("$Status`r`n")
        $logBox.SelectionStart = $logBox.Text.Length
        $logBox.ScrollToCaret()
    }
    if ($Progress -ge 0 -and $Progress -le 100) {
        $progressBar.Value = $Progress
    }
    [System.Windows.Forms.Application]::DoEvents()
}

# Download file with progress
function Download-File {
    param(
        [string[]]$Urls,
        [string]$Destination,
        [string]$Name
    )
    
    $lastError = $null
    foreach ($url in $Urls) {
        try {
            Update-GUI "Downloading $Name from $url..." -1
            
            # Quick availability check
            try {
                $request = [System.Net.HttpWebRequest]::Create($url)
                $request.Method = "HEAD"
                $request.Timeout = 5000
                $request.UserAgent = "Mozilla/5.0"
                $response = $request.GetResponse()
                $response.Close()
            } catch {
                Write-Log "URL not available: $url" "WARN"
                continue
            }
            
            # Download with progress
            $webClient = New-Object System.Net.WebClient
            $webClient.Headers.Add("User-Agent", "Mozilla/5.0")
            
            # Progress event
            $webClient.add_DownloadProgressChanged({
                param($sender, $e)
                $percent = $e.ProgressPercentage
                Update-GUI "Downloading $Name... $percent%" -1
            })
            
            $webClient.DownloadFile($url, $Destination)
            $webClient.Dispose()
            
            # Verify file
            if (Test-Path $Destination) {
                $fileSize = (Get-Item $Destination).Length
                if ($fileSize -gt 0) {
                    $sizeMB = [math]::Round($fileSize/1MB, 2)
                    $sizeText = "$sizeMB MB"
                    Update-GUI "Downloaded $Name : $sizeText" -1
                    Write-Log "Downloaded $Name : $sizeText"
                    return $true
                }
            }
        } catch {
            $lastError = $_.Exception.Message
            Write-Log "Download failed from $url : $lastError" "ERROR"
            if (Test-Path $Destination) {
                Remove-Item $Destination -Force -ErrorAction SilentlyContinue
            }
        }
    }
    
    throw "Failed to download $Name from all sources. Last error: $lastError"
}

# Extract ZIP file
function Expand-Zip {
    param(
        [string]$ZipPath,
        [string]$Destination
    )
    
    Update-GUI "Extracting to $Destination..." -1
    Write-Log "Extracting $ZipPath to $Destination"
    
    if (-not (Test-Path $Destination)) {
        New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    }
    
    try {
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::ExtractToDirectory($ZipPath, $Destination)
        Write-Log "Extraction complete"
        return $true
    } catch {
        Write-Error-Log "Failed to extract ZIP" $_
        return $false
    }
}

# Extract Python from installer using InnoExtract
function Extract-Python-From-Installer {
    param(
        [string]$InstallerPath,
        [string]$ExtractDir
    )
    
    # Download InnoExtract (portable)
    $innoExtractPath = "$TempDir\innoextract.exe"
    $innoExtractUrls = @(
        "https://github.com/dscharrer/innoextract/releases/download/1.11/innoextract-1.11-windows.zip",
        "https://github.com/dscharrer/innoextract/releases/latest/download/innoextract-1.11-windows.zip",
        "https://constexpr.org/innoextract/files/innoextract-1.11-windows.zip"
    )
    
    if (-not (Test-Path $innoExtractPath)) {
        Update-GUI "Downloading InnoExtract..." -1
        Write-Log "Downloading InnoExtract for Python extraction..." "INFO"
        
        $innoZip = "$TempDir\innoextract.zip"
        try {
            Download-File -Urls $innoExtractUrls -Destination $innoZip -Name "InnoExtract"
            
            $innoExtractDir = "$TempDir\innoextract_extract"
            if (Test-Path $innoExtractDir) {
                Remove-Item $innoExtractDir -Recurse -Force -ErrorAction SilentlyContinue
            }
            
            Expand-Zip -ZipPath $innoZip -Destination $innoExtractDir | Out-Null
            
            $innoExe = Get-ChildItem -Path $innoExtractDir -Filter "innoextract.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($innoExe) {
                Copy-Item $innoExe.FullName -Destination $innoExtractPath -Force
                Write-Log "InnoExtract downloaded and extracted" "INFO"
            } else {
                throw "innoextract.exe not found in archive"
            }
        } catch {
            Write-Log "Failed to download InnoExtract: $($_.Exception.Message)" "WARN"
            return $false
        }
    }
    
    if (-not (Test-Path $innoExtractPath)) {
        return $false
    }
    
    # Extract Python installer
    Update-GUI "Extracting Python from installer..." -1
    Write-Log "Extracting Python using InnoExtract..." "INFO"
    
    try {
        $extractResult = & $innoExtractPath -e "$InstallerPath" -d "$ExtractDir" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Python extracted successfully" "INFO"
            return $true
        } else {
            Write-Log "InnoExtract failed with code: $LASTEXITCODE" "ERROR"
            Write-Log "Output: $extractResult" "ERROR"
            return $false
        }
    } catch {
        Write-Log "Failed to extract Python: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Install Python
function Install-Python {
    if (Test-Path "$PythonDir\python.exe") {
        Update-GUI "Python already installed" -1
        Write-Log "Python already installed"
        return $true
    }
    
    Update-GUI "Installing Python 3.14.2 (Full Portable)..." 10
    Write-Log "=== Installing Python (Full Portable Version) ==="
    
    try {
        # Try multiple methods to get full portable Python
        $extractDir = "$TempDir\python_extract"
        if (Test-Path $extractDir) {
            Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue
        }
        New-Item -ItemType Directory -Path $extractDir -Force | Out-Null
        
        $pythonInstalled = $false
        
        # Method 1: Try to extract full Python from installer using InnoExtract
        Update-GUI "Attempting to extract full Python from installer..." 15
        Write-Log "Trying Method 1: Extract full Python from installer..." "INFO"
        
        $installerPath = "$TempDir\python-installer.exe"
        $pythonInstallerUrls = @(
            "https://www.python.org/ftp/python/3.14.2/python-3.14.2-amd64.exe",
            "https://mirrors.tuna.tsinghua.edu.cn/python-release/python-3.14.2/python-3.14.2-amd64.exe",
            "https://mirrors.aliyun.com/python-release/python-3.14.2/python-3.14.2-amd64.exe"
        )
        
        try {
            Download-File -Urls $pythonInstallerUrls -Destination $installerPath -Name "Python Installer" | Out-Null
            if (Extract-Python-From-Installer -InstallerPath $installerPath -ExtractDir $extractDir) {
                Write-Log "Successfully extracted full Python from installer" "INFO"
                $pythonInstalled = $true
            } else {
                Write-Log "Failed to extract Python using InnoExtract, trying 7-Zip..." "WARN"
                
                # Method 2: Try 7-Zip extraction (for NSIS installers)
                $sevenZipPath = "$TempDir\7z.exe"
                if (-not (Test-Path $sevenZipPath)) {
                    $sevenZipUrls = @(
                        "https://www.7-zip.org/a/7z2408-x64.exe",
                        "https://sourceforge.net/projects/sevenzip/files/7-Zip/24.08/7z2408-x64.exe/download"
                    )
                    # Try to download 7-Zip portable
                    $sevenZipInstaller = "$TempDir\7z-installer.exe"
                    try {
                        Download-File -Urls $sevenZipUrls -Destination $sevenZipInstaller -Name "7-Zip" | Out-Null
                        # Extract 7z.exe from installer (it's a self-extracting archive)
                        try {
                            $sevenZipExtract = "$TempDir\7z_extract"
                            New-Item -ItemType Directory -Path $sevenZipExtract -Force | Out-Null
                            Start-Process -FilePath $sevenZipInstaller -ArgumentList "-o`"$sevenZipExtract`" -y" -Wait -NoNewWindow
                            $sevenZipExe = Get-ChildItem -Path $sevenZipExtract -Filter "7z.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
                            if ($sevenZipExe) {
                                Copy-Item $sevenZipExe.FullName $sevenZipPath -Force
                            }
                        } catch {
                            Write-Log "Failed to extract 7-Zip: $($_.Exception.Message)" "WARN"
                        }
                    } catch {
                        Write-Log "Failed to download 7-Zip: $($_.Exception.Message)" "WARN"
                    }
                }
                
                if (Test-Path $sevenZipPath) {
                    Write-Log "Trying to extract Python installer with 7-Zip..." "INFO"
                    $sevenZipExtract = "$TempDir\python_7z_extract"
                    New-Item -ItemType Directory -Path $sevenZipExtract -Force | Out-Null
                    $result = & $sevenZipPath x "`"$installerPath`" -o`"$sevenZipExtract`" -y 2>&1
                    if ($LASTEXITCODE -eq 0) {
                        # Look for Python files in extracted directory
                        $pythonExe = Get-ChildItem -Path $sevenZipExtract -Filter "python.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
                        if ($pythonExe) {
                            Write-Log "Found Python in 7-Zip extraction" "INFO"
                            $extractDir = $pythonExe.Directory.Parent.FullName
                            $pythonInstalled = $true
                        }
                    }
                }
            }
        } catch {
            Write-Log "Failed to download Python installer: $($_.Exception.Message)" "WARN"
        }
        
        # Method 3: Fallback to embeddable Python if full extraction failed
        if (-not $pythonInstalled) {
            Write-Log "Full Python extraction failed, using embeddable Python as fallback..." "WARN"
            Update-GUI "Downloading embeddable Python (fallback)..." 15
            
            $embeddablePath = "$TempDir\python-embeddable.zip"
            $embeddableUrls = @(
                "https://www.python.org/ftp/python/3.14.2/python-3.14.2-embed-amd64.zip",
                "https://mirrors.tuna.tsinghua.edu.cn/python-release/python-3.14.2/python-3.14.2-embed-amd64.zip",
                "https://mirrors.aliyun.com/python-release/python-3.14.2/python-3.14.2-embed-amd64.zip"
            )
            
            if (-not (Download-File -Urls $embeddableUrls -Destination $embeddablePath -Name "Python Embeddable"))) {
                throw "Failed to download embeddable Python"
            }
            
            Update-GUI "Extracting embeddable Python..." 20
            Write-Log "Extracting embeddable Python..." "INFO"
            if (-not (Expand-Zip -ZipPath $embeddablePath -Destination $extractDir)) {
                throw "Failed to extract embeddable Python"
            }
            Write-Log "Embeddable Python extracted successfully" "INFO"
        }
        
        # Find Python files in extracted directory
        Update-GUI "Organizing Python files..." 30
        Write-Log "Searching for Python in extracted files..." "INFO"
        
        $pythonExe = Get-ChildItem -Path $extractDir -Filter "python.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        
        if (-not $pythonExe) {
            # Try to find in app subdirectory (common Inno Setup structure: app/python314/)
            $appDirs = Get-ChildItem -Path $extractDir -Directory -ErrorAction SilentlyContinue
            foreach ($appDir in $appDirs) {
                Write-Log "Checking directory: $($appDir.Name)" "INFO"
                $found = Get-ChildItem -Path $appDir.FullName -Filter "python.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($found) {
                    $pythonExe = $found
                    Write-Log "Found Python in: $($found.DirectoryName)" "INFO"
                    break
                }
            }
        }
        
        if (-not $pythonExe) {
            Write-Log "Python directory structure:" "ERROR"
            Get-ChildItem -Path $extractDir -Recurse -Directory -ErrorAction SilentlyContinue | Select-Object -First 10 | ForEach-Object {
                Write-Log "  - $($_.FullName)" "ERROR"
            }
            throw "python.exe not found in extracted files"
        }
        
        # Determine source Python directory
        # Inno Setup typically extracts to: app/python314/ or app/
        $sourcePythonDir = Split-Path -Parent $pythonExe.FullName
        
        # If python.exe is in a subdirectory like python314/, use that as root
        # Otherwise, use the parent directory
        $pythonDirName = Split-Path -Leaf $sourcePythonDir
        if ($pythonDirName -match "python\d+") {
            # Python is in a versioned subdirectory, use that
            Write-Log "Python found in versioned directory: $pythonDirName" "INFO"
        } else {
            # Python might be directly in app/, check parent
            $parentDir = Split-Path -Parent $sourcePythonDir
            if ($parentDir -and (Test-Path (Join-Path $parentDir "python.exe"))) {
                $sourcePythonDir = $parentDir
                Write-Log "Using parent directory as Python root" "INFO"
            }
        }
        
        if (Test-Path $PythonDir) {
            Remove-Item $PythonDir -Recurse -Force -ErrorAction SilentlyContinue
        }
        
        # Copy Python directory (more reliable than Move-Item for large directories)
        Update-GUI "Copying Python files..." 35
        Write-Log "Copying Python from: $sourcePythonDir to: $PythonDir" "INFO"
        
        # Use robocopy for better performance and reliability
        $robocopyArgs = @(
            "`"$sourcePythonDir`"",
            "`"$PythonDir`"",
            "/E", "/COPYALL", "/R:3", "/W:1", "/NFL", "/NDL", "/NJH", "/NJS"
        )
        $robocopyResult = & robocopy $robocopyArgs 2>&1
        $robocopyExit = $LASTEXITCODE
        
        # Robocopy returns 0-7 for success, 8+ for errors
        if ($robocopyExit -ge 8) {
            Write-Log "Robocopy failed (exit: $robocopyExit), trying Copy-Item..." "WARN"
            # Fallback to Copy-Item with recursion
            try {
                Copy-Item -Path "$sourcePythonDir\*" -Destination $PythonDir -Recurse -Force -ErrorAction Stop
                Write-Log "Python copied successfully using Copy-Item" "INFO"
            } catch {
                Write-Log "Copy-Item failed, trying Move-Item..." "WARN"
                # Last resort: Move-Item
                try {
                    Move-Item -Path $sourcePythonDir -Destination $PythonDir -Force -ErrorAction Stop
                    Write-Log "Python moved successfully using Move-Item" "INFO"
                } catch {
                    Write-Error-Log "Failed to copy/move Python" $_
                    throw "Failed to install Python: $($_.Exception.Message)"
                }
            }
        } else {
            Write-Log "Python copied successfully (robocopy exit: $robocopyExit)" "INFO"
        }
        
        # Verify Python was actually copied
        if (-not (Test-Path "$PythonDir\python.exe")) {
            Write-Log "ERROR: python.exe not found after copy operation" "ERROR"
            Write-Log "Source directory: $sourcePythonDir" "ERROR"
            Write-Log "Destination directory: $PythonDir" "ERROR"
            throw "python.exe not found after installation"
        }
        
        $version = & "$PythonDir\python.exe" --version 2>&1
        
        # Detect if this is full Python or embeddable
        $hasLib = Test-Path "$PythonDir\Lib" -ErrorAction SilentlyContinue
        $hasLibSitePackages = Test-Path "$PythonDir\Lib\site-packages" -ErrorAction SilentlyContinue
        $hasPth = Test-Path "$PythonDir\python._pth" -ErrorAction SilentlyContinue
        $hasScripts = Test-Path "$PythonDir\Scripts" -ErrorAction SilentlyContinue
        
        # Full Python has Lib folder with site-packages, embeddable doesn't
        $isFullPython = $hasLib -and $hasLibSitePackages -and (-not $hasPth)
        
        Write-Log "Python type detection:" "INFO"
        Write-Log "  Has Lib: $hasLib" "INFO"
        Write-Log "  Has Lib\site-packages: $hasLibSitePackages" "INFO"
        Write-Log "  Has python._pth: $hasPth" "INFO"
        Write-Log "  Has Scripts: $hasScripts" "INFO"
        Write-Log "  Is Full Python: $isFullPython" "INFO"
        
        if ($isFullPython) {
            Update-GUI "Python installed: $version (Full Portable)" 40
            Write-Log "Python installed: $version (Full Portable with all libraries and pip)"
            
            # Full Python includes pip - just verify it (no installation needed)
            $pipCheck = & "$PythonDir\python.exe" -m pip --version 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Log "pip is available: $pipCheck" "INFO"
            } else {
                Write-Log "WARNING: pip not accessible in full Python (unusual, but continuing)" "WARN"
                # Don't try to install pip for full Python - it should already be there
                # If it's missing, there's a bigger problem with the installation
            }
        } else {
            # Embeddable Python - needs pip installation and python._pth
            Update-GUI "Python installed: $version (Embeddable)" 40
            Write-Log "Python installed: $version (Embeddable version)"
            
            # Create python._pth for embeddable Python
            $pthFile = "$PythonDir\python._pth"
            if (-not (Test-Path $pthFile)) {
                Write-Log "Creating python._pth for embeddable Python..." "INFO"
                $pthContent = @"
python.exe
pythonw.exe
.
Lib\site-packages
"@
                $pthContent | Set-Content $pthFile -Encoding UTF8
                Write-Log "python._pth created for embeddable Python" "INFO"
            }
            
            # Install pip for embeddable Python
            Update-GUI "Installing pip for embeddable Python..." 35
            Write-Log "Installing pip for embeddable Python..." "INFO"
            $pipScript = "$TempDir\get-pip.py"
            try {
                Invoke-WebRequest -Uri "https://bootstrap.pypa.io/get-pip.py" -OutFile $pipScript -UseBasicParsing
                & "$PythonDir\python.exe" $pipScript --no-warn-script-location 2>&1 | Out-Null
                Start-Sleep -Seconds 3
                $pipCheck = & "$PythonDir\python.exe" -m pip --version 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Log "pip installed and verified: $pipCheck" "INFO"
                } else {
                    Write-Log "pip installation completed but verification failed" "WARN"
                    Write-Log "pip.exe should be available at $PythonDir\Scripts\pip.exe" "INFO"
                }
            } catch {
                Write-Log "Failed to install pip via get-pip.py: $($_.Exception.Message)" "WARN"
            }
        }
        
        return $true
    } catch {
        Write-Error-Log "Failed to install Python" $_
        Update-GUI "ERROR: Failed to install Python. Check logs: $LogFile" -1
        return $false
    }
}

# Install Node.js
function Install-NodeJS {
    if (Test-Path "$NodeDir\node.exe") {
        Update-GUI "Node.js already installed" -1
        Write-Log "Node.js already installed"
        return $true
    }
    
    Update-GUI "Installing Node.js 20.18.0..." 50
    Write-Log "=== Installing Node.js ==="
    
    try {
        $zipPath = "$TempDir\nodejs.zip"
        
        $nodeUrls = @(
            "https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip",
            "https://npmmirror.com/mirrors/node/v20.18.0/node-v20.18.0-win-x64.zip",
            "https://ghproxy.com/https://github.com/nodejs/node/releases/download/v20.18.0/node-v20.18.0-win-x64.zip"
        )
        
        Download-File -Urls $nodeUrls -Destination $zipPath -Name "Node.js"
        
        $extractDir = "$TempDir\nodejs_extract"
        if (Test-Path $extractDir) {
            Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue
        }
        
        if (-not (Expand-Zip -ZipPath $zipPath -Destination $extractDir)) {
            throw "Failed to extract Node.js"
        }
        
        $nodeExe = Get-ChildItem -Path $extractDir -Filter "node.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $nodeExe) {
            throw "node.exe not found in extracted archive"
        }
        
        if (Test-Path $NodeDir) {
            Remove-Item $NodeDir -Recurse -Force -ErrorAction SilentlyContinue
        }
        $sourceDir = Split-Path -Parent $nodeExe.FullName
        Move-Item -Path $sourceDir -Destination $NodeDir -Force
        
        $version = & "$NodeDir\node.exe" --version 2>&1
        Update-GUI "Node.js installed: $version" 70
        Write-Log "Node.js installed: $version"
        
        return $true
    } catch {
        Write-Error-Log "Failed to install Node.js" $_
        Update-GUI "ERROR: Failed to install Node.js. Check logs: $LogFile" -1
        return $false
    }
}

# Install Electron
function Install-Electron {
    if (Test-Path "$ElectronDir\electron.exe") {
        Update-GUI "Electron already installed" -1
        Write-Log "Electron already installed"
        return $true
    }
    
    Update-GUI "Installing Electron 39.2.7..." 75
    Write-Log "=== Installing Electron ==="
    
    try {
        $zipPath = "$TempDir\electron.zip"
        
        $electronUrls = @(
            "https://github.com/electron/electron/releases/download/v39.2.7/electron-v39.2.7-win32-x64.zip",
            "https://ghproxy.com/https://github.com/electron/electron/releases/download/v39.2.7/electron-v39.2.7-win32-x64.zip",
            "https://mirror.ghproxy.com/https://github.com/electron/electron/releases/download/v39.2.7/electron-v39.2.7-win32-x64.zip"
        )
        
        Download-File -Urls $electronUrls -Destination $zipPath -Name "Electron"
        
        if (Test-Path $ElectronDir) {
            Remove-Item $ElectronDir -Recurse -Force -ErrorAction SilentlyContinue
        }
        
        if (-not (Expand-Zip -ZipPath $zipPath -Destination $ElectronDir)) {
            throw "Failed to extract Electron"
        }
        
        if (-not (Test-Path "$ElectronDir\electron.exe")) {
            throw "electron.exe not found after extraction"
        }
        
        Update-GUI "Electron installed successfully" 85
        Write-Log "Electron installation complete"
        
        return $true
    } catch {
        Write-Error-Log "Failed to install Electron" $_
        Update-GUI "ERROR: Failed to install Electron. Check logs: $LogFile" -1
        return $false
    }
}

# Install MinGit
function Install-MinGit {
    if (Test-Path "$GitDir\cmd\git.exe") {
        Update-GUI "MinGit already installed" -1
        Write-Log "MinGit already installed"
        return $true
    }
    
    Update-GUI "Installing MinGit..." 80
    Write-Log "=== Installing MinGit ==="
    
    try {
        $zipPath = "$TempDir\mingit.zip"
        
        # MinGit portable (latest stable)
        $gitUrls = @(
            "https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/MinGit-2.47.1-64-bit.zip",
            "https://ghproxy.com/https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/MinGit-2.47.1-64-bit.zip",
            "https://mirror.ghproxy.com/https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/MinGit-2.47.1-64-bit.zip"
        )
        
        Download-File -Urls $gitUrls -Destination $zipPath -Name "MinGit"
        
        $extractDir = "$TempDir\mingit_extract"
        if (Test-Path $extractDir) {
            Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue
        }
        
        if (-not (Expand-Zip -ZipPath $zipPath -Destination $extractDir)) {
            throw "Failed to extract MinGit"
        }
        
        if (Test-Path $GitDir) {
            Remove-Item $GitDir -Recurse -Force -ErrorAction SilentlyContinue
        }
        
        # MinGit extracts to a subdirectory, find it
        $gitExe = Get-ChildItem -Path $extractDir -Filter "git.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $gitExe) {
            throw "git.exe not found in extracted archive"
        }
        
        $sourceDir = Split-Path -Parent (Split-Path -Parent $gitExe.FullName)
        Move-Item -Path $sourceDir -Destination $GitDir -Force
        
        if (-not (Test-Path "$GitDir\cmd\git.exe")) {
            throw "git.exe not found after installation"
        }
        
        $version = & "$GitDir\cmd\git.exe" --version 2>&1
        Update-GUI "MinGit installed: $version" 90
        Write-Log "MinGit installed: $version"
        
        return $true
    } catch {
        Write-Error-Log "Failed to install MinGit" $_
        Update-GUI "ERROR: Failed to install MinGit. Check logs: $LogFile" -1
        return $false
    }
}

# Check for errors in temp and logs
function Check-Errors {
    $errorsFound = @()
    
    try {
        # Check temp directory for error files
        if (Test-Path $TempDir) {
            try {
                $errorFiles = Get-ChildItem -Path $TempDir -Filter "*error*" -Recurse -ErrorAction SilentlyContinue
                if ($errorFiles) {
                    foreach ($file in $errorFiles) {
                        $errorsFound += "Temp error file: $($file.FullName)"
                    }
                }
            } catch {
                # Ignore temp check errors
            }
        }
        
        # Check logs for errors (skip current log to avoid false positives)
        if (Test-Path $LogsDir) {
            try {
                $allLogFiles = Get-ChildItem -Path $LogsDir -Filter "*.log" -ErrorAction SilentlyContinue
                $logFiles = $allLogFiles | 
                    Where-Object { $_.FullName -ne $LogFile } | 
                    Sort-Object LastWriteTime -Descending | 
                    Select-Object -First 5
                    
                foreach ($logFileItem in $logFiles) {
                    try {
                        $fileContent = $null
                        $fileContent = Get-Content $logFileItem.FullName -ErrorAction SilentlyContinue -Raw
                        if ($fileContent) {
                            if ($fileContent -match "ERROR|Exception|Failed") {
                                $errorsFound += "Errors found in log: $($logFileItem.Name)"
                            }
                        }
                    } catch {
                        # Ignore individual log file read errors
                    }
                }
            } catch {
                # Ignore log check errors
            }
        }
    } catch {
        # Ignore all errors in Check-Errors - it's not critical
    }
    
    return ,$errorsFound
}

# Cleanup temp files
function Cleanup-Temp {
    Update-GUI "Cleaning up temporary files..." 95
    Write-Log "Cleaning up temporary files"
    
    try {
        if (Test-Path $TempDir) {
            # List files before cleanup for debugging
            $tempFiles = Get-ChildItem -Path $TempDir -Recurse -ErrorAction SilentlyContinue
            if ($tempFiles) {
                Write-Log "Cleaning up $($tempFiles.Count) temporary files"
                foreach ($file in $tempFiles) {
                    try {
                        Remove-Item $file.FullName -Force -Recurse -ErrorAction SilentlyContinue
                    } catch {
                        Write-Log "Could not remove: $($file.FullName)" "WARN"
                    }
                }
            }
            Write-Log "Temporary files cleaned up successfully"
        }
    } catch {
        Write-Log "Warning: Could not clean up all temp files: $($_.Exception.Message)" "WARN"
    }
}

# Main installation
Write-Log "=== Starting Portable Runtime Installation ==="
Write-Log "Runtime directory: $RuntimeDir"
Write-Log "Temp directory: $TempDir"
Write-Log "Logs directory: $LogsDir"

# Show form (non-modal, will stay open during installation)
$form.Add_Shown({
    $form.Activate()
    Update-GUI "Initializing..." 0
})

# Show form in background
$null = Register-ObjectEvent -InputObject $form -EventName "Shown" -Action {
    $form.Activate()
}

$form.Show() | Out-Null
[System.Windows.Forms.Application]::DoEvents()
Start-Sleep -Milliseconds 500

try {
    Update-GUI "Starting installation..." 0
    
    # Install components
    $pythonOk = Install-Python
    if (-not $pythonOk) {
        throw "Python installation failed"
    }
    
    $nodeOk = Install-NodeJS
    if (-not $nodeOk) {
        throw "Node.js installation failed"
    }
    
    $electronOk = Install-Electron
    if (-not $electronOk) {
        throw "Electron installation failed"
    }
    
    $gitOk = Install-MinGit
    if (-not $gitOk) {
        Write-Log "MinGit installation failed, but continuing..." "WARN"
    }
    
    # Verify all components
    Update-GUI "Verifying installation..." 95
    Write-Log "=== Verification ==="
    
    $pythonInstalled = Test-Path "$PythonDir\python.exe"
    $nodeInstalled = Test-Path "$NodeDir\node.exe"
    $electronInstalled = Test-Path "$ElectronDir\electron.exe"
    $gitInstalled = Test-Path "$GitDir\cmd\git.exe"
    
    Write-Log "Python: $pythonInstalled"
    Write-Log "Node.js: $nodeInstalled"
    Write-Log "Electron: $electronInstalled"
    Write-Log "MinGit: $gitInstalled"
    
    if ($pythonInstalled -and $nodeInstalled -and $electronInstalled) {
        # Check for errors before cleanup
        try {
            $errors = @()
            try {
                $errors = Check-Errors
            } catch {
                # Ignore Check-Errors errors
            }
            if ($errors -and ($errors | Measure-Object).Count -gt 0) {
                Write-Log "Warnings found during installation:" "WARN"
                foreach ($error in $errors) {
                    Write-Log "  - $error" "WARN"
                }
            }
        } catch {
            # Ignore all error checking errors
        }
        
        # Cleanup temp files only after successful installation
        try {
            Cleanup-Temp
        } catch {
            Write-Log "Warning: Could not clean up temp files: $($_.Exception.Message)" "WARN"
        }
        
        Update-GUI "Installation Complete!" 100
        Write-Log "=== Installation Complete ==="
        
        Start-Sleep -Seconds 2
        try {
            if ($form -and $form.Visible) {
                $form.Close()
            }
            [System.Windows.Forms.Application]::Exit()
        } catch {
            # Ignore form close errors
        }
        exit 0
    } else {
        throw "Installation incomplete. Check logs: $LogFile"
    }
} catch {
    Write-Error-Log "Installation failed" $_
    Update-GUI "ERROR: Installation failed. Check logs: $LogFile" -1
    
    # Check for errors in temp and logs
    try {
        $errors = Check-Errors
        $errorDetails = "Error: $($_.Exception.Message)`n`n"
        if ($errors -and $errors.Count -gt 0) {
            $errorDetails += "Additional issues found:`n"
            foreach ($error in $errors) {
                $errorDetails += "  - $error`n"
            }
            $errorDetails += "`n"
        }
    } catch {
        $errorDetails = "Error: $($_.Exception.Message)`n`n"
    }
    $errorDetails += "Check logs at:`n$LogFile`n`nTemp files (for debugging) at:`n$TempDir"
    
    # Show error dialog
    [System.Windows.Forms.MessageBox]::Show(
        "Installation failed!`n`n$errorDetails",
        "Installation Error",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Error
    )
    
    # Don't cleanup temp on error - keep files for debugging
    Write-Log "Installation failed - temp files kept for debugging" "ERROR"
    
    $form.Close()
    [System.Windows.Forms.Application]::Exit()
    exit 1
}
