import express from 'express';
const app = express();
app.get('/', (req, res) => {
  res.json(undefined);
});
const server = app.listen(3002, async () => {
  const r = await fetch('http://localhost:3002/');
  console.log("Status:", r.status);
  const text = await r.text();
  console.log("Body:", text);
  server.close();
});
