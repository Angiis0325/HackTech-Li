/**
 * scripts/generate-secrets.js
 *
 * Genera valores aleatorios y fuertes para JWT_SECRET, N8N_WEBHOOK_TOKEN
 * y una password sugerida para el usuario de Postgres.
 *
 * IMPORTANTE: esto NO modifica tu .env automáticamente. Solo imprime
 * valores nuevos para que los copies a mano y los guardes en un lugar
 * seguro (gestor de secretos, variables de entorno del hosting, etc.),
 * nunca en el repositorio.
 *
 * Uso:
 *   node scripts/generate-secrets.js
 */

const crypto = require("crypto");

function randomHex(bytes) {
  return crypto.randomBytes(bytes).toString("hex");
}

function randomBase64Url(bytes) {
  return crypto.randomBytes(bytes).toString("base64url");
}

const jwtSecret = randomHex(48); // 96 caracteres hex
const n8nWebhookToken = randomBase64Url(32);
const suggestedPgPassword = randomBase64Url(24);
const adminInviteCode = randomBase64Url(12);

console.log("======================================================");
console.log(" Nuevas credenciales sugeridas (NO subir esto a git)");
console.log("======================================================");
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`N8N_WEBHOOK_TOKEN=${n8nWebhookToken}`);
console.log(`ADMIN_INVITE_CODE=${adminInviteCode}`);
console.log("");
console.log("Password sugerida para el usuario de Postgres (producción):");
console.log(`  ${suggestedPgPassword}`);
console.log("");
console.log("Recuerda además:");
console.log("  - Cambiar el usuario/DB de Postgres si vas a exponer el backend");
console.log("    (no uses user/123456789 fuera de tu máquina local).");
console.log("  - Actualizar DATABASE_URL con la nueva password.");
console.log("  - Reiniciar el backend después de cambiar el .env.");
console.log("  - Si cambias JWT_SECRET, todos los tokens ya emitidos dejan");
console.log("    de ser válidos (los usuarios deben volver a hacer login).");
