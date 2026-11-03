' Flight Care - EPSON L3250 Invisible Background Guard Launcher
' Runs completely silent in the background with zero terminal or command windows visible.
' Uses native Windows PowerShell (built into all Windows 10/11 PCs), fallback to Python.

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
ps1Script = scriptDir & "\epson_l3250_hardware_guard.ps1"
pyScript = scriptDir & "\epson_l3250_hardware_guard.py"

' Run invisible: WindowStyle = 0 (completely hidden), WaitOnReturn = False
If fso.FileExists(ps1Script) Then
    ' PowerShell 100% native on Windows 10/11 - no install needed
    cmd = "powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File """ & ps1Script & """"
    WshShell.Run cmd, 0, False
ElseIf fso.FileExists(pyScript) Then
    ' Python fallback
    cmd = "python """ & pyScript & """"
    WshShell.Run cmd, 0, False
End If
