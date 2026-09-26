const imgs = new Set(["a", "b", "c"]);
let uniqueImgs = Array.from(imgs);
if (uniqueImgs.length > 0) {
  while (uniqueImgs.length < 40) {
    uniqueImgs = [...uniqueImgs, ...Array.from(imgs).sort(() => Math.random() - 0.5)];
  }
}
console.log(uniqueImgs.length);
