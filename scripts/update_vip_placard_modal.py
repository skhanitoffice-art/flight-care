# scripts/update_vip_placard_modal.py

with open('src/components/VipPlacardModal.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Import formatPlacardDate
target_import = "import { getPlacardHistory } from '../services/placardService';"
if "formatPlacardDate" not in content:
    content = "import { formatPlacardDate } from '../services/placardService';\n" + content

# 2. Date formatting replacement
target_date_block = """  // 3. Extract and Format Service Date (e.g. 25 OCT 2026)
  const rawDate = booking.flightDate || booking.serviceDate || booking.date || booking.flight_date || '';
  let formattedDate = '25 OCT 2026';
  if (rawDate) {
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const mon = months[d.getMonth()];
        const yr = d.getFullYear();
        formattedDate = `${day} ${mon} ${yr}`;
      } else {
        formattedDate = String(rawDate).toUpperCase();
      }
    } catch {
      formattedDate = String(rawDate).toUpperCase();
    }
  }"""

replacement_date_block = """  // 3. Extract and Format Service Date (Exact DD-MM-YYYY e.g. 29-10-2026)
  const rawDate = booking.flightDate || booking.serviceDate || booking.date || booking.flight_date || '';
  const formattedDate = formatPlacardDate(rawDate);"""

if target_date_block.replace('\n', '\r\n') in content:
    content = content.replace(target_date_block.replace('\n', '\r\n'), replacement_date_block.replace('\n', '\r\n'), 1)
    print("1. Replaced date block (CRLF)")
elif target_date_block in content:
    content = content.replace(target_date_block, replacement_date_block, 1)
    print("1. Replaced date block (LF)")
else:
    print("1. Target date block not found")

# Replace colors #032B14 -> #012B14 and #052E1B -> #012B14
content = content.replace("'#032B14'", "'#012B14'")
content = content.replace('"#032B14"', '"#012B14"')
content = content.replace("'#052E1B'", "'#012B14'")
content = content.replace('"#052E1B"', '"#012B14"')
content = content.replace("color: #032B14;", "color: #012B14;")
content = content.replace("color: #052E1B;", "color: #012B14;")

with open('src/components/VipPlacardModal.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated VipPlacardModal.js successfully!")

