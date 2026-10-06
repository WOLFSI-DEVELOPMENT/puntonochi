const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('database.sqlite');

const updates = [
  {
    id: 'h1',
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/f/ff/Los_arcos_nochistlan.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/b/b8/Pari%C3%A1n_Nochistl%C3%A1n.jpg'
    ]
  },
  {
    id: 'h2',
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/4/4f/Q.Real_Zacatecas.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/f/f7/Quinta_Real_Zacatecas%2C_noche_-_panoramio.jpg'
    ]
  },
  {
    id: 'h4',
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/e/e7/Nochistlan%2C_Zacatecas.JPG',
      'https://upload.wikimedia.org/wikipedia/commons/1/16/Quinta_Real%2C_acueducto%2C_noche_-_panoramio.jpg'
    ]
  },
  {
    id: 'h5',
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/3/3c/Nochistlan_banner3.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/c/c1/Los_Telos_de_Nochistl%C3%A1n_en_el_Teatro_Licenciado_Jos%C3%A9_Minero_Roque.jpg'
    ]
  },
  {
    id: 'r1',
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/e/e9/Nochistl%C3%A1n_banner2.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/a/aa/Monumento_a_Tenamaxtle%2C_escultora_Lucy_Topete%2C_Nochistlan_Zac..JPG'
    ]
  },
  {
    id: 's2',
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/2/23/Mercado_Jes%C3%BAs_Gonz%C3%A1lez_Ortega_01.JPG',
      'https://upload.wikimedia.org/wikipedia/commons/5/59/Mercado_Gonzalez_Ortega_zacatecas.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/4/4c/Mercado_Jes%C3%BAs_Gonz%C3%A1lez_Ortega_02.JPG'
    ]
  },
  {
    id: 'b3',
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/d/df/Banco_Banorte%2C_Villa_Uni%C3%B3n%2C_Sinaloa%2C_29_de_diciembre_de_2022.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/0/08/AsambleaBanorte-Carlos-Hank-Gonz%C3%A1lez.jpg'
    ],
    logo: 'https://upload.wikimedia.org/wikipedia/commons/0/04/Banorte-logo.jpg'
  },
  {
    id: 'b4',
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/d/df/Banco_Banorte%2C_Villa_Uni%C3%B3n%2C_Sinaloa%2C_29_de_diciembre_de_2022.jpg'
    ],
    logo: 'https://upload.wikimedia.org/wikipedia/commons/0/04/Banorte-logo.jpg'
  }
];

const updateStmt = db.prepare('UPDATE places SET images = COALESCE(?, images), logo = COALESCE(?, logo) WHERE id = ?');

for (const p of updates) {
  updateStmt.run(
    JSON.stringify(p.images),
    p.logo || null,
    p.id
  );
}
console.log('All places updated with real images!');
