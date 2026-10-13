// Fachada com o mesmo formato do firebase-admin ({ admin, db }) pra os handlers
// continuarem iguais — por baixo, Firestore via REST + WebCrypto (ver firestore.js
// e google-auth.js), porque o SDK oficial não roda no Cloudflare Workers.
const { db, FieldValue, Timestamp } = require('./firestore');
const { verifyIdToken, createCustomToken } = require('./google-auth');

const auth = { verifyIdToken, createCustomToken };
const admin = {
  firestore: Object.assign(() => db, { FieldValue, Timestamp }),
  auth: () => auth
};

module.exports = { admin, db };
