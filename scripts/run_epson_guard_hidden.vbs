' Flight Care - Hidden Launcher for EPSON L3250 Hardware Guard
' Runs completely invisible in background without showing any Command Prompt window

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
pythonScript = scriptDir & "\epson_l3250_hardware_guard.py"

' 0 = Hide window completely, False = Do not wait for script to finish
WshShell.Run "python """ & pythonScript & """", 0, False
