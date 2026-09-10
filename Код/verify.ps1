Write-Host "Папка:" (Get-Location)
$files = @("index.html","src\buildInfo.ts","src\skillTreeData.ts")
foreach ($f in $files) {
  if (Test-Path $f) { Write-Host "OK $f" -ForegroundColor Green }
  else { Write-Host "НЕТ $f" -ForegroundColor Red }
}
Select-String -Path index.html -Pattern "teomor-build-banner" -Quiet
if ($?) { Write-Host "OK зелёная полоска в index.html" -ForegroundColor Green }
else { Write-Host "FAIL: обнови index.html из репо" -ForegroundColor Red }
