' Flight Care - EPSON L3250 Invisible Background Guard Launcher
' Runs completely silent in the background with zero terminal or command windows visible.
' Uses native Windows PowerShell (built into all Windows 10/11 PCs), fallback to Python.

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Check if in root or scripts directory
If fso.FileExists(scriptDir & "\epson_l3250_hardware_guard.ps1") Then
    ps1Script = scriptDir & "\epson_l3250_hardware_guard.ps1"
ElseIf fso.FileExists(scriptDir & "\scripts\epson_l3250_hardware_guard.ps1") Then
    ps1Script = scriptDir & "\scripts\epson_l3250_hardware_guard.ps1"
End If

If fso.FileExists(scriptDir & "\epson_l3250_hardware_guard.py") Then
    pyScript = scriptDir & "\epson_l3250_hardware_guard.py"
ElseIf fso.FileExists(scriptDir & "\scripts\epson_l3250_hardware_guard.py") Then
    pyScript = scriptDir & "\scripts\epson_l3250_hardware_guard.py"
End If

' Run invisible: WindowStyle = 0 (completely hidden), WaitOnReturn = False
If Not IsEmpty(ps1Script) Then
    cmd = "powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File """ & ps1Script & """"
    WshShell.Run cmd, 0, False
ElseIf Not IsEmpty(pyScript) Then
    cmd = "python """ & pyScript & """"
    WshShell.Run cmd, 0, False
End If

