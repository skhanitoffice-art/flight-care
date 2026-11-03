"""
Flight Care - EPSON EcoTank L3250 Local Windows Print Lock Bridge
Connects the Flight Care Web Dashboard to the physical EPSON L3250 printer queue on Windows.
When locked from the website, pauses the print spooler queue for EPSON L3250 Series.
When unlocked by the Manager, resumes the queue for authorized jobs.
"""

import sys
import time
import json
import subprocess
import os

PRINTER_PATTERNS = ["EPSON L3250", "EPSON L3250 Series", "L3250", "EPSON"]
LOCAL_STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "server", "printer", "lock_state.json")
POLL_INTERVAL = 2  # seconds

def get_installed_epson_printers():
    cmd = 'powershell -NoProfile -Command "Get-Printer | Select-Object -ExpandProperty Name"'
    try:
        output = subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.DEVNULL)
        printers = [line.strip() for line in output.splitlines() if line.strip()]
        matches = []
        for p in printers:
            for pattern in PRINTER_PATTERNS:
                if pattern.lower() in p.lower():
                    matches.append(p)
                    break
        return list(set(matches))
    except Exception as e:
        return []

def set_printer_paused(printer_name, paused=True):
    action = "pause" if paused else "resume"
    status_str = "paused" if paused else "resumed"
    # Method 1: printui.dll
    cmd = f'rundll32 printui.dll,PrintUIEntry /Xs /n "{printer_name}" status "{status_str}"'
    try:
        subprocess.run(cmd, shell=True, check=False)
    except Exception:
        pass

    # Method 2: PowerShell Suspend/Resume
    ps_verb = "Suspend-PrintJob" if paused else "Resume-PrintJob"
    ps_cmd = f'powershell -NoProfile -Command "Get-PrintJob -PrinterName \'{printer_name}\' -ErrorAction SilentlyContinue | {ps_verb} -ErrorAction SilentlyContinue"'
    try:
        subprocess.run(ps_cmd, shell=True, check=False)
    except Exception:
        pass

def read_lock_state():
    if os.path.exists(LOCAL_STATE_FILE):
        try:
            with open(LOCAL_STATE_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                locked = data.get('locked', True)
                temp_until = data.get('tempUnlockUntil')
                if not locked and temp_until:
                    if time.time() * 1000 > int(temp_until):
                        locked = True
                return locked, data.get('updatedBy', 'Dashboard')
        except Exception:
            pass
    return True, "Default Safety Lock"

def main():
    print("=" * 65)
    print("  FLIGHT CARE — EPSON EcoTank L3250 SMART PRINT LOCK BRIDGE")
    print("=" * 65)
    print("  HSIA Airport Meet & Greet Front Desk")
    print("  Monitoring website lock status...\n")

    matched_printers = get_installed_epson_printers()
    if matched_printers:
        print(f"  [+] Detected physical Epson printers: {', '.join(matched_printers)}")
    else:
        print("  [i] No active Epson L3250 found on this machine yet.")
        print("      (Bridge will auto-detect as soon as printer is connected via USB/Wi-Fi)")

    last_locked = None

    try:
        while True:
            locked, actor = read_lock_state()
            if locked != last_locked:
                status_label = "🔒 LOCKED (লক করা আছে)" if locked else "🟢 UNLOCKED (আনলক)"
                print(f"[{time.strftime('%H:%M:%S')}] Status: {status_label} | By: {actor}")

                # Update physical spooler if printer detected
                printers = get_installed_epson_printers()
                for p in printers:
                    set_printer_paused(p, paused=locked)
                    print(f"       -> Queue for '{p}' set to: {'PAUSED' if locked else 'RESUMED'}")

                last_locked = locked

            time.sleep(POLL_INTERVAL)
    except KeyboardInterrupt:
        print("\n[!] Bridge stopped by user.")

if __name__ == "__main__":
    main()
