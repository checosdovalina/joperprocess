import { useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { Product, ProductCategory, InsertProduct, InsertProductCategory } from "@shared/schema";
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
import { Plus, Package, Search, Pencil, FolderOpen, Loader2, Filter, X, ToggleLeft, ToggleRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useEntityQuery, useEntityMutation } from "@/hooks/use-entity-query";
import { queryClient } from "@/lib/queryClient";
import { ProductForm } from "@/components/product-form";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ProductWithCategory = Product & { category?: ProductCategory | null };

export default function ProductsPage() {
  const { t } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<string>("name-asc");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;

  const hasActiveFilters = categoryFilter !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    setCategoryFilter("all");
    setStatusFilter("all");
  };

  const { data: products, isLoading } = useEntityQuery<ProductWithCategory[]>(
    searchQuery ? `/api/products?q=${encodeURIComponent(searchQuery)}` : "/api/products"
  );

  const { data: categories, isLoading: categoriesLoading } = useEntityQuery<ProductCategory[]>("/api/product-categories");

  // Apply filters and sorting to products
  const filteredProducts = products?.filter(product => {
    // Category filter
    if (categoryFilter === "none") {
      if (product.categoryId) return false;
    } else if (categoryFilter !== "all") {
      if (product.categoryId !== categoryFilter) return false;
    }
    
    // Status filter
    if (statusFilter === "active" && !product.active) return false;
    if (statusFilter === "inactive" && product.active) return false;
    
    return true;
  }).sort((a, b) => {
    switch (sortOrder) {
      case "name-asc":
        return a.name.localeCompare(b.name, 'es');
      case "name-desc":
        return b.name.localeCompare(a.name, 'es');
      case "code-asc":
        return a.code.localeCompare(b.code, 'es');
      case "code-desc":
        return b.code.localeCompare(a.code, 'es');
      case "price-asc":
        return parseFloat(a.listPrice) - parseFloat(b.listPrice);
      case "price-desc":
        return parseFloat(b.listPrice) - parseFloat(a.listPrice);
      default:
        return 0;
    }
  });

  const createMutation = useEntityMutation<Product, InsertProduct>({
    endpoint: "/api/products",
    method: "POST",
    successMessage: t("products.created"),
    invalidateQueries: ["/api/products"],
    onSuccessCallback: () => {
      setDialogOpen(false);
      setEditingProduct(null);
    },
  });

  const updateMutation = useEntityMutation<Product, Partial<InsertProduct>>({
    endpoint: editingProduct ? `/api/products/${editingProduct.id}` : "",
    method: "PATCH",
    successMessage: t("products.updated"),
    invalidateQueries: ["/api/products"],
    onSuccessCallback: () => {
      setDialogOpen(false);
      setEditingProduct(null);
    },
  });

  const createCategoryMutation = useEntityMutation<ProductCategory, InsertProductCategory>({
    endpoint: "/api/product-categories",
    method: "POST",
    successMessage: t("products.category-created"),
    invalidateQueries: ["/api/product-categories"],
    onSuccessCallback: () => {
      setCategoryDialogOpen(false);
      setCategoryName("");
      setCategoryDescription("");
      setEditingCategory(null);
    },
  });

  const updateCategoryMutation = useEntityMutation<ProductCategory, Partial<InsertProductCategory>>({
    endpoint: editingCategory ? `/api/product-categories/${editingCategory.id}` : "",
    method: "PATCH",
    successMessage: t("products.category-updated"),
    invalidateQueries: ["/api/product-categories", "/api/products"],
    onSuccessCallback: () => {
      setCategoryDialogOpen(false);
      setCategoryName("");
      setCategoryDescription("");
      setEditingCategory(null);
    },
  });

  const [togglingCategoryId, setTogglingCategoryId] = useState<string | null>(null);

  const handleToggleCategory = async (category: ProductCategory) => {
    setTogglingCategoryId(category.id);
    try {
      await fetch(`/api/product-categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ active: !category.active }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    } finally {
      setTogglingCategoryId(null);
    }
  };

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

  const handleEditCategory = (category: ProductCategory) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || "");
    setCategoryDialogOpen(true);
  };

  const handleCategorySubmit = () => {
    if (!categoryName.trim()) return;
    
    const data: InsertProductCategory = {
      name: categoryName.trim(),
      description: categoryDescription.trim() || null,
    };

    if (editingCategory) {
      updateCategoryMutation.mutate(data);
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const openNewCategoryDialog = () => {
    setEditingCategory(null);
    setCategoryName("");
    setCategoryDescription("");
    setCategoryDialogOpen(true);
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
          <h1 className="text-3xl font-bold tracking-tight">{t("products.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("products.subtitle")}
          </p>
        </div>
      </div>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products" data-testid="tab-products">
            <Package className="h-4 w-4 mr-2" />
            {t("products.tab.products")}
          </TabsTrigger>
          <TabsTrigger value="categories" data-testid="tab-categories">
            <FolderOpen className="h-4 w-4 mr-2" />
            {t("products.tab.categories")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>{t("products.catalog")}</CardTitle>
                    <CardDescription>
                      {filteredProducts?.length || 0} {t("label.of")} {products?.length || 0} {t("products.count-noun")}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t("label.search")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                        data-testid="input-search-products"
                      />
                    </div>
                    {isAdmin && (
                      <Button onClick={() => { setEditingProduct(null); setDialogOpen(true); }} data-testid="button-add-product">
                        <Plus className="h-4 w-4 mr-2" />
                        {t("products.new")}
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
                      <SelectValue placeholder={t("label.category")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("products.all-categories")}</SelectItem>
                      <SelectItem value="none">{t("products.no-category")}</SelectItem>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                      <SelectValue placeholder={t("label.status")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("label.all")}</SelectItem>
                      <SelectItem value="active">{t("status.active")}</SelectItem>
                      <SelectItem value="inactive">{t("status.inactive")}</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger className="w-[160px]" data-testid="select-sort-order">
                      <SelectValue placeholder={t("products.sort-by")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name-asc">{t("products.sort.name-az")}</SelectItem>
                      <SelectItem value="name-desc">{t("products.sort.name-za")}</SelectItem>
                      <SelectItem value="code-asc">{t("products.sort.code-az")}</SelectItem>
                      <SelectItem value="code-desc">{t("products.sort.code-za")}</SelectItem>
                      <SelectItem value="price-asc">{t("products.sort.price-low")}</SelectItem>
                      <SelectItem value="price-desc">{t("products.sort.price-high")}</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {hasActiveFilters && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearFilters}
                      data-testid="button-clear-filters"
                    >
                      <X className="h-4 w-4 mr-1" />
                      {t("btn.clear-filters")}
                    </Button>
                  )}
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
              ) : filteredProducts && filteredProducts.length > 0 ? (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("products.col.code")}</TableHead>
                        <TableHead>{t("products.col.product")}</TableHead>
                        <TableHead>{t("products.col.category")}</TableHead>
                        <TableHead>{t("products.col.brand")}</TableHead>
                        <TableHead className="text-right">{t("products.col.list-price")}</TableHead>
                        <TableHead className="text-right">{t("products.col.stock")}</TableHead>
                        <TableHead>{t("label.status")}</TableHead>
                        {isAdmin && <TableHead className="text-right">{t("label.actions")}</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => (
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
                              <span className="text-muted-foreground">{t("products.no-category")}</span>
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
                              {product.active ? t("status.active") : t("status.inactive")}
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
                  <p className="text-muted-foreground">{t("products.no-results")}</p>
                  {isAdmin && (
                    <Button
                      className="mt-4"
                      onClick={() => { setEditingProduct(null); setDialogOpen(true); }}
                      data-testid="button-add-first-product"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t("products.add-first")}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>{t("products.categories-title")}</CardTitle>
                  <CardDescription>
                    {categories?.length || 0} {t("products.categories-registered")}
                  </CardDescription>
                </div>
                {isAdmin && (
                  <Button onClick={openNewCategoryDialog} data-testid="button-add-category">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("products.new-category")}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {categoriesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : categories && categories.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("label.name")}</TableHead>
                        <TableHead>{t("label.description")}</TableHead>
                        <TableHead>{t("label.status")}</TableHead>
                        {isAdmin && <TableHead className="text-right">{t("label.actions")}</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((category) => (
                        <TableRow key={category.id} className="hover-elevate" data-testid={`row-category-${category.id}`}>
                          <TableCell>
                            <div className={`font-medium ${!category.active ? "text-muted-foreground" : ""}`}>
                              {category.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">
                              {category.description || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={category.active ? "default" : "secondary"} data-testid={`status-category-${category.id}`}>
                              {category.active ? t("products.category-active") : t("products.category-inactive")}
                            </Badge>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleToggleCategory(category)}
                                  disabled={togglingCategoryId === category.id}
                                  title={category.active ? t("products.deactivate-category") : t("products.activate-category")}
                                  data-testid={`button-toggle-category-${category.id}`}
                                >
                                  {togglingCategoryId === category.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : category.active ? (
                                    <ToggleRight className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditCategory(category)}
                                  data-testid={`button-edit-category-${category.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">{t("products.no-categories")}</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("products.no-categories-hint")}
                  </p>
                  {isAdmin && (
                    <Button onClick={openNewCategoryDialog} data-testid="button-add-first-category">
                      <Plus className="h-4 w-4 mr-2" />
                      {t("products.create-first-category")}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? t("products.edit-category") : t("products.new-category")}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? t("products.edit-category-desc")
                : t("products.new-category-desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">{t("products.name-required")}</Label>
              <Input
                id="category-name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder={t("products.category-name-ph")}
                data-testid="input-category-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">{t("label.description")}</Label>
              <Textarea
                id="category-description"
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                placeholder={t("products.category-desc-ph")}
                data-testid="textarea-category-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCategoryDialogOpen(false)}
              data-testid="button-cancel-category"
            >
              {t("btn.cancel")}
            </Button>
            <Button
              onClick={handleCategorySubmit}
              disabled={!categoryName.trim() || createCategoryMutation.isPending || updateCategoryMutation.isPending}
              data-testid="button-save-category"
            >
              {(createCategoryMutation.isPending || updateCategoryMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingCategory ? t("btn.save-changes") : t("products.create-category")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
