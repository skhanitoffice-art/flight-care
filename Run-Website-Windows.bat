@echo off
title Flight Care Website Runner
cls
echo ========================================================
echo        Flight Care - VIP Airport Protocol Platform
echo                Starting Local Website Server...
echo ========================================================
echo.

cd /d "%~dp0"

echo Opening website in your default browser...
start http://localhost:5000

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    if exist "dist\index.html" (
        node -e "const http=require('http'),fs=require('fs'),path=require('path');http.createServer((q,s)=>{let p=q.url.split('?')[0];if(p==='/')p='/index.html';let f=path.join('dist',p);if(fs.existsSync(f)&&fs.statSync(f).isFile()){let e=path.extname(f);let m='text/html';if(e==='.js'||e==='.mjs')m='application/javascript';if(e==='.css')m='text/css';if(e==='.webp')m='image/webp';if(e==='.png')m='image/png';if(e==='.ico')m='image/x-icon';if(e==='.json')m='application/json';s.writeHead(200,{'Content-Type':m});s.end(fs.readFileSync(f))}else{s.writeHead(200,{'Content-Type':'text/html'});s.end(fs.readFileSync('dist/index.html'))}}).listen(5000,()=>console.log('Website running at http://localhost:5000\nPress Ctrl+C to stop.'));"
    ) else (
        node -e "const http=require('http'),fs=require('fs'),path=require('path');http.createServer((q,s)=>{let p=q.url.split('?')[0];if(p==='/')p='/index.html';let f=path.join('.',p);if(fs.existsSync(f)&&fs.statSync(f).isFile()){let e=path.extname(f);let m='text/html';if(e==='.js'||e==='.mjs')m='application/javascript';if(e==='.css')m='text/css';if(e==='.webp')m='image/webp';if(e==='.png')m='image/png';if(e==='.ico')m='image/x-icon';if(e==='.json')m='application/json';s.writeHead(200,{'Content-Type':m});s.end(fs.readFileSync(f))}else{s.writeHead(200,{'Content-Type':'text/html'});s.end(fs.readFileSync('index.html'))}}).listen(5000,()=>console.log('Website running at http://localhost:5000\nPress Ctrl+C to stop.'));"
    )
) else (
    where python >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        if exist "dist\index.html" (
            cd dist
        )
        python -m http.server 5000
    ) else (
        if exist "dist\index.html" (
            start dist\index.html
        ) else (
            start index.html
        )
    )
)

pause
