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
import { useEffect, useMemo } from "react";
import { useI18n } from "@/hooks/use-i18n";

interface ProductFormProps {
  categories: ProductCategory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertProduct) => void;
  isPending: boolean;
  editingProduct?: (Product & { category?: ProductCategory | null }) | null;
}

const makeFormSchema = (t: (key: string) => string) => insertProductSchema.extend({
  code: z.string().min(1, t("products.code-required")),
  name: z.string().min(1, t("products.name-required")),
  listPrice: z.string().min(1, t("products.list-price-required")),
});

type ProductFormData = z.infer<ReturnType<typeof makeFormSchema>>;

const UNITS_OF_MEASURE = [
  { value: "PZA", labelKey: "products.uom.piece" },
  { value: "KG", labelKey: "products.uom.kg" },
  { value: "LT", labelKey: "products.uom.liter" },
  { value: "MT", labelKey: "products.uom.meter" },
  { value: "M2", labelKey: "products.uom.sqm" },
  { value: "M3", labelKey: "products.uom.cbm" },
  { value: "PAQ", labelKey: "products.uom.pack" },
  { value: "CJA", labelKey: "products.uom.box" },
  { value: "ROL", labelKey: "products.uom.roll" },
];

export function ProductForm({
  categories,
  open,
  onOpenChange,
  onSubmit,
  isPending,
  editingProduct,
}: ProductFormProps) {
  const { t } = useI18n();
  const formSchema = useMemo(() => makeFormSchema(t), [t]);
  const form = useForm<ProductFormData>({
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
            {editingProduct ? t("products.edit-product") : t("products.new")}
          </DialogTitle>
          <DialogDescription>
            {editingProduct
              ? t("products.edit-product-desc")
              : t("products.new-product-desc")}
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
                    <FormLabel>{t("products.code-required")}</FormLabel>
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
                    <FormLabel>{t("products.name-required")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("products.name-ph")}
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
                  <FormLabel>{t("label.description")}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      placeholder={t("products.desc-ph")}
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
                    <FormLabel>{t("label.category")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-product-category">
                          <SelectValue placeholder={t("products.select-category")} />
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
                    <FormLabel>{t("label.brand")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder={t("label.brand")}
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
                    <FormLabel>{t("products.list-price-required")}</FormLabel>
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
                    <FormLabel>{t("products.cost")}</FormLabel>
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
                    <FormLabel>{t("products.unit")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-product-unit">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UNITS_OF_MEASURE.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {t(unit.labelKey)}
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
                    <FormLabel>{t("products.current-stock")}</FormLabel>
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
                    <FormLabel>{t("products.min-stock")}</FormLabel>
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
                    <FormLabel>{t("products.max-discount")}</FormLabel>
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
                    <FormLabel>{t("products.tax-rate")}</FormLabel>
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
                      <FormLabel className="text-base">{t("label.active")}</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        {t("products.active-hint")}
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
                  <FormLabel>{t("products.image-url")}</FormLabel>
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
                {t("btn.cancel")}
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingProduct ? t("btn.save-changes") : t("products.create-product")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
