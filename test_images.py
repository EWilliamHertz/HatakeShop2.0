import openpyxl
wb = openpyxl.load_workbook('foxdrop.xlsx')
sheet = wb.active
print("Images found:", len(sheet._images))
