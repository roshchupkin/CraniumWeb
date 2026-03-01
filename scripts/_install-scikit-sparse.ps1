# Called by setup-craniumpy-env.ps1 with SUITESPARSE paths
param(
    [Parameter(Mandatory=$true)]
    [string]$SuiteInclude,
    [Parameter(Mandatory=$true)]
    [string]$SuiteLib
)
$env:SUITESPARSE_INCLUDE_DIR = $SuiteInclude
$env:SUITESPARSE_LIBRARY_DIR = $SuiteLib
pip install scikit-sparse
