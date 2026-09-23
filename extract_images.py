import openpyxl
import pandas as pd
import os

wb = openpyxl.load_workbook('foxdrop.xlsx', data_only=True)
sheet = wb.active

data = []
for row in sheet.iter_rows(values_only=True):
    data.append(row)

print("Data rows:", len(data))

# Check for images
print("Images found:", len(sheet._images))
for img in sheet._images:
    print(f"Image anchored at: {img.anchor._from.row}, {img.anchor._from.col}")
