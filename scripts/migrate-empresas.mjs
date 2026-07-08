// ================================================================
// NEXXO - Backfill de Empresas (marcas comerciales)
// ================================================================
// Qué hace (es IDEMPOTENTE, se puede correr varias veces sin dañar datos):
//
//   1. Por cada tenant que NO tenga ninguna empresa, crea una empresa por
//      defecto llamada "<Nombre del tenant> Ligero" (la marca principal del
//      negocio existente).
//   2. Asigna esa empresa por defecto a todas las cotizaciones, pedidos y
//      embarques existentes que aún no tengan empresa (empresa_id IS NULL).
//   3. Asigna esa empresa por defecto a los vendedores que aún no tengan
//      empresa, para que puedan ver su historial.
//
// NOTA: La segunda marca (p.ej. "Móvil") se crea desde la interfaz de
//       administración en /empresas. Este script sólo prepara el historial.
//
// USO:
//   export DATABASE_URL='postgresql://usuario:password@host:5432/db'
//   node scripts/migrate-empresas.mjs
// ================================================================

import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("ERROR: falta la variable DATABASE_URL");
  process.exit(1);
}

const isNeon = process.env.DATABASE_URL.includes("neon.tech");
let pool;
if (isNeon) {
  const { Pool: NeonPool, neonConfig } = await import("@neondatabase/serverless");
  const ws = (await import("ws")).default;
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
} else {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: tenants } = await client.query(
      `SELECT id, name FROM tenants ORDER BY created_at`
    );

    let created = 0;
    let quotUpdated = 0;
    let orderUpdated = 0;
    let shipUpdated = 0;
    let vendUpdated = 0;

    for (const tenant of tenants) {
      // 1. Empresa por defecto (sólo si el tenant no tiene ninguna)
      const { rows: existing } = await client.query(
        `SELECT id FROM empresas WHERE tenant_id = $1 ORDER BY created_at LIMIT 1`,
        [tenant.id]
      );

      let defaultEmpresaId;
      if (existing.length > 0) {
        defaultEmpresaId = existing[0].id;
      } else {
        const name = `${tenant.name} Ligero`.trim();
        const { rows: inserted } = await client.query(
          `INSERT INTO empresas (tenant_id, name, clave, active)
           VALUES ($1, $2, $3, true)
           RETURNING id`,
          [tenant.id, name, "LIGERO"]
        );
        defaultEmpresaId = inserted[0].id;
        created++;
        console.log(`  + Empresa creada: "${name}" (tenant ${tenant.name})`);
      }

      // 2. Backfill de documentos comerciales sin empresa
      const q = await client.query(
        `UPDATE quotations SET empresa_id = $1
         WHERE tenant_id = $2 AND empresa_id IS NULL`,
        [defaultEmpresaId, tenant.id]
      );
      quotUpdated += q.rowCount;

      const o = await client.query(
        `UPDATE orders SET empresa_id = $1
         WHERE tenant_id = $2 AND empresa_id IS NULL`,
        [defaultEmpresaId, tenant.id]
      );
      orderUpdated += o.rowCount;

      const s = await client.query(
        `UPDATE shipments SET empresa_id = $1
         WHERE tenant_id = $2 AND empresa_id IS NULL`,
        [defaultEmpresaId, tenant.id]
      );
      shipUpdated += s.rowCount;

      // 3. Asignar vendedores sin empresa a la empresa por defecto
      const v = await client.query(
        `UPDATE users SET empresa_id = $1
         WHERE tenant_id = $2 AND role = 'vendedor' AND empresa_id IS NULL`,
        [defaultEmpresaId, tenant.id]
      );
      vendUpdated += v.rowCount;
    }

    await client.query("COMMIT");

    console.log("");
    console.log("========================================");
    console.log("  Backfill de empresas completado");
    console.log("========================================");
    console.log(`  Empresas creadas:        ${created}`);
    console.log(`  Cotizaciones asignadas:  ${quotUpdated}`);
    console.log(`  Pedidos asignados:       ${orderUpdated}`);
    console.log(`  Embarques asignados:     ${shipUpdated}`);
    console.log(`  Vendedores asignados:    ${vendUpdated}`);
    console.log("");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

main()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("ERROR en la migración:", err);
    pool.end();
    process.exit(1);
  });
