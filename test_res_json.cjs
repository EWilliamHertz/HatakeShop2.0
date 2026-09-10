const express = require('express');
const app = express();
app.get('/test', (req, res) => {
  res.json(undefined);
});
const server = app.listen(3001, async () => {
  try {
    const r = await fetch('http://localhost:3001/test');
    console.log(r.status);
    const text = await r.text();
    console.log("text:", text);
  } catch(e) {
    console.error(e);
  } finally {
    server.close();
  }
});
