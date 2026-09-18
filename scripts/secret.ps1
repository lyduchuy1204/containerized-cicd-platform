param(
    [Parameter(Mandatory = $true)][string]$Namespace,
    [string]$SecretName = "product-media-db",
    [string]$User = "mediauser",
    [string]$Database = "mediadb"
)

$ErrorActionPreference = "Continue"

kubectl get namespace $Namespace 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    kubectl create namespace $Namespace 2>&1 | Out-Null
    Write-Output "da tao namespace $Namespace"
}

kubectl -n $Namespace get secret $SecretName 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Output "$SecretName da ton tai trong $Namespace, khong ghi de"
    exit 0
}

$bytes = New-Object byte[] 24
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$password = ([Convert]::ToBase64String($bytes) -replace '[^A-Za-z0-9]', '')

kubectl -n $Namespace create secret generic $SecretName `
    --from-literal=POSTGRES_USER=$User `
    --from-literal=POSTGRES_DB=$Database `
    --from-literal=POSTGRES_PASSWORD=$password `
    --from-literal=DATABASE_URL="postgresql://${User}:${password}@postgres:5432/${Database}" 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Output "tao $SecretName trong $Namespace THAT BAI"
    exit 1
}

Write-Output "da tao $SecretName trong $Namespace"
Write-Output "luu y: PostgreSQL khoi tao data directory bang mat khau cua lan start dau tien."
Write-Output "doi Secret ma khong xoa PVC se lam api fail readiness voi loi xac thuc."
