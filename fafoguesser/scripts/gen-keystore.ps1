# Generates the release signing keystore (release.keystore) and
# keystore.properties. Both files are gitignored — never commit them, never
# share them, and never lose them: they are required to publish updates of
# the same app. Run once per machine.
param(
    [string]$StorePass = ("Fafo" + [guid]::NewGuid().ToString("N").Substring(0, 16))
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot  # scripts/ -> fafoguesser/
$keystore = Join-Path $root "release.keystore"
$props = Join-Path $root "keystore.properties"
if (Test-Path $keystore) {
    Write-Host "Keystore already exists: $keystore (skipping)"
    exit 0
}
$keytool = Join-Path $env:JAVA_HOME "bin\keytool.exe"
if (!(Test-Path $keytool)) { $keytool = "keytool" }
# PKCS12 (the default store type) shares one password for store + key.
& $keytool -genkeypair -v -keystore $keystore -storepass $StorePass -alias fafo -keypass $StorePass -keyalg RSA -keysize 2048 -validity 10950 -dname "CN=FafoGuesser, OU=Dev, O=Fafo, L=Internet, ST=Internet, C=US" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "keytool failed" }
@"
storeFile=release.keystore
storePassword=$StorePass
keyAlias=fafo
keyPassword=$StorePass
"@ | Set-Content -Path $props -Encoding ascii
Write-Host "Keystore + properties written (both gitignored)."