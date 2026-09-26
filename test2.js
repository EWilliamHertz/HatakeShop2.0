const backgroundImages = ['A', 'B', 'C', 'D'];
let pool = [...backgroundImages];
while (pool.length < 25) {
  pool = [...pool, ...[...backgroundImages].sort(() => Math.random() - 0.5)];
}
for (let colIdx = 0; colIdx < 5; colIdx++) {
  const colSize = Math.max(5, Math.floor(pool.length / 5));
  const start = colIdx * colSize;
  const colItems = pool.slice(start, start + colSize);
  console.log(`Col ${colIdx}:`, colItems);
}
