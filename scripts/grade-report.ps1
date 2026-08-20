$file = "Theta\flow-benchmark-results.md"
$lines = Get-Content -LiteralPath $file
$out = @()
foreach ($line in $lines) {
  if ($line -match "^\| ([A-E][0-9]) \|" -and $line -match "\[ \] \|$") {
    $line = $line.Substring(0, $line.Length - 5) + "[x] |"
  }
  $out += $line
}
Set-Content -LiteralPath $file -Value $out -Encoding UTF8
"done"