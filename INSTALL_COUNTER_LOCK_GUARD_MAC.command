#!/bin/bash
# ========================================================================
# Flight Care - EPSON EcoTank L3250 Mac Hardware Guard Installer (.command)
# Double-click this file on macOS to install and activate background printer lock.
# ========================================================================

# Change to script directory
cd "$(dirname "$0")" || exit 1
BASE_DIR="$(pwd)"

clear
echo "========================================================================"
echo "  FLIGHT CARE - EPSON EcoTank L3250 MAC HARDWARE GUARD INSTALLER"
echo "  Hazrat Shahjalal International Airport (HSIA), Dhaka, Bangladesh"
echo "  macOS Version (Apple Silicon M1/M2/M3 & Intel)"
echo "========================================================================"
echo ""

GUARD_SCRIPT="$BASE_DIR/scripts/epson_mac_guard.sh"

if [ ! -f "$GUARD_SCRIPT" ]; then
    if [ -f "$BASE_DIR/epson_mac_guard.sh" ]; then
        GUARD_SCRIPT="$BASE_DIR/epson_mac_guard.sh"
    else
        echo "[ERROR] epson_mac_guard.sh not found!"
        echo "Press any key to exit..."
        read -n 1
        exit 1
    fi
fi

chmod +x "$GUARD_SCRIPT"
echo "[OK] Guard script permissions set: $GUARD_SCRIPT"

# Setup macOS LaunchAgent directory
PLIST_DIR="$HOME/Library/LaunchAgents"
mkdir -p "$PLIST_DIR"
PLIST_PATH="$PLIST_DIR/com.flightcare.epsonguard.plist"

# Stop existing agent if running
if launchctl list | grep -q "com.flightcare.epsonguard"; then
    echo "[*] Stopping previous Flight Care Mac Guard..."
    launchctl unload "$PLIST_PATH" 2>/dev/null
fi

echo "[*] Creating macOS LaunchAgent configuration..."

cat <<EOF > "$PLIST_PATH"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.flightcare.epsonguard</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$GUARD_SCRIPT</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/flightcare_epson_guard.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/flightcare_epson_guard.err</string>
</dict>
</plist>
EOF

chmod 644 "$PLIST_PATH"

echo "[*] Loading & Starting background daemon via launchctl..."
launchctl load -w "$PLIST_PATH"

# Check connected printers
echo ""
echo "[*] Checking installed printers on this Mac:"
lpstat -p 2>/dev/null || echo "   (No CUPS printers found yet or CUPS idle)"
echo ""

echo "========================================================================"
echo "  [SUCCESS] EPSON L3250 ম্যাক হার্ডওয়্যার গার্ড সফলভাবে ইনস্টল ও চালু হয়েছে!"
echo "========================================================================"
echo "  ১. ম্যাক রিস্টার্ট দিলেও এটি স্বয়ংক্রিয়ভাবে ব্যাকগ্রাউন্ডে চালু থাকবে।"
echo "  ২. কোনো টার্মিনাল উইন্ডো খোলা থাকবে না (কাউন্টার স্টাফ বন্ধ করতে পারবে না)।"
echo "  ৩. ওয়েবসাইট থেকে ম্যানেজার লক করলে ম্যাকের Preview, Word, Chrome বা"
echo "     Acrobat থেকেও EPSON L3250 প্রিন্টারে কোনো ফাইল প্রিন্ট হবে না।"
echo "  ৪. কেউ প্রিন্ট দেওয়ার চেষ্টা করামাত্র প্রিন্ট কিউ থেকে তা অটো ডিলিট হয়ে যাবে"
echo "     এবং ম্যানেজারের ড্যাশবোর্ডে সাথে সাথে সিকিউরিটি অ্যালার্ট চলে যাবে।"
echo "========================================================================"
echo ""
echo "এই উইন্ডোটি এখন বন্ধ করতে পারেন।"
echo "Press any key to close..."
read -n 1

