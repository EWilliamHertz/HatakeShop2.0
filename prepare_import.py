import zipfile
import pandas as pd
import xml.etree.ElementTree as ET
import os
import shutil

xlsx_path = 'foxdrop.xlsx'

# Create temp dir for extraction
os.makedirs('temp_xlsx', exist_ok=True)
with zipfile.ZipFile(xlsx_path, 'r') as z:
    z.extractall('temp_xlsx')

# 1. Parse drawing1.xml to map rId to Row
drawing_path = 'temp_xlsx/xl/drawings/drawing1.xml'
tree = ET.parse(drawing_path)
root = tree.getroot()

ns = {
    'xdr': 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
}

row_to_rid = {}
for anchor in root.findall('.//xdr:twoCellAnchor', ns) + root.findall('.//xdr:oneCellAnchor', ns):
    from_el = anchor.find('./xdr:from', ns)
    if from_el is not None:
        row_el = from_el.find('./xdr:row', ns)
        if row_el is not None:
            row_idx = int(row_el.text)
            blip = anchor.find('.//a:blip', ns)
            if blip is not None:
                rid = blip.attrib.get(f'{{{ns["r"]}}}embed')
                if rid:
                    row_to_rid[row_idx] = rid

# 2. Parse drawing1.xml.rels to map rId to image target
rels_path = 'temp_xlsx/xl/drawings/_rels/drawing1.xml.rels'
tree_rels = ET.parse(rels_path)
root_rels = tree_rels.getroot()

ns_rels = {'rel': 'http://schemas.openxmlformats.org/package/2006/relationships'}
rid_to_target = {}
for rel in root_rels.findall('./rel:Relationship', ns_rels):
    rid = rel.attrib.get('Id')
    target = rel.attrib.get('Target')
    if rid and target:
        rid_to_target[rid] = target.replace('../', '')

# 3. Read Data
import openpyxl
wb = openpyxl.load_workbook(xlsx_path, data_only=True)
sheet = wb.active

columns = ['Product', 'Configuration', 'Price Per Box ', 'Status']
output_data = []

os.makedirs('output_images', exist_ok=True)

# Row indices in openpyxl are 1-based, but drawing xml rows are 0-based
for idx, row in enumerate(sheet.iter_rows(min_row=10, values_only=True), start=9):
    product = row[1]
    config = row[2]
    price = row[3]
    status = row[4]
    
    if not product:
        continue
        
    status_str = str(status).strip() if status else ""
    
    # Check if "In Stock"
    if 'In Stock' in status_str:
        # Check if has image
        if idx in row_to_rid:
            rid = row_to_rid[idx]
            target = rid_to_target.get(rid)
            if target:
                img_path = f'temp_xlsx/xl/{target}'
                if os.path.exists(img_path):
                    ext = os.path.splitext(target)[1]
                    safe_product_name = "".join([c for c in product if c.isalpha() or c.isdigit() or c==' ']).rstrip()
                    new_img_name = f"{safe_product_name}{ext}".replace(" ", "_")
                    shutil.copy(img_path, f'output_images/{new_img_name}')
                    
                    output_data.append({
                        'Product': product,
                        'Configuration': config,
                        'Price': price,
                        'Status': status,
                        'Image_File': new_img_name
                    })

df = pd.DataFrame(output_data)
df.to_csv('foxdrop_import.csv', index=False)
print(f"Exported {len(df)} products.")
