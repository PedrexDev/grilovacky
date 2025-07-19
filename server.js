const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const grilovackyPath = path.join(__dirname, 'data', 'grilovacky.json');

function loadGrilovacky() {
  const data = fs.readFileSync(grilovackyPath);
  return JSON.parse(data);
}

app.get('/', (req, res) => {
  const grilovacky = loadGrilovacky();
  res.render('index', { grilovacky });
});

app.listen(port, () => {
  console.log(`Server běží na http://localhost:${port}`);
});