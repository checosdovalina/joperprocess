import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema, type ProductCategory, type InsertProduct, type Product } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

interface ProductFormProps {
  categories: ProductCategory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertProduct) => void;
  isPending: boolean;
  editingProduct?: (Product & { category?: ProductCategory | null }) | null;
}

const formSchema = insertProductSchema.extend({
  code: z.string().min(1, "Ingresa el código del producto"),
  name: z.string().min(1, "Ingresa el nombre del producto"),
  listPrice: z.string().min(1, "Ingresa el precio de lista"),
});

const UNITS_OF_MEASURE = [
  { value: "PZA", label: "Pieza" },
  { value: "KG", label: "Kilogramo" },
  { value: "LT", label: "Litro" },
  { value: "MT", label: "Metro" },
  { value: "M2", label: "Metro cuadrado" },
  { value: "M3", label: "Metro cúbico" },
  { value: "PAQ", label: "Paquete" },
  { value: "CJA", label: "Caja" },
  { value: "ROL", label: "Rollo" },
];

export function ProductForm({
  categories,
  open,
  onOpenChange,
  onSubmit,
  isPending,
  editingProduct,
}: ProductFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      categoryId: null,
      brand: "",
      unitOfMeasure: "PZA",
      listPrice: "",
      cost: "",
      stock: "0",
      minStock: "0",
      maxDiscount: "0",
      taxRate: "16",
      imageUrl: "",
      active: true,
    },
  });

  useEffect(() => {
    if (editingProduct) {
      form.reset({
        code: editingProduct.code,
        name: editingProduct.name,
        description: editingProduct.description || "",
        categoryId: editingProduct.categoryId,
        brand: editingProduct.brand || "",
        unitOfMeasure: editingProduct.unitOfMeasure,
        listPrice: editingProduct.listPrice,
        cost: editingProduct.cost || "",
        stock: editingProduct.stock,
        minStock: editingProduct.minStock || "0",
        maxDiscount: editingProduct.maxDiscount || "0",
        taxRate: editingProduct.taxRate,
        imageUrl: editingProduct.imageUrl || "",
        active: editingProduct.active,
      });
    } else {
      form.reset({
        code: "",
        name: "",
        description: "",
        categoryId: null,
        brand: "",
        unitOfMeasure: "PZA",
        listPrice: "",
        cost: "",
        stock: "0",
        minStock: "0",
        maxDiscount: "0",
        taxRate: "16",
        imageUrl: "",
        active: true,
      });
    }
  }, [editingProduct, form]);

  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    onSubmit(data as InsertProduct);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingProduct ? "Editar Producto" : "Nuevo Producto"}
          </DialogTitle>
          <DialogDescription>
            {editingProduct
              ? "Modifica los datos del producto"
              : "Ingresa los datos del nuevo producto"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="PROD-001"
                        data-testid="input-product-code"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Nombre del producto"
                        data-testid="input-product-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      placeholder="Descripción del producto..."
                      data-testid="textarea-product-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-product-category">
                          <SelectValue placeholder="Selecciona categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem
                            key={category.id}
                            value={category.id}
                            data-testid={`option-category-${category.id}`}
                          >
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="Marca"
                        data-testid="input-product-brand"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="listPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio Lista *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        data-testid="input-product-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        data-testid="input-product-cost"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitOfMeasure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidad</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-product-unit">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UNITS_OF_MEASURE.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Actual</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder="0"
                        data-testid="input-product-stock"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Mínimo</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || "0"}
                        type="number"
                        step="0.01"
                        placeholder="0"
                        data-testid="input-product-min-stock"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxDiscount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desc. Máximo %</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || "0"}
                        type="number"
                        step="0.01"
                        max="100"
                        placeholder="0"
                        data-testid="input-product-max-discount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="taxRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tasa IVA %</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder="16"
                        data-testid="input-product-tax-rate"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Activo</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Producto disponible para cotizar
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-product-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL de Imagen</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      placeholder="https://..."
                      data-testid="input-product-image-url"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingProduct ? "Guardar Cambios" : "Crear Producto"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
