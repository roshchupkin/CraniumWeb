# CraniumPy Conda Environment Setup for CraniumWeb
# Run from CraniumWeb project root: .\scripts\setup-craniumpy-env.ps1
# Prerequisites: Anaconda or Miniconda (https://docs.conda.io/en/latest/miniconda.html)

$ErrorActionPreference = "Stop"
$ProjectRoot = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { Get-Location }
$CraniumPyDir = Join-Path $ProjectRoot "CraniumPy"

Write-Host "=== CraniumPy Environment Setup ===" -ForegroundColor Cyan
Write-Host "Project root: $ProjectRoot"
Write-Host ""

# Find conda
$condaExe = $null
foreach ($p in @(
    "conda",
    "$env:USERPROFILE\miniconda3\Scripts\conda.exe",
    "$env:USERPROFILE\anaconda3\Scripts\conda.exe",
    "C:\ProgramData\miniconda3\Scripts\conda.exe",
    "C:\ProgramData\anaconda3\Scripts\conda.exe"
)) {
    if ($p -eq "conda") {
        if (Get-Command conda -ErrorAction SilentlyContinue) { $condaExe = "conda"; break }
    } elseif (Test-Path $p) {
        $condaExe = $p
        break
    }
}

if (-not $condaExe) {
    Write-Host "ERROR: Conda not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "CraniumPy needs conda for scikit-sparse (NICP). Install Miniconda:" -ForegroundColor Yellow
    Write-Host "  https://docs.conda.io/en/latest/miniconda.html" -ForegroundColor Gray
    Write-Host "  Download Miniconda3 Windows 64-bit, install, restart terminal, retry." -ForegroundColor Gray
    exit 1
}

Write-Host "Found conda: $condaExe" -ForegroundColor Green

# Accept conda channel Terms of Service (required for non-interactive use)
Write-Host ""
Write-Host "Accepting conda channel Terms of Service..." -ForegroundColor Cyan
& $condaExe tos accept --override-channels --channel https://repo.anaconda.com/pkgs/main 2>$null
& $condaExe tos accept --override-channels --channel https://repo.anaconda.com/pkgs/r 2>$null
& $condaExe tos accept --override-channels --channel https://repo.anaconda.com/pkgs/msys2 2>$null

# Create env if missing
$envList = & $condaExe env list 2>$null
if ($envList -notmatch "CraniumPy\s") {
    Write-Host ""
    Write-Host "Creating CraniumPy environment (Python 3.8)..." -ForegroundColor Cyan
    & $condaExe create -n CraniumPy python=3.8 -y
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
    Write-Host "CraniumPy environment exists." -ForegroundColor Green
}

# Conda base for SuiteSparse paths
$condaBase = & $condaExe info --base 2>$null
if (-not $condaBase) { $condaBase = $env:CONDA_PREFIX -replace "\\envs\\CraniumPy$", "" }
if (-not $condaBase) { $condaBase = "$env:USERPROFILE\miniconda3" }
$suiteInclude = Join-Path $condaBase "envs\CraniumPy\Library\include\suitesparse"
$suiteLib = Join-Path $condaBase "envs\CraniumPy\Library\lib"

Write-Host ""
Write-Host "Step 1/4: conda-forge (cython, suitesparse, numpy, scipy)..." -ForegroundColor Cyan
& $condaExe run -n CraniumPy conda install -c conda-forge cython suitesparse numpy scipy -y
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Step 2/4: CraniumPy pip requirements..." -ForegroundColor Cyan
# Mayavi needs numpy installed before its build; scikit-sparse needs SuiteSparse paths
$env:SUITESPARSE_INCLUDE_DIR = $suiteInclude
$env:SUITESPARSE_LIBRARY_DIR = $suiteLib
& $condaExe run -n CraniumPy pip install numpy
& $condaExe run -n CraniumPy pip install -r (Join-Path $CraniumPyDir "requirements.txt")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Step 3/4: scikit-sparse (NICP)..." -ForegroundColor Cyan
$helperScript = Join-Path $ProjectRoot "scripts\_install-scikit-sparse.ps1"
& $condaExe run -n CraniumPy powershell -NoProfile -File $helperScript -SuiteInclude $suiteInclude -SuiteLib $suiteLib
if ($LASTEXITCODE -ne 0) {
    Write-Host "scikit-sparse failed. You may need Microsoft C++ Build Tools." -ForegroundColor Yellow
    Write-Host "  https://visualstudio.microsoft.com/visual-cpp-build-tools/" -ForegroundColor Gray
    Write-Host "  Workload: Desktop development with C++" -ForegroundColor Gray
    Write-Host "  Then set SUITESPARSE_* and: pip install scikit-sparse" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Step 4/4: CraniumWeb backend (fastapi, uvicorn)..." -ForegroundColor Cyan
& $condaExe run -n CraniumPy pip install fastapi "uvicorn[standard]" python-multipart
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Verifying..." -ForegroundColor Cyan
& $condaExe run -n CraniumPy python -c "from sksparse.cholmod import cholesky; print('scikit-sparse OK')" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "scikit-sparse OK" -ForegroundColor Green
} else {
    Write-Host "scikit-sparse not verified (NICP may not work)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Setup complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "To run CraniumWeb:" -ForegroundColor Yellow
Write-Host "  1. conda activate CraniumPy" -ForegroundColor White
Write-Host "  2. cd backend" -ForegroundColor White
Write-Host "  3. uvicorn main:app --reload --host 0.0.0.0" -ForegroundColor White
Write-Host ""
Write-Host "In another terminal: cd frontend && npm install && npm run dev" -ForegroundColor White
