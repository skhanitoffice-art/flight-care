#!/bin/bash
# ========================================================================
# Flight Care - EPSON EcoTank L3250 Mac Hardware Guard (macOS Native CUPS)
# Runs as a background daemon on macOS.
# Enforces the Manager's Cloud Lock command (https://flightcaresbd.com) at the macOS CUPS level.
# ========================================================================

CLOUD_URLS=(
    "https://flightcaresbd.com/api/printer/epson_lock.php"
    "https://www.flightcaresbd.com/api/printer/epson_lock.php"
    "http://localhost:8081/api/printer/epson_lock.php"
)

# Search for Epson or L3250 printers in CUPS
get_epson_printers() {
    lpstat -p 2>/dev/null | awk '{print $2}' | grep -iE 'epson|l3250|ecotank'
}

# Fetch lock state from cloud
check_lock_state() {
    for url in "${CLOUD_URLS[@]}"; do
        resp=$(curl -s -m 3 "$url" 2>/dev/null)
        if [[ $resp == *"\"ok\":true"* ]]; then
            # Check temp unlock
            if [[ $resp =~ \"temp_unlock_until\":([0-9]+(\.[0-9]+)?) ]]; then
                temp_until=${BASH_REMATCH[1]%.*}
                now=$(date +%s)
                if [ -n "$temp_until" ] && [ "$temp_until" -gt "$now" ]; then
                    echo "UNLOCKED_TEMP"
                    return
                fi
            fi
            if [[ $resp == *"\"locked\":false"* ]]; then
                echo "UNLOCKED"
                return
            else
                echo "LOCKED"
                return
            fi
        fi
    done
    # Fail-safe default
    echo "LOCKED"
}

# Report blocked print attempt to cloud
report_violation() {
    local doc="$1"
    local user="$2"
    local printer="$3"
    local now_str
    now_str=$(date "+%Y-%m-%d %H:%M:%S")

    local payload
    payload=$(printf '{"security_alert":{"type":"UNAUTHORIZED_PRINT_ATTEMPT_BLOCKED","document":"%s","user":"%s","printer":"%s","timestamp":"%s"}}' \
        "$doc" "$user" "$printer" "$now_str")

    for url in "${CLOUD_URLS[@]}"; do
        curl -s -m 3 -X POST -H "Content-Type: application/json" -d "$payload" "$url" >/dev/null 2>&1
    done
}

echo "[$(date)] Flight Care EPSON Mac Guard started."

while true; do
    printers=$(get_epson_printers)
    state=$(check_lock_state)

    if [ -n "$printers" ]; then
        for p in $printers; do
            if [ "$state" = "LOCKED" ]; then
                # 1. Disable CUPS printer queue
                cupsdisable -r "Locked by Flight Care Manager" "$p" 2>/dev/null

                # 2. Check for unauthorized jobs
                jobs=$(lpstat -o "$p" 2>/dev/null)
                if [ -n "$jobs" ]; then
                    while IFS= read -r job_line; do
                        if [ -n "$job_line" ]; then
                            job_id=$(echo "$job_line" | awk '{print $1}')
                            job_user=$(echo "$job_line" | awk '{print $2}')
                            # Purge immediately
                            cancel "$job_id" 2>/dev/null
                            report_violation "$job_id" "$job_user" "$p"
                            echo "[$(date)] 🚨 BLOCKED & PURGED Mac print job: $job_id by $job_user on $p"
                        fi
                    done <<< "$jobs"
                fi
            else
                # Allow prints
                cupsenable "$p" 2>/dev/null
            fi
        done
    fi

    sleep 1.5
done

