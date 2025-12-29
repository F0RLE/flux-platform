' ==========================================
' Flux Platform Launcher
' Launches launch.bat without console window
' ==========================================

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get script directory
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
launchBat = scriptDir & "\launch.bat"

' Check if launch.bat exists
If Not fso.FileExists(launchBat) Then
    MsgBox "Error: launch.bat not found at " & launchBat, vbCritical, "Launch Error"
    WScript.Quit
End If

' Run launch.bat in hidden window (0 = hidden, no console)
' Use cmd.exe /c to run batch file and hide console
WshShell.CurrentDirectory = scriptDir
WshShell.Run "cmd.exe /c """ & launchBat & """", 0, False

Set WshShell = Nothing
Set fso = Nothing
