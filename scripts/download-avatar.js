const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://models.readyplayer.me/6460d95f9ae10f45bffb2864.glb?morphTargets=ARKit&textureAtlas=1024';
const outputPath = path.join(__dirname, '..', 'public', 'models', 'default-avatar.glb');

// Ensure directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

console.log('Downloading avatar model...');
const file = fs.createWriteStream(outputPath);

https.get(url, (response) => {
  if (response.statusCode === 200) {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('Avatar model downloaded successfully to:', outputPath);
    });
  } else {
    console.error('Failed to download:', response.statusCode);
    fs.unlinkSync(outputPath);
  }
}).on('error', (err) => {
  console.error('Error downloading model:', err.message);
  fs.unlinkSync(outputPath);
});
