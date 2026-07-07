import { useState, useRef } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { Document, Product, ProductCategory, UserRole } from "@shared/schema";
import { SearchCombobox } from "@/components/search-combobox";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient, getSelectedTenantId } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BookOpen,
  Plus,
  Search,
  Download,
  Trash2,
  FileText,
  Wrench,
  Loader2,
  Upload,
  X,
} from "lucide-react";

type DocumentType = "operativo" | "despiece";

const formatFileSize = (bytes?: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function DocumentsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === UserRole.ADMIN;

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);

  // Upload form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [docType, setDocType] = useState<DocumentType>("operativo");
  const [category, setCategory] = useState("");
  const [productId, setProductId] = useState<string>("none");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: productCategories } = useQuery<ProductCategory[]>({
    queryKey: ["/api/product-categories"],
  });

  const productMap = new Map((products ?? []).map((p) => [p.id, p]));

  const categoryOptions = (productCategories ?? [])
    .map((c) => ({ value: c.name, label: c.name }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));

  const productOptions = (products ?? []).map((p) => ({
    value: p.id,
    label: p.name,
    sublabel: p.code ?? undefined,
  }));

  const categories = Array.from(
    new Set((documents ?? []).map((d) => d.category).filter((c): c is string => !!c))
  ).sort((a, b) => a.localeCompare(b, "es"));

  const filteredDocuments = (documents ?? []).filter((doc) => {
    if (typeFilter !== "all" && doc.type !== typeFilter) return false;
    if (categoryFilter !== "all" && doc.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const product = doc.productId ? productMap.get(doc.productId) : null;
      const haystack = [
        doc.title,
        doc.description ?? "",
        doc.category ?? "",
        product?.name ?? "",
        product?.code ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDocType("operativo");
    setCategory("");
    setProductId("none");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && file.type !== "application/pdf") {
      toast({
        title: t("documents.error.notPdf"),
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file && file.size > 100 * 1024 * 1024) {
      toast({
        title: t("documents.error.tooLarge"),
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setSelectedFile(file);
    if (file && !title) {
      setTitle(file.name.replace(/\.pdf$/i, ""));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim()) return;
    setIsUploading(true);
    try {
      // Phase 1: request an upload URL
      const uploadRes = await apiRequest("POST", "/api/documents/upload", {});
      const { uploadURL, entityId, useDirectUpload } = await uploadRes.json();

      // Phase 2: upload the binary file
      const putHeaders: Record<string, string> = { "Content-Type": "application/pdf" };
      const putOptions: RequestInit = {
        method: "PUT",
        headers: putHeaders,
        body: selectedFile,
      };
      if (useDirectUpload) {
        putOptions.credentials = "include";
        const selectedTenantId = getSelectedTenantId();
        if (selectedTenantId) putHeaders["X-Selected-Tenant-Id"] = selectedTenantId;
      }
      const putRes = await fetch(uploadURL, putOptions);
      if (!putRes.ok) {
        throw new Error(await putRes.text());
      }

      // Phase 3: create the document record
      await apiRequest("POST", "/api/documents", {
        title: title.trim(),
        description: description.trim() || null,
        type: docType,
        category: category.trim() || null,
        productId: productId === "none" ? null : productId,
        fileUrl: entityId,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: t("documents.uploaded") });
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: t("documents.error.upload"),
        description: error?.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = (doc: Document) => {
    window.open(`/api/documents/${doc.id}/download`, "_blank");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiRequest("DELETE", `/api/documents/${deleteTarget.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: t("documents.deleted") });
      setDeleteTarget(null);
    } catch (error: any) {
      toast({
        title: t("documents.error.delete"),
        description: error?.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const typeBadge = (type: string) => {
    if (type === "despiece") {
      return (
        <Badge variant="secondary" className="gap-1" data-testid={`badge-type-${type}`}>
          <Wrench className="h-3 w-3" />
          {t("documents.type.despiece")}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1" data-testid={`badge-type-${type}`}>
        <FileText className="h-3 w-3" />
        {t("documents.type.operativo")}
      </Badge>
    );
  };

  const hasActiveFilters = typeFilter !== "all" || categoryFilter !== "all";

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold" data-testid="text-page-title">
              {t("documents.title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("documents.subtitle")}</p>
          </div>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
            data-testid="button-upload-document"
          >
            <Plus className="h-4 w-4" />
            {t("documents.upload")}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("documents.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-documents"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("documents.filter.allTypes")}</SelectItem>
                <SelectItem value="operativo">{t("documents.type.operativo")}</SelectItem>
                <SelectItem value="despiece">{t("documents.type.despiece")}</SelectItem>
              </SelectContent>
            </Select>
            {categories.length > 0 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-filter-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("documents.filter.allCategories")}</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTypeFilter("all");
                  setCategoryFilter("all");
                }}
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4" />
                {t("documents.filter.clear")}
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-2 py-12 text-center"
              data-testid="text-empty-documents"
            >
              <BookOpen className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("documents.empty")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("documents.col.title")}</TableHead>
                    <TableHead>{t("documents.col.type")}</TableHead>
                    <TableHead>{t("documents.col.category")}</TableHead>
                    <TableHead>{t("documents.col.product")}</TableHead>
                    <TableHead className="text-right">{t("documents.col.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => {
                    const product = doc.productId ? productMap.get(doc.productId) : null;
                    return (
                      <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                        <TableCell>
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium truncate" data-testid={`text-title-${doc.id}`}>
                                {doc.title}
                              </p>
                              {doc.description && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {doc.description}
                                </p>
                              )}
                              {doc.fileSize ? (
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(doc.fileSize)}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{typeBadge(doc.type)}</TableCell>
                        <TableCell>
                          {doc.category ? (
                            <span className="text-sm">{doc.category}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {product ? (
                            <span className="text-sm" data-testid={`text-product-${doc.id}`}>
                              {product.code} · {product.name}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownload(doc)}
                              data-testid={`button-download-${doc.id}`}
                              title={t("documents.download")}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteTarget(doc)}
                                data-testid={`button-delete-${doc.id}`}
                                title={t("documents.delete")}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !isUploading && setDialogOpen(open)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("documents.upload")}</DialogTitle>
            <DialogDescription>{t("documents.upload.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("documents.field.file")}</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                className="hidden"
                data-testid="input-file"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-select-file"
              >
                <Upload className="h-4 w-4" />
                {selectedFile ? selectedFile.name : t("documents.field.selectFile")}
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-title">{t("documents.field.title")}</Label>
              <Input
                id="doc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                data-testid="input-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-description">{t("documents.field.description")}</Label>
              <Textarea
                id="doc-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                data-testid="input-description"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("documents.field.type")}</Label>
                <Select value={docType} onValueChange={(v) => setDocType(v as DocumentType)}>
                  <SelectTrigger data-testid="select-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operativo">{t("documents.type.operativo")}</SelectItem>
                    <SelectItem value="despiece">{t("documents.type.despiece")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-category">{t("documents.field.category")}</Label>
                <SearchCombobox
                  options={categoryOptions}
                  value={category}
                  onValueChange={setCategory}
                  placeholder={t("documents.field.categoryPlaceholder")}
                  searchPlaceholder={t("documents.field.categorySearch")}
                  emptyMessage={t("documents.field.categoryEmpty")}
                  moreResultsLabel={t("documents.field.moreResults")}
                  data-testid="select-category"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("documents.field.product")}</Label>
              <SearchCombobox
                options={[
                  { value: "none", label: t("documents.field.noProduct") },
                  ...productOptions,
                ]}
                value={productId}
                onValueChange={setProductId}
                placeholder={t("documents.field.noProduct")}
                searchPlaceholder={t("documents.field.productSearch")}
                emptyMessage={t("documents.field.productEmpty")}
                moreResultsLabel={t("documents.field.moreResults")}
                data-testid="select-product"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isUploading}
              data-testid="button-cancel-upload"
            >
              {t("documents.cancel")}
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isUploading || !selectedFile || !title.trim()}
              data-testid="button-confirm-upload"
            >
              {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("documents.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("documents.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("documents.delete.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} data-testid="button-cancel-delete">
              {t("documents.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              data-testid="button-confirm-delete"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("documents.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
