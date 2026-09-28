@echo off
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
