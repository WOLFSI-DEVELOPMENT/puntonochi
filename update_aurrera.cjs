const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('database.sqlite');
const images = [
  'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWmIYqGgHH4J7p9g77oGZlEYsUGQRrXGbhVQVV-Ue_Y55DXVtAT8dmzGumaQtaeYNMFZqjDRg_0HQx4C3acCR_DzV7KjHSx8fWzJYw_bmarDO3cbZcPP2rxWgoaC69Tsav6V-6dbZQ=s1360-w1360-h1020-rw',
  'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWmcrRsFJN27gU2aYIkRWx09tIYlCwqvGZaIjg1xyNka55fgsxCPc_cEYCr2lFZ3ewac8eRkiDDiMlOUWMnJ-zKTjdQs76kt2iD59QMiAXeqqHhmOVw718h4bOKMc_PM2h10NkGx=s1360-w1360-h1020-rw',
  'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWkUhBVvvr1EQYGrou5pnnrN8MhWM5tmfwuoQ19NXfiBDgTxDCsLe22ukdDkpFx_SMHW85wEVtLs8CACaVFHEAZ74hsGwGp7P--WC9B9mlNansm-kEHSaaontBmyUMklvviiXfNM=s1360-w1360-h1020-rw',
  'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWm5a63dHVPD7y69-7mScPFlexEpRDfu1H2kQbi23R9wNk1bLPWCO3mU7ZYQjcP_2ZMEehWavLr7n8bJrNexYpkZ545uMRhKd-HXJ8sZJp0ptoOR5O8ENk5qd4Fi85YEJG3nbWmecA=s1360-w1360-h1020-rw',
  'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWmtYhQNTmbalANPN-HAQriTCN8ceDNZ8BtwICJ7O5XikkRVZGSKSuXe1LhG6RMHYNVAn0r5I1Bcr2RPjKQI_lpj4VpT2TukVd_kdVG1nFT1TXAayaumwC6VyN4VLADG6QcKF3TK5Q=s1360-w1360-h1020-rw',
  'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWl9QpVnAINn02bf_gdHor5Rc-HDW3WhIOHUiuHTwKb799bx9uXK0d-mu1LvQUlRQUZYdlcRSqr6vHP33AKoPETHAK_3-0-ivqB9-JPprUFQCHVj3JGwMXOjW2WgHnu8XK12SF0Y=s1360-w1360-h1020-rw'
];
db.prepare('UPDATE places SET images = ? WHERE id = ?').run(JSON.stringify(images), 's1');
console.log('Updated Bodega Aurrera');
