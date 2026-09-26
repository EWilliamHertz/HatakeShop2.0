const backgroundImages = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
for (let colIdx = 0; colIdx < 5; colIdx++) {
  const colSize = Math.max(5, Math.ceil(backgroundImages.length / 5));
  const start = colIdx * colSize;
  let colItems = backgroundImages.slice(start, start + colSize);
  if (colItems.length === 0) colItems = backgroundImages.slice(0, colSize);
  console.log(`Col ${colIdx}:`, colItems);
}
