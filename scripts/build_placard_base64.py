# scripts/build_placard_base64.py
import base64
import os

os.makedirs('src/assets', exist_ok=True)

with open('assets/placard_template.png', 'rb') as f:
    b64_tpl = base64.b64encode(f.read()).decode('utf-8')

with open('assets/placard_plane_icon.png', 'rb') as f:
    b64_plane = base64.b64encode(f.read()).decode('utf-8')

with open('assets/placard_cal_icon.png', 'rb') as f:
    b64_cal = base64.b64encode(f.read()).decode('utf-8')

with open('src/assets/placardAssetsBase64.js', 'w', encoding='utf-8') as f:
    f.write('// src/assets/placardAssetsBase64.js\n')
    f.write('// Embedded zero-network base64 data URIs for Flight Care Placard Generator\n\n')
    f.write(f'export const PLACARD_TEMPLATE_B64 = "data:image/png;base64,{b64_tpl}";\n\n')
    f.write(f'export const PLACARD_PLANE_ICON_B64 = "data:image/png;base64,{b64_plane}";\n\n')
    f.write(f'export const PLACARD_CAL_ICON_B64 = "data:image/png;base64,{b64_cal}";\n')

print("Created src/assets/placardAssetsBase64.js successfully!")

