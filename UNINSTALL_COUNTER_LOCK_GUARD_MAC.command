#!/bin/bash
# ========================================================================
# Flight Care - EPSON L3250 Mac Hardware Guard Uninstaller (.command)
# Double-click this file on macOS to stop and remove background printer lock.
# ========================================================================

clear
echo "========================================================================"
echo "  FLIGHT CARE - UNINSTALL EPSON L3250 MAC HARDWARE GUARD"
echo "========================================================================"
echo ""

PLIST_PATH="$HOME/Library/LaunchAgents/com.flightcare.epsonguard.plist"

if [ -f "$PLIST_PATH" ]; then
    echo "[*] Unloading LaunchAgent..."
    launchctl unload "$PLIST_PATH" 2>/dev/null
    rm -f "$PLIST_PATH"
    echo "[OK] LaunchAgent removed."
else
    echo "[*] LaunchAgent was not registered."
fi

# Resume all Epson CUPS printers
echo "[*] Resuming any paused Epson printers..."
printers=$(lpstat -p 2>/dev/null | awk '{print $2}' | grep -iE 'epson|l3250|ecotank')
if [ -n "$printers" ]; then
    for p in $printers; do
        cupsenable "$p" 2>/dev/null
        echo "   -> Resumed: $p"
    done
fi

echo ""
echo "========================================================================"
echo "  [OK] EPSON L3250 Mac Guard has been successfully uninstalled."
echo "========================================================================"
echo ""
echo "Press any key to close..."
read -n 1
