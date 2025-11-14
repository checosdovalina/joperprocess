import { hashPassword } from "./auth";
import { storage } from "./storage";

async function seedAdmin() {
  try {
    // Verificar si ya existe un admin
    const existingAdmin = await storage.getUserByUsername("admin");
    if (existingAdmin) {
      console.log("✅ Usuario admin ya existe");
      return;
    }

    // Crear usuario admin
    const hashedPassword = await hashPassword("admin123");
    const admin = await storage.createUser({
      username: "admin",
      password: hashedPassword,
      fullName: "Administrador",
      email: "admin@grupojoper.com",
      role: "admin",
      active: true,
    });

    console.log("✅ Usuario admin creado exitosamente");
    console.log("📋 Credenciales:");
    console.log("   Usuario: admin");
    console.log("   Contraseña: admin123");
    console.log("   Rol: admin");
    
  } catch (error) {
    console.error("❌ Error creando usuario admin:", error);
    throw error;
  }
}

seedAdmin().then(() => {
  console.log("✨ Seed completado");
  process.exit(0);
}).catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
