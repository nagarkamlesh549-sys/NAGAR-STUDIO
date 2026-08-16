$portsToTry = @(5000, 8090, 9000, 8085, 3000, 8001)
$listener = New-Object System.Net.HttpListener
$started = $false
$activePort = 0

foreach ($p in $portsToTry) {
    $prefix = "http://localhost:$p/"
    $listener.Prefixes.Clear()
    $listener.Prefixes.Add($prefix)
    try {
        $listener.Start()
        $started = $true
        $activePort = $p
        Write-Host "SUCCESS: Server running at $prefix"
        break
    } catch {
        Write-Host "Port $p busy, trying next..."
    }
}

if (-not $started) {
    Write-Error "Could not bind to any port."
    exit 1
}

$rootDir = (Get-Item -Path ".").FullName

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = [System.Uri]::UnescapeDataString($request.Url.LocalPath)
        if ($urlPath -eq "/") {
            $urlPath = "/index.html"
        }

        $localPath = Join-Path $rootDir $urlPath.TrimStart('/')

        if (Test-Path $localPath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            $ext = [System.IO.Path]::GetExtension($localPath).ToLower()

            switch ($ext) {
                ".html" { $contentType = "text/html; charset=utf-8" }
                ".css"  { $contentType = "text/css; charset=utf-8" }
                ".js"   { $contentType = "text/javascript; charset=utf-8" }
                ".jpg"  { $contentType = "image/jpeg" }
                ".jpeg" { $contentType = "image/jpeg" }
                ".png"  { $contentType = "image/png" }
                ".json" { $contentType = "application/json" }
                default { $contentType = "application/octet-stream" }
            }

            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $buffer = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        $response.Close()
    } catch {
        # continue loop on client connection abort
    }
}
