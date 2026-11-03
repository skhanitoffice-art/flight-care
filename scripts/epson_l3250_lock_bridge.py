"""
Flight Care - EPSON EcoTank L3250 Local Windows Print Lock Bridge
Connects the Flight Care Web Cloud Dashboard (https://flightcaresbd.com)
to the physical EPSON L3250 printer queue on Windows.
When locked from the website, pauses the physical print spooler queue for EPSON L3250 Series.
When unlocked by the Manager, resumes the queue for authorized jobs.
"""

import sys
import time
import json
import subprocess
import os
import urllib.request
import urllib.error

PRINTER_PATTERNS = ["EPSON L3250", "EPSON L3250 Series", "L3250", "EPSON EcoTank", "EPSON"]
LOCAL_STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "server", "printer", "lock_state.json")
CLOUD_URLS = [
    "https://flightcaresbd.com/api/printer/epson_lock.php",
    "https://www.flightcaresbd.com/api/printer/epson_lock.php",
    "http://localhost:8081/api/printer/epson_lock.php"
]
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
    except Exception:
        return []

def set_printer_paused(printer_name, paused=True):
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

def fetch_lock_state_from_cloud():
    for url in CLOUD_URLS:
        try:
            req = urllib.request.Request(
                url,
                headers={'User-Agent': 'FlightCare-EpsonBridge/2.0', 'Accept': 'application/json'}
            )
            with urllib.request.urlopen(req, timeout=3) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode('utf-8'))
                    if data.get('ok') and 'state' in data:
                        st = data['state']
                        return st.get('locked', True), st.get('updatedBy', 'Cloud Dashboard'), url
        except Exception:
            continue
    return None, None, None

def read_lock_state():
    # 1. Try Cloud
    cloud_locked, actor, url = fetch_lock_state_from_cloud()
    if cloud_locked is not None:
        return cloud_locked, f"{actor} ({url})"

    # 2. Fallback to Local file
    if os.path.exists(LOCAL_STATE_FILE):
        try:
            with open(LOCAL_STATE_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                locked = data.get('locked', True)
                temp_until = data.get('tempUnlockUntil')
                if not locked and temp_until:
                    if time.time() * 1000 > int(temp_until):
                        locked = True
                return locked, f"{data.get('updatedBy', 'Dashboard')} (Local)"
        except Exception:
            pass

    return True, "Default Safety Lock (Offline)"

def main():
    print("=" * 70)
    print("  FLIGHT CARE — EPSON EcoTank L3250 CLOUD SMART PRINT LOCK BRIDGE")
    print("=" * 70)
    print("  Hazrat Shahjalal International Airport (HSIA), Dhaka, Bangladesh")
    print("  Counter Protocol & Concierge Desk\n")
    print("  [+] Syncing with Flight Care Cloud API: https://flightcaresbd.com")

    matched_printers = get_installed_epson_printers()
    if matched_printers:
        print(f"  [+] Physical EPSON printers detected: {', '.join(matched_printers)}")
    else:
        print("  [i] No physical Epson L3250 found on this machine right now.")
        print("      (Bridge is armed; it will auto-lock the printer as soon as connected)")

    print("-" * 70)
    print("  Active Protection Armed. Press Ctrl+C to stop.\n")

    last_locked = None

    try:
        while True:
            locked, actor = read_lock_state()
            if locked != last_locked:
                status_label = "🔒 LOCKED (ওয়েবসাইট থেকে লক করা)" if locked else "🟢 UNLOCKED (অনুমোদিত / সক্রিয়)"
                print(f"[{time.strftime('%H:%M:%S')}] Status: {status_label}")
                print(f"       -> Source: {actor}")

                # Update physical spooler if printer detected
                printers = get_installed_epson_printers()
                for p in printers:
                    set_printer_paused(p, paused=locked)
                    print(f"       -> Windows Spooler Queue for '{p}': {'PAUSED (লক)' if locked else 'RESUMED (চালু)'}")

                last_locked = locked

            time.sleep(POLL_INTERVAL)
    except KeyboardInterrupt:
        print("\n[!] Bridge stopped by user.")

if __name__ == "__main__":
    main()
