// Inicialização única do Admin SDK pras functions novas (as antigas inicializam inline).
// FIRESTORE_EMULATOR_HOST/FIREBASE_AUTH_EMULATOR_HOST (testes locais) fazem o SDK falar
// com o emulador sem credencial nenhuma — em produção sempre usa a service account.
const admin = require('firebase-admin');

if (!admin.apps.length) {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-pizza' });
  } else {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  }
}

module.exports = { admin, db: admin.firestore() };
