@echo off
setlocal enabledelayedexpansion

REM Navigate to Resume_Website and build Angular app
cd /d "%~dp0Resume_Website"
ng build --configuration production
if errorlevel 1 (
    echo Angular build failed. Exiting.
    exit /b 1
)

REM Go back to root folder
cd /d "%~dp0"

REM Remove everything inside static
if exist static (
    del /q /s static\*
    for /d %%p in (static\*) do rmdir "%%p" /s /q
) else (
    mkdir static
)

REM Copy Angular build output into static
xcopy /e /i /y "Resume_Website\dist\Resume_Website\browser" "static\"

REM Build Go application
go build main.go
if errorlevel 1 (
    echo Go build failed. Exiting.
    exit /b 1
)

echo Build complete.
endlocal
