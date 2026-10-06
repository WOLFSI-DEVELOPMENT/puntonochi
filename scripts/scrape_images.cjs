const https = require('https');
const query = 'Hotel Nochistlan Zacatecas mexico';
https.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const urls = [];
    const regex = /<img[^>]+src="([^">]+)"/g;
    let match;
    while (match = regex.exec(data)) {
      if (match[1].startsWith('//')) {
        urls.push('https:' + match[1]);
      } else if (match[1].startsWith('http')) {
        urls.push(match[1]);
      }
    }
    console.log(urls.slice(0, 10));
  });
});
