:loop
node index.js
if errorlevel 1 (
	if not errorlevel 3 (
		GOTO END;
	))
goto loop
:END
pause
