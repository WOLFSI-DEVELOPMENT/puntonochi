const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('database.sqlite');
const images = [
  'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWmyQItxFSQSti66RKortcPZcM3HzSBzaqAn9jJDOPn_ogBdIZowiPSAgBHgzPNLaaKavygQtoy09Ri63i7z_Dnd5d0BuLA6riSqktUwXM2zmhc3yNhvwA0eywE9dU4HgxSuKp7ZqHPwYxjO=s1360-w1360-h1020-rw',
  'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWmI1nYizNdW0081liIvJlkuGi46wBJ-A2ReRvmgphTEQJz00fSgiXQfuBjYGH4cROt-UmU1jdws5uuNjjRZkdpfuX4Do51GlJ45c9i4P2tzhCPVvVU5Krh6tr6iFuo5HF8JFnpuujb3A4w=w141-h141-n-k-no-nu',
  'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWneAAvcKTB6cV3tg52XeArb6zN6hbQV0fY-PyJuWT9uHtXVUNxv7iSg4ZotA20kBD9agBXuaeVOIz1HFXUxfoORsYu9uOQQncjNlL8Ps-A6Wfd5qgMA5Key5LBSMDqX8EgB_JjwFg=s1360-w1360-h1020-rw'
];
db.prepare('UPDATE places SET images = ? WHERE id = ?').run(JSON.stringify(images), 'h3');
console.log('Updated Dos Patios Hotel images');
