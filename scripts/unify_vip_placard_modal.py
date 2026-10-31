# scripts/unify_vip_placard_modal.py

with open('src/components/VipPlacardModal.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
if "downloadPlacardImage" not in content:
    content = content.replace(
        "import { formatPlacardDate } from '../services/placardService';",
        "import { formatPlacardDate, downloadPlacardImage, printPlacardDirect } from '../services/placardService';"
    )

# 2. Replace handleDownloadPlacard and handlePrintPlacard with clean delegators
old_download_marker = "  // Generate High-Res Canvas Image for Download"
old_print_end_marker = "  return (\n    <Modal"
if old_print_end_marker not in content:
    old_print_end_marker = "  return (\r\n    <Modal"

idx_start = content.find(old_download_marker)
idx_end = content.find(old_print_end_marker)

if idx_start != -1 and idx_end != -1:
    new_handlers = """  // Generate High-Res Canvas Image for Download (Instant Base64 Renderer)
  const handleDownloadPlacard = () => {
    downloadPlacardImage({
      passengerName: formattedName,
      flightNumber: cleanFlight,
      serviceDate: formattedDate,
      onSuccess: () => {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      },
    });
  };

  // Direct Print Placard (Unblockable Iframe Printer)
  const handlePrintPlacard = () => {
    printPlacardDirect({
      passengerName: formattedName,
      flightNumber: cleanFlight,
      serviceDate: formattedDate,
    });
  };

"""
    content = content[:idx_start] + new_handlers + content[idx_end:]
    print("Replaced handlers in VipPlacardModal.js successfully!")
else:
    print(f"Markers not found: start={idx_start}, end={idx_end}")

with open('src/components/VipPlacardModal.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated VipPlacardModal.js done!")

