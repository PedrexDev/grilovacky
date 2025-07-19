const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const grilovackyPath = path.join(__dirname, 'data', 'grilovacky.json');

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

function loadGrilovacky() {
  const data = fs.readFileSync(grilovackyPath);
  return JSON.parse(data);
}

app.get('/', (req, res) => {
  const grilovacky = loadGrilovacky();
  res.render('index', { grilovacky });
});

app.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});