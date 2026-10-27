import os
import zipfile

dist_dir = 'dist'
target_zips = ['FlightCare-website.zip', 'flightcare-hostinger-build.zip']

for zip_filename in target_zips:
    if os.path.exists(zip_filename):
        os.remove(zip_filename)
        
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(dist_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, dist_dir)
                # Standard POSIX forward slashes for universal compatibility on Linux (Hostinger) and Windows
                posix_path = rel_path.replace('\\', '/')
                zipf.write(full_path, posix_path)
                
    print(f"Created {zip_filename} successfully!")

# Inspect entries
with zipfile.ZipFile('FlightCare-website.zip', 'r') as zipf:
    entries = zipf.namelist()
    print(f"Total entries: {len(entries)}")
    for e in entries:
        print(f" - {e}")

