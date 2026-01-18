@echo off

echo Setting up Typing Book Trainer...

REM Install root dependencies
echo Installing root dependencies...
call npm install

REM Install server dependencies
echo Installing server dependencies...
cd server
call npm install
cd ..

REM Install client dependencies
echo Installing client dependencies...
cd client
call npm install
cd ..

echo.
echo Setup complete!
echo.
echo Next steps:
echo 1. Create server\.env file (see server\env.example.txt)
echo 2. Set up MongoDB (local or Atlas)
echo 3. Run 'npm run dev' from the root directory
echo.

pause

