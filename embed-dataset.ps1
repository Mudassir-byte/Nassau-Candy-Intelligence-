$ErrorActionPreference = "Stop"

$dataDirectory = Join-Path $PSScriptRoot "data"
$csvFiles = @(Get-ChildItem -LiteralPath $dataDirectory -Filter "*.csv" -File)

if ($csvFiles.Count -ne 1) {
    throw "Expected exactly one CSV file in '$dataDirectory'; found $($csvFiles.Count)."
}

$csvText = Get-Content -LiteralPath $csvFiles[0].FullName -Raw
$chunkSize = 12000
$jsonChunks = for ($offset = 0; $offset -lt $csvText.Length; $offset += $chunkSize) {
    $length = [Math]::Min($chunkSize, $csvText.Length - $offset)
    ConvertTo-Json -InputObject $csvText.Substring($offset, $length) -Compress
}

$javascript = "window.NASSAU_CANDY_CSV = [`n$($jsonChunks -join ",`n")`n].join('');`n"
$outputPath = Join-Path $PSScriptRoot "assets\js\embedded-data.js"
[System.IO.File]::WriteAllText($outputPath, $javascript, [System.Text.UTF8Encoding]::new($false))
Write-Host "Embedded '$($csvFiles[0].Name)' in '$outputPath'."