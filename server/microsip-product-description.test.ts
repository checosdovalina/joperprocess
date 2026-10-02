import { afterEach, describe, expect, it, vi } from "vitest";
import { products } from "@shared/schema";

const { select, update } = vi.hoisted(() => ({ select: vi.fn(), update: vi.fn() }));
vi.mock("./db", () => ({ db: { select, update } }));
import { MicrosipSyncService } from "./microsip-sync";

afterEach(() => vi.restoreAllMocks());

describe("Microsip product descriptions", () => {
  it("never writes descriptions, preserving even edits made while a sync is in progress", async () => {
    const savedProduct = {
      id: "existing-product", code: "P001", name: "Original name", active: true,
      microsipArticuloId: 101, description: "Previously saved description",
    };
    let productUpdate: Record<string, unknown> | undefined;
    select.mockImplementation(() => ({
      from: (table: unknown) => ({
        where: async () => {
          if (table !== products) return [];
          const snapshot = { ...savedProduct };
          // Simulate the user saving a new description after catalog preloading.
          savedProduct.description = "New description saved during synchronization";
          return [snapshot];
        },
      }),
    }));
    update.mockImplementation((table: unknown) => ({
      set: (data: Record<string, unknown>) => ({
        where: async () => {
          if (table === products) {
            productUpdate = data;
            Object.assign(savedProduct, data);
          }
        },
      }),
    }));

    const service = new MicrosipSyncService("test-company");
    const internal = service as any;
    const detach = vi.fn();
    internal.config = { syncProducts: true };
    vi.spyOn(internal, "loadConfig").mockResolvedValue(true);
    vi.spyOn(internal, "logSync").mockResolvedValue("test-log");
    vi.spyOn(internal, "connect").mockResolvedValue({ detach });
    vi.spyOn(internal, "query").mockResolvedValue([{
      ARTICULO_ID: 101, CLAVE_ARTICULO: "P001", NOMBRE: "Updated catalog name",
      LINEA_ARTICULO_ID: 0, PRECIO: 100, MONEDA_ID: 1, ESTATUS: "A",
    }]);
    vi.spyOn(internal, "updateLogCompletion").mockResolvedValue(undefined);

    expect(await service.syncProducts()).toEqual({ processed: 1, created: 0, updated: 1, skipped: 0 });
    expect(productUpdate).not.toHaveProperty("description");
    expect(savedProduct.name).toBe("Updated catalog name");
    expect(savedProduct.description).toBe("New description saved during synchronization");
    expect(detach).toHaveBeenCalledOnce();
  });
});