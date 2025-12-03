import { useState } from "react";
import { Product, ProductCategory, InsertProduct } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Package, Search, Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEntityQuery, useEntityMutation } from "@/hooks/use-entity-query";
import { ProductForm } from "@/components/product-form";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";

type ProductWithCategory = Product & { category?: ProductCategory | null };

export default function ProductsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;

  const { data: products, isLoading } = useEntityQuery<ProductWithCategory[]>(
    searchQuery ? `/api/products?q=${encodeURIComponent(searchQuery)}` : "/api/products"
  );

  const { data: categories } = useEntityQuery<ProductCategory[]>("/api/product-categories");

  const createMutation = useEntityMutation<Product, InsertProduct>({
    endpoint: "/api/products",
    method: "POST",
    successMessage: "Producto creado exitosamente",
    invalidateQueries: ["/api/products"],
    onSuccessCallback: () => {
      setDialogOpen(false);
      setEditingProduct(null);
    },
  });

  const updateMutation = useEntityMutation<Product, Partial<InsertProduct>>({
    endpoint: editingProduct ? `/api/products/${editingProduct.id}` : "",
    method: "PATCH",
    successMessage: "Producto actualizado exitosamente",
    invalidateQueries: ["/api/products"],
    onSuccessCallback: () => {
      setDialogOpen(false);
      setEditingProduct(null);
    },
  });

  const handleEdit = (product: ProductWithCategory) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleSubmit = (data: InsertProduct) => {
    if (editingProduct) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return num.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
          <p className="text-muted-foreground mt-1">
            Catálogo de productos con precios e inventario
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditingProduct(null); setDialogOpen(true); }} data-testid="button-add-product">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Catálogo de Productos</CardTitle>
              <CardDescription>
                {products?.length || 0} productos registrados
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, nombre o marca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-products"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : products && products.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead className="text-right">Precio Lista</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Estado</TableHead>
                    {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} className="hover-elevate" data-testid={`row-product-${product.id}`}>
                      <TableCell>
                        <div className="font-mono font-medium text-sm">{product.code}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{product.name}</div>
                        {product.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {product.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {product.category?.name || (
                          <span className="text-muted-foreground">Sin categoría</span>
                        )}
                      </TableCell>
                      <TableCell>{product.brand || "-"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(product.listPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={parseFloat(product.stock) <= parseFloat(product.minStock || "0") ? "text-destructive font-medium" : ""}>
                          {parseFloat(product.stock).toLocaleString()} {product.unitOfMeasure}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.active ? "default" : "secondary"}>
                          {product.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(product)}
                            data-testid={`button-edit-product-${product.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay productos registrados</p>
              {isAdmin && (
                <Button
                  className="mt-4"
                  onClick={() => { setEditingProduct(null); setDialogOpen(true); }}
                  data-testid="button-add-first-product"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Primer Producto
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <ProductForm
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingProduct(null);
          }}
          onSubmit={handleSubmit}
          isPending={createMutation.isPending || updateMutation.isPending}
          categories={categories || []}
          editingProduct={editingProduct}
        />
      )}
    </div>
  );
}
