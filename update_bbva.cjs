const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('database.sqlite');
db.prepare('UPDATE places SET images = ?, logo = ? WHERE id = ?').run(
  JSON.stringify(['https://static.cegoslatam.com/wp-content/uploads/2026/03/13121916/logo-bbva-960x640-1.jpg']),
  'https://play-lh.googleusercontent.com/uU98e0PPz2dQJLTVRGYvRSbdHijATo1WVCHfhBBjf_iJ69JiWE1eTSO-xuXckl63FxAQg1SNaT8TBdqN1IgH',
  'b1'
);
console.log('Updated BBVA');
