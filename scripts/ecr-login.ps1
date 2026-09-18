param(
    [string]$Registry = "public.ecr.aws",
    [string]$Region = "us-east-1",
    [Parameter(Mandatory = $true)][string]$ConfigDir
)

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path $ConfigDir | Out-Null

$token = aws ecr-public get-login-password --region $Region
if (-not $token) {
    throw "khong lay duoc token tu ecr-public"
}

$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("AWS:$token"))
$config = '{"auths":{"' + $Registry + '":{"auth":"' + $auth + '"}}}'
Set-Content -Path (Join-Path $ConfigDir "config.json") -Value $config -Encoding ASCII -NoNewline

Write-Output "da ghi credential ECR vao $ConfigDir (token $($token.Length) byte, bo qua credential helper cua Windows)"
