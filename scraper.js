const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const cron = require('node-cron');

const grilovackyPath = path.join(__dirname, 'data', 'grilovacky.json');

function loadGrilovacky() {
  if (!fs.existsSync(grilovackyPath)) return [];
  const data = fs.readFileSync(grilovackyPath);
  return JSON.parse(data);
}

function saveGrilovacky(data) {
  fs.writeFileSync(grilovackyPath, JSON.stringify(data, null, 2));
}

function extractGrilovackaInfo(text) {
  const regex = /grilovačka\s+(\d{1,2})\.(\d{1,2})\s+(\d{4}).*?(\d{1,2}:\d{2})-(\d{1,2}:\d{2}).*?(\d+)\s*Lidi/i;
  const locationRegex = /tenovice.*|spálené\s*poříčí/i;

  const match = text.match(regex);
  const location = text.match(locationRegex);

  if (match) {
    const [_, day, month, year, start, end, people] = match;
    return {
      date: `${day}.${month}.${year}`,
      time: `${start}-${end}`,
      capacity: parseInt(people),
      location: location ? location[0] : "Neznámé místo",
      status: "Budoucí"
    };
  }

  return null;
}

async function analyzeFrantisekImages() {
  const existing = loadGrilovacky();
  const imagesDir = path.join(__dirname, 'frantisek.reditel');

  if (!fs.existsSync(imagesDir)) {
    console.log("Složka s obrázky neexistuje:", imagesDir);
    return;
  }

  const files = fs.readdirSync(imagesDir).filter(file => file.endsWith('.jpg') || file.endsWith('.png'));

  for (const file of files) {
    const imagePath = path.join(imagesDir, file);
    const { data: { text: ocrText } } = await Tesseract.recognize(imagePath, 'ces');

    const grilovacka = extractGrilovackaInfo(ocrText);
    if (grilovacka) {
      const isDuplicate = existing.some(g =>
        g.date === grilovacka.date && g.time === grilovacka.time
      );

      if (!isDuplicate) {
        console.log("✅ Nová grilovačka detekována:", grilovacka);
        existing.push(grilovacka);
      }
    }
  }

  saveGrilovacky(existing);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadInstagramImages() {
  const username = 'frantisek.reditel.scraper';
  const cmd = `python -m instaloader --login=${username} --no-videos --count=1 frantisek.reditel`;

  for (let i = 0; i < 3; i++) { // max 3 pokusy
    try {
      await new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
          if (error) reject(stderr);
          else resolve();
        });
      });
      return; // úspěch, končíme
    } catch (err) {
      console.error("Instaloader error, pokus č.", i + 1, err);
      if (i < 2) {
        console.log("Čekám 5 minut před dalším pokusem...");
        await delay(5 * 60 * 1000); // čekání 5 minut
      } else {
        throw new Error("Instaloader opakovaně selhal.");
      }
    }
  }
}

async function analyzeFrantisekPosts() {
  try {
    await downloadInstagramImages();
    await analyzeFrantisekImages();
  } catch (err) {
    console.error("❌ Chyba při analýze příspěvků:", err);
  }
}

cron.schedule('0 */2 * * *', () => {
  console.log("🔍 Spouštím kontrolu Instagramu...");
  analyzeFrantisekPosts();
});

analyzeFrantisekPosts();
