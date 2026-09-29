@echo off
if not defined FESTPASS_ORGANIZER_REGISTRATION_CODE (
    echo Organizer registration is disabled until an enrollment code is configured.
    echo In PowerShell, set $env:FESTPASS_ORGANIZER_REGISTRATION_CODE to a private code, then run this script again.
    exit /b 1
)
echo Building the FestPass Project...
call mvn clean install
if %errorlevel% neq 0 (
    echo Maven build failed.
    pause
    exit /b %errorlevel%
)
echo Starting the Spring Boot Application...
call mvn spring-boot:run
pause
