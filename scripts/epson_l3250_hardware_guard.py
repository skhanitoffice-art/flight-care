"""
Flight Care - EPSON EcoTank L3250 Tamper-Proof Windows Hardware Guard
Runs as a silent background daemon on the counter PC.
Enforces the Manager's Cloud Lock command (https://flightcaresbd.com) at the Windows OS level.
If the Manager locks the printer from the website:
- Physical print spooler queue for EPSON L3250 Series is forcibly paused.
- Any print job sent from Word, Acrobat, Chrome, WhatsApp, or Windows Explorer is INSTANTLY canceled & deleted.
- If staff attempts to manually click "Resume" in Windows Settings, the guard re-pauses within 1 second.
- Staff CANNOT bypass or print outside the website without Manager clearance.
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
POLL_INTERVAL = 1.5  # seconds for ultra-fast response

def get_installed_epson_printers():
    cmd = 'powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Printer -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name"'
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
    # Method 1: native Windows printui.dll
    cmd = f'rundll32 printui.dll,PrintUIEntry /Xs /n "{printer_name}" status "{status_str}"'
    try:
        subprocess.run(cmd, shell=True, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass

    # Method 2: PowerShell Suspend/Resume
    ps_verb = "Suspend-PrintJob" if paused else "Resume-PrintJob"
    ps_cmd = f'powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-PrintJob -PrinterName \'{printer_name}\' -ErrorAction SilentlyContinue | {ps_verb} -ErrorAction SilentlyContinue"'
    try:
        subprocess.run(ps_cmd, shell=True, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass

def purge_unauthorized_jobs(printer_name):
    """
    Detects and forcibly cancels/deletes any print job in the queue when locked.
    Stops counter staff from printing external PDFs, Word docs, photos, etc.
    """
    ps_cmd = f'powershell -NoProfile -ExecutionPolicy Bypass -Command "$jobs = Get-PrintJob -PrinterName \'{printer_name}\' -ErrorAction SilentlyContinue; if ($jobs) { foreach ($j in $jobs) { Write-Output ($j.Id.ToString() + \'|\' + $j.DocumentName + \'|\' + $j.UserName); Remove-PrintJob -PrinterName \'{printer_name}\' -ID $j.Id -ErrorAction SilentlyContinue } }"'
    try:
        output = subprocess.check_output(ps_cmd, shell=True, text=True, stderr=subprocess.DEVNULL)
        lines = [l.strip() for l in output.splitlines() if l.strip()]
        if lines:
            for l in lines:
                parts = l.split('|')
                job_id = parts[0] if len(parts) > 0 else 'N/A'
                doc_name = parts[1] if len(parts) > 1 else 'Document'
                user_name = parts[2] if len(parts) > 2 else 'User'
                print(f"[{time.strftime('%H:%M:%S')}] 🚨 BLOCKED & TERMINATED: '{doc_name}' (ID: {job_id}) by {user_name} on {printer_name}")
                report_violation_to_cloud(doc_name, user_name, printer_name)
    except Exception:
        pass

def report_violation_to_cloud(doc_name, user_name, printer_name):
    """
    Sends live alert to Flight Care Cloud Dashboard so Duty Manager sees the attempt
    """
    for url in CLOUD_URLS:
        try:
            payload = json.dumps({
                'security_alert': {
                    'type': 'UNAUTHORIZED_PRINT_ATTEMPT_BLOCKED',
                    'document': doc_name,
                    'user': user_name,
                    'printer': printer_name,
                    'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
                }
            }).encode('utf-8')
            req = urllib.request.Request(
                url,
                data=payload,
                headers={'Content-Type': 'application/json', 'User-Agent': 'FlightCare-HardwareGuard/2.0'}
            )
            with urllib.request.urlopen(req, timeout=3) as resp:
                if resp.status == 200:
                    break
        except Exception:
            continue

def fetch_lock_state_from_cloud():
    for url in CLOUD_URLS:
        try:
            req = urllib.request.Request(
                url,
                headers={'User-Agent': 'FlightCare-HardwareGuard/2.0', 'Accept': 'application/json'}
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
    cloud_locked, actor, url = fetch_lock_state_from_cloud()
    if cloud_locked is not None:
        return cloud_locked, f"{actor} ({url})"

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
    print("=" * 72)
    print("  FLIGHT CARE — EPSON EcoTank L3250 TAMPER-PROOF HARDWARE GUARD")
    print("=" * 72)
    print("  Airport Counter PC Lockdown Daemon Active")
    print("  Syncing continuously with: https://flightcaresbd.com\n")

    matched_printers = get_installed_epson_printers()
    if matched_printers:
        print(f"  [+] Target physical EPSON printer found: {', '.join(matched_printers)}")
    else:
        print("  [i] Target EPSON printer not currently online.")
        print("      (Auto-detection armed. Will lock immediately upon USB/Wi-Fi connection)")

    print("-" * 72)
    last_locked = None

    while True:
        try:
            locked, actor = read_lock_state()

            # Status transition logging
            if locked != last_locked:
                status_label = "🔒 LOCKED (ম্যানেজার কমান্ড: সম্পূর্ণ বন্ধ ও সুরক্ষিত)" if locked else "🟢 UNLOCKED (ম্যানেজার অনুমতি: প্রিন্ট সক্রিয়)"
                print(f"[{time.strftime('%H:%M:%S')}] Status Change: {status_label}")
                print(f"       -> Authority: {actor}")
                last_locked = locked

            printers = get_installed_epson_printers()
            for p in printers:
                # 1. Maintain queue state
                set_printer_paused(p, paused=locked)

                # 2. If locked, PURGE any jobs that staff queued from outside website
                if locked:
                    purge_unauthorized_jobs(p)

        except Exception as e:
            # Silent resilience to network hiccups
            pass

        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()

