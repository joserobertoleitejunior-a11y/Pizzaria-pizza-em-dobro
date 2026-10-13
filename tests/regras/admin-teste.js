// Só para os TESTES: SDK oficial do Firebase (devDependency) usado pra semear/inspecionar o
// banco no emulador de forma independente do código de produção (server/lib/firestore.js,
// que fala REST). Se os dois discordarem, o teste pega.
const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-pizza' });
module.exports = { admin, db: admin.firestore() };
