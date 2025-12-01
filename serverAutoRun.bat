@echo off
chcp 65001 >nul
title Short Real Server (Auto Start)

set "PROJECT_PATH=C:\Users\Jaeho\Desktop\Projects\Playground\short_real"
set "DOCKER_EXE=C:\Program Files\Docker\Docker\Docker Desktop.exe"

:: ========================================================
:: [추가된 부분] Windows Terminal(WT)로 자동 전환 로직
:: ========================================================
:: 현재 세션이 WT인지 확인합니다.
if defined WT_SESSION goto :MainLogic

:: WT가 아니라면, WT를 켜고 이 파일(%~f0)을 다시 실행시킨 뒤 현재 창은 닫습니다.
echo [INFO] Windows Terminal로 전환합니다...
wt.exe new-tab -p "Command Prompt" -d "%PROJECT_PATH%" cmd /k "%~f0"
exit

:MainLogic
:: ========================================================
:: [기존 로직] Docker 체크 및 서버 실행
:: ========================================================

echo ========================================================
echo [Short Real] Docker 상태 확인 중...
echo ========================================================

:: 1. Docker 실행 여부 확인
docker info >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Docker가 이미 실행 중입니다.
    goto StartServer
)

:: 2. Docker가 꺼져 있다면 실행
echo [INFO] Docker Desktop이 꺼져 있습니다. 실행합니다...
if exist "%DOCKER_EXE%" (
    start "" "%DOCKER_EXE%"
) else (
    echo [ERROR] Docker 실행 파일을 찾을 수 없습니다!
    echo 경로를 확인해주세요: %DOCKER_EXE%
    pause
    exit
)

:: 3. Docker가 켜질 때까지 대기 (루프)
echo [WAIT] Docker 엔진이 켜지는 것을 기다리는 중... (최대 60초)
echo (이 과정은 PC 성능에 따라 시간이 조금 걸립니다)

set /a retries=0

:CheckLoop
timeout /t 2 /nobreak >nul
docker info >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Docker가 준비되었습니다!
    goto StartServer
)

set /a retries+=1
:: 30번 반복(약 60초)해도 안 켜지면 에러 처리
if %retries% geq 30 (
    echo.
    echo [ERROR] Docker 실행 대기 시간 초과.
    echo Docker Desktop을 직접 확인해주세요.
    pause
    exit
)
goto CheckLoop

:StartServer
echo ========================================================
echo [Short Real] 서버를 시작합니다...
echo 경로: %PROJECT_PATH%
echo ========================================================

cd /d "%PROJECT_PATH%"
docker-compose up

pause