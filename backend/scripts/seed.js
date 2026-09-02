/**
 * scripts/seed.js
 * Crea un usuario admin inicial y algunos servicios base
 * para poder probar el flujo completo de reservas sin
 * depender de datos manuales en pgAdmin.
 *
 * Uso:
 *   node scripts/seed.js
 *
 * Requiere las mismas variables de entorno que el backend
 * (.env con DATABASE_URL). Reutiliza el hash de password
 * real (bcrypt) para que el usuario pueda hacer login
 * normalmente por /api/auth/login.
 */

const { Client } = require("pg");
const env = require("../src/config/env");
const { hashPassword } = require("../src/utils/password");

const SEED_ADMIN = {
  name: "Admin HackTech",
  email: "admin@fisioterapeutali.com",
  password: "Admin12345", // cámbialo después del primer login
  role: "admin"
};

const SEED_SERVICES = [
  {
    name: "Consulta de valoración",
    description: "Primera cita para evaluar el estado del paciente y definir plan de tratamiento.",
    duration_minutes: 45
  },
  {
    name: "Sesión de fisioterapia general",
    description: "Sesión estándar de tratamiento fisioterapéutico.",
    duration_minutes: 60
  },
  {
    name: "Terapia deportiva",
    description: "Sesión enfocada en recuperación y rendimiento deportivo.",
    duration_minutes: 60
  },
  {
    name: "Sesión de seguimiento",
    description: "Control corto de avance del tratamiento.",
    duration_minutes: 30
  }
];

async function seedAdmin(client) {
  const { rows: existing } = await client.query(
    "SELECT id FROM users WHERE email = LOWER($1) LIMIT 1",
    [SEED_ADMIN.email]
  );

  if (existing.length > 0) {
    console.log(`[seed] Usuario admin ya existe (id=${existing[0].id}), se omite.`);
    return existing[0].id;
  }

  const passwordHash = await hashPassword(SEED_ADMIN.password);

  const { rows } = await client.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, LOWER($2), $3, $4)
     RETURNING id, email`,
    [SEED_ADMIN.name, SEED_ADMIN.email, passwordHash, SEED_ADMIN.role]
  );

  console.log(`[seed] Usuario admin creado: ${rows[0].email} (id=${rows[0].id})`);
  console.log(`[seed] Password temporal: ${SEED_ADMIN.password}`);
  return rows[0].id;
}

async function seedServices(client) {
  const serviceIds = [];

  for (const service of SEED_SERVICES) {
    const { rows: existing } = await client.query(
      "SELECT id FROM services WHERE name = $1 LIMIT 1",
      [service.name]
    );

    if (existing.length > 0) {
      console.log(`[seed] Servicio "${service.name}" ya existe, se omite.`);
      serviceIds.push(existing[0].id);
      continue;
    }

    const { rows } = await client.query(
      `INSERT INTO services (name, description, duration_minutes, is_active)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, name`,
      [service.name, service.description, service.duration_minutes]
    );

    console.log(`[seed] Servicio creado: ${rows[0].name} (id=${rows[0].id})`);
    serviceIds.push(rows[0].id);
  }

  return serviceIds;
}

// Vincula al admin sembrado con todos los servicios sembrados en
// user_services, para que el flujo de "personal que atiende" funcione
// de una vez al probar el proyecto recién clonado.
async function seedUserServices(client, adminId, serviceIds) {
  if (!adminId) return;

  for (const serviceId of serviceIds) {
    await client.query(
      `INSERT INTO user_services (user_id, service_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, service_id) DO NOTHING`,
      [adminId, serviceId]
    );
  }

  console.log(`[seed] Admin (id=${adminId}) asignado a ${serviceIds.length} servicio(s) en user_services.`);
}

async function main() {
  const client = new Client({ connectionString: env.databaseUrl });
  await client.connect();

  try {
    const adminId = await seedAdmin(client);
    const serviceIds = await seedServices(client);
    await seedUserServices(client, adminId, serviceIds);
    console.log("[seed] Semilla completada.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[seed] Falló:", error.message);
  process.exit(1);
});