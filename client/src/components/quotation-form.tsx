import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertQuotationSchema, InsertQuotation, QuotationStatus, Product, ProductCategory, InsertQuotationItem } from "@shared/schema";
import { z } from "zod";
import { useState, useEffect, useCallback } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Search, AlertTriangle, Calculator } from "lucide-react";
import { useEntityQuery } from "@/hooks/use-entity-query";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type ProductWithCategory = Product & { category?: ProductCategory | null };

interface QuotationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertQuotation & { items: InsertQuotationItem[] }) => void;
  isPending: boolean;
  onCancel?: () => void;
  customers?: Array<{ id: string; name: string }>;
  userId?: string;
  initialData?: any;
  isEditing?: boolean;
}

interface QuotationLineItem {
  productId: string | null;
  productCode: string;
  productName: string;
  description: string;
  unitOfMeasure: string;
  quantity: string;
  listPrice: string;
  unitPrice: string;
  discountPercent: string;
  discountAmount: string;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  exceedsMaxDiscount: boolean;
  maxDiscount: string;
  position: number;
}

const PAYMENT_TERMS = [
  { value: "contado", label: "Contado" },
  { value: "15_dias", label: "15 días" },
  { value: "30_dias", label: "30 días" },
  { value: "45_dias", label: "45 días" },
  { value: "60_dias", label: "60 días" },
];

const DELIVERY_TIMES = [
  { value: "inmediato", label: "Inmediato" },
  { value: "1_semana", label: "1 semana" },
  { value: "2_semanas", label: "2 semanas" },
  { value: "3_semanas", label: "3 semanas" },
  { value: "1_mes", label: "1 mes" },
  { value: "por_confirmar", label: "Por confirmar" },
];

const CURRENCIES = [
  { value: "MXN", label: "MXN - Peso Mexicano" },
  { value: "USD", label: "USD - Dólar Americano" },
];

const quotationFormSchema = z.object({
  customerId: z.string().min(1, "Selecciona un cliente"),
  currency: z.string().default("MXN"),
  paymentTerms: z.string().optional(),
  deliveryTime: z.string().optional(),
  validUntil: z.string().optional(),
  globalDiscount: z.string().default("0"),
  notes: z.string().optional(),
  conditions: z.string().optional(),
});

type QuotationFormData = z.infer<typeof quotationFormSchema>;

const createEmptyLineItem = (position: number): QuotationLineItem => ({
  productId: null,
  productCode: "",
  productName: "",
  description: "",
  unitOfMeasure: "PZA",
  quantity: "1",
  listPrice: "0",
  unitPrice: "0",
  discountPercent: "0",
  discountAmount: "0",
  subtotal: "0",
  taxRate: "16",
  taxAmount: "0",
  total: "0",
  exceedsMaxDiscount: false,
  maxDiscount: "0",
  position,
});

export function QuotationForm({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isPending, 
  onCancel,
  customers = [],
  userId,
  initialData,
  isEditing = false,
}: QuotationFormProps) {
  const [lineItems, setLineItems] = useState<QuotationLineItem[]>([createEmptyLineItem(0)]);
  const [productSearchOpen, setProductSearchOpen] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [initialized, setInitialized] = useState(false);

  const { data: products } = useEntityQuery<ProductWithCategory[]>(
    searchQuery ? `/api/products?q=${encodeURIComponent(searchQuery)}` : "/api/products"
  );

  const form = useForm<QuotationFormData>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      customerId: "",
      currency: "MXN",
      paymentTerms: "",
      deliveryTime: "",
      validUntil: "",
      globalDiscount: "0",
      notes: "",
      conditions: "",
    },
  });

  useEffect(() => {
    if (isEditing && initialData && open && !initialized) {
      form.reset({
        customerId: initialData.customerId || "",
        currency: initialData.currency || "MXN",
        paymentTerms: initialData.paymentTerms || "",
        deliveryTime: initialData.deliveryTime || "",
        validUntil: initialData.validUntil ? new Date(initialData.validUntil).toISOString().split('T')[0] : "",
        globalDiscount: initialData.globalDiscount || "0",
        notes: initialData.notes || "",
        conditions: initialData.conditions || "",
      });

      if (initialData.items && initialData.items.length > 0) {
        const items: QuotationLineItem[] = initialData.items.map((item: any, index: number) => ({
          productId: item.productId || null,
          productCode: item.productCode || "",
          productName: item.productName || "",
          description: item.description || "",
          unitOfMeasure: item.unitOfMeasure || "PZA",
          quantity: item.quantity?.toString() || "1",
          listPrice: item.listPrice?.toString() || "0",
          unitPrice: item.unitPrice?.toString() || "0",
          discountPercent: item.discountPercent?.toString() || "0",
          discountAmount: item.discountAmount?.toString() || "0",
          subtotal: item.subtotal?.toString() || "0",
          taxRate: item.taxRate?.toString() || "16",
          taxAmount: item.taxAmount?.toString() || "0",
          total: item.total?.toString() || "0",
          exceedsMaxDiscount: false,
          maxDiscount: "0",
          position: item.position ?? index,
        }));
        setLineItems(items);
      }
      setInitialized(true);
    }
  }, [isEditing, initialData, open, form, initialized]);

  useEffect(() => {
    if (!open) {
      setInitialized(false);
      if (!isEditing) {
        form.reset({
          customerId: "",
          currency: "MXN",
          paymentTerms: "",
          deliveryTime: "",
          validUntil: "",
          globalDiscount: "0",
          notes: "",
          conditions: "",
        });
        setLineItems([createEmptyLineItem(0)]);
      }
    }
  }, [open, form, isEditing]);

  const calculateLineItem = useCallback((item: QuotationLineItem, field: 'discountPercent' | 'unitPrice'): QuotationLineItem => {
    const quantity = parseFloat(item.quantity) || 0;
    const listPrice = parseFloat(item.listPrice) || 0;
    const taxRate = parseFloat(item.taxRate) || 16;
    const maxDiscount = parseFloat(item.maxDiscount) || 0;

    let unitPrice: number;
    let discountPercent: number;
    let discountAmount: number;

    if (field === 'discountPercent') {
      discountPercent = Math.min(parseFloat(item.discountPercent) || 0, 100);
      discountAmount = listPrice * (discountPercent / 100);
      unitPrice = listPrice - discountAmount;
    } else {
      unitPrice = parseFloat(item.unitPrice) || 0;
      discountAmount = listPrice - unitPrice;
      discountPercent = listPrice > 0 ? (discountAmount / listPrice) * 100 : 0;
    }

    const subtotal = quantity * unitPrice;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    const exceedsMaxDiscount = discountPercent > maxDiscount;

    return {
      ...item,
      unitPrice: unitPrice.toFixed(2),
      discountPercent: discountPercent.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
      exceedsMaxDiscount,
    };
  }, []);

  const updateLineItem = useCallback((index: number, updates: Partial<QuotationLineItem>, recalculateFrom?: 'discountPercent' | 'unitPrice') => {
    setLineItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], ...updates };
      
      if (recalculateFrom) {
        newItems[index] = calculateLineItem(newItems[index], recalculateFrom);
      }
      
      return newItems;
    });
  }, [calculateLineItem]);

  const addProduct = useCallback((index: number, product: ProductWithCategory) => {
    const newItem: QuotationLineItem = {
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      description: product.description || "",
      unitOfMeasure: product.unitOfMeasure,
      quantity: "1",
      listPrice: product.listPrice,
      unitPrice: product.listPrice,
      discountPercent: "0",
      discountAmount: "0",
      subtotal: product.listPrice,
      taxRate: product.taxRate,
      taxAmount: (parseFloat(product.listPrice) * (parseFloat(product.taxRate) / 100)).toFixed(2),
      total: (parseFloat(product.listPrice) * (1 + parseFloat(product.taxRate) / 100)).toFixed(2),
      exceedsMaxDiscount: false,
      maxDiscount: product.maxDiscount || "0",
      position: index,
    };

    setLineItems(prev => {
      const newItems = [...prev];
      newItems[index] = newItem;
      return newItems;
    });
    setProductSearchOpen(null);
    setSearchQuery("");
  }, []);

  const addNewLine = useCallback(() => {
    setLineItems(prev => [...prev, createEmptyLineItem(prev.length)]);
  }, []);

  const removeLine = useCallback((index: number) => {
    setLineItems(prev => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, position: i }));
    });
  }, []);

  const calculateTotals = useCallback(() => {
    const globalDiscountPercent = parseFloat(form.watch("globalDiscount")) || 0;
    
    const subtotalBeforeDiscount = lineItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
    const totalTax = lineItems.reduce((sum, item) => sum + parseFloat(item.taxAmount), 0);
    const globalDiscountAmount = subtotalBeforeDiscount * (globalDiscountPercent / 100);
    const subtotalAfterDiscount = subtotalBeforeDiscount - globalDiscountAmount;
    const adjustedTax = totalTax * (1 - globalDiscountPercent / 100);
    const total = subtotalAfterDiscount + adjustedTax;
    const totalSavings = lineItems.reduce((sum, item) => 
      sum + (parseFloat(item.quantity) * parseFloat(item.discountAmount)), 0) + globalDiscountAmount;

    return {
      subtotal: subtotalBeforeDiscount.toFixed(2),
      globalDiscountAmount: globalDiscountAmount.toFixed(2),
      tax: adjustedTax.toFixed(2),
      total: total.toFixed(2),
      totalSavings: totalSavings.toFixed(2),
    };
  }, [lineItems, form]);

  const totals = calculateTotals();

  const hasExceedingDiscounts = lineItems.some(item => item.exceedsMaxDiscount && item.productId);

  const handleSubmit = (data: QuotationFormData) => {
    const items: InsertQuotationItem[] = lineItems
      .filter(item => item.productName)
      .map(item => ({
        quotationId: "", // Will be set by backend
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        description: item.description || null,
        unitOfMeasure: item.unitOfMeasure,
        quantity: item.quantity,
        listPrice: item.listPrice,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        discountAmount: item.discountAmount,
        subtotal: item.subtotal,
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
        total: item.total,
        exceedsMaxDiscount: item.exceedsMaxDiscount,
        position: item.position,
      }));

    const quotationData: InsertQuotation & { items: InsertQuotationItem[] } = {
      customerId: data.customerId,
      userId: userId || "",
      status: hasExceedingDiscounts ? QuotationStatus.PENDING_APPROVAL : QuotationStatus.DRAFT,
      currency: data.currency,
      paymentTerms: data.paymentTerms || null,
      deliveryTime: data.deliveryTime || null,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      subtotal: totals.subtotal,
      globalDiscount: data.globalDiscount,
      tax: totals.tax,
      total: totals.total,
      totalSavings: totals.totalSavings,
      notes: data.notes || null,
      conditions: data.conditions || null,
      requiresApproval: hasExceedingDiscounts,
      approvalReason: hasExceedingDiscounts ? "Descuentos exceden el máximo permitido" : null,
      items,
    };

    onSubmit(quotationData);
  };

  const handleCancel = () => {
    form.reset();
    setLineItems([createEmptyLineItem(0)]);
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return num.toLocaleString("es-MX", {
      style: "currency",
      currency: form.watch("currency") || "MXN",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Cotización" : "Nueva Cotización"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Modifica los datos de la cotización y sus productos" 
              : "Crea una cotización agregando productos y configurando términos comerciales"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-customer">
                              <SelectValue placeholder="Seleccionar cliente" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {customers.map((customer) => (
                              <SelectItem 
                                key={customer.id} 
                                value={customer.id}
                                data-testid={`option-customer-${customer.id}`}
                              >
                                {customer.name}
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
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Moneda</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-currency">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CURRENCIES.map((curr) => (
                              <SelectItem key={curr.value} value={curr.value}>
                                {curr.label}
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
                    name="validUntil"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vigencia</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            data-testid="input-valid-until"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="paymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Términos de Pago</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-terms">
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PAYMENT_TERMS.map((term) => (
                              <SelectItem key={term.value} value={term.value}>
                                {term.label}
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
                    name="deliveryTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tiempo de Entrega</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-delivery-time">
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DELIVERY_TIMES.map((time) => (
                              <SelectItem key={time.value} value={time.value}>
                                {time.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Productos</CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addNewLine}
                        data-testid="button-add-line"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar Línea
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">Producto</TableHead>
                            <TableHead className="w-[80px] text-center">Cant.</TableHead>
                            <TableHead className="w-[100px] text-right">P. Lista</TableHead>
                            <TableHead className="w-[80px] text-center">Desc %</TableHead>
                            <TableHead className="w-[100px] text-right">P. Unitario</TableHead>
                            <TableHead className="w-[100px] text-right">Subtotal</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lineItems.map((item, index) => (
                            <TableRow key={index} className={item.exceedsMaxDiscount ? "bg-destructive/10" : ""}>
                              <TableCell>
                                <Popover 
                                  open={productSearchOpen === index} 
                                  onOpenChange={(open) => {
                                    setProductSearchOpen(open ? index : null);
                                    if (!open) setSearchQuery("");
                                  }}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className="w-full justify-start text-left font-normal h-auto min-h-9 py-1"
                                      data-testid={`button-select-product-${index}`}
                                    >
                                      {item.productName ? (
                                        <div className="flex flex-col items-start">
                                          <span className="font-medium text-xs">{item.productCode}</span>
                                          <span className="text-sm truncate max-w-[160px]">{item.productName}</span>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground flex items-center gap-1">
                                          <Search className="h-3 w-3" />
                                          Buscar producto...
                                        </span>
                                      )}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[300px] p-0" align="start">
                                    <Command>
                                      <CommandInput 
                                        placeholder="Buscar por código o nombre..." 
                                        value={searchQuery}
                                        onValueChange={setSearchQuery}
                                        data-testid={`input-search-product-${index}`}
                                      />
                                      <CommandList>
                                        <CommandEmpty>No se encontraron productos</CommandEmpty>
                                        <CommandGroup>
                                          {products?.slice(0, 10).map((product) => (
                                            <CommandItem
                                              key={product.id}
                                              onSelect={() => addProduct(index, product)}
                                              data-testid={`option-product-${product.id}`}
                                            >
                                              <div className="flex flex-col">
                                                <span className="font-medium">{product.code}</span>
                                                <span className="text-sm text-muted-foreground">{product.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                  {formatCurrency(product.listPrice)} | Max desc: {product.maxDiscount}%
                                                </span>
                                              </div>
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                                {item.exceedsMaxDiscount && (
                                  <div className="flex items-center gap-1 mt-1 text-destructive text-xs">
                                    <AlertTriangle className="h-3 w-3" />
                                    Excede máximo ({item.maxDiscount}%)
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    updateLineItem(index, { quantity: e.target.value }, 'discountPercent');
                                  }}
                                  className="w-20 text-center"
                                  data-testid={`input-quantity-${index}`}
                                />
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {formatCurrency(item.listPrice)}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={item.discountPercent}
                                  onChange={(e) => {
                                    updateLineItem(index, { discountPercent: e.target.value }, 'discountPercent');
                                  }}
                                  className={`w-20 text-center ${item.exceedsMaxDiscount ? "border-destructive" : ""}`}
                                  data-testid={`input-discount-${index}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => {
                                    updateLineItem(index, { unitPrice: e.target.value }, 'unitPrice');
                                  }}
                                  className="w-24 text-right font-mono"
                                  data-testid={`input-unit-price-${index}`}
                                />
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm font-medium">
                                {formatCurrency(item.subtotal)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeLine(index)}
                                  disabled={lineItems.length === 1}
                                  data-testid={`button-remove-line-${index}`}
                                >
                                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notas</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Notas adicionales para el cliente..."
                              rows={3}
                              data-testid="textarea-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="conditions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Condiciones</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Condiciones comerciales..."
                              rows={3}
                              data-testid="textarea-conditions"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Resumen
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span className="font-mono">{formatCurrency(totals.subtotal)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm gap-2">
                        <span>Descuento Global:</span>
                        <div className="flex items-center gap-2">
                          <FormField
                            control={form.control}
                            name="globalDiscount"
                            render={({ field }) => (
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                {...field}
                                className="w-16 h-7 text-center text-sm"
                                data-testid="input-global-discount"
                              />
                            )}
                          />
                          <span>%</span>
                          <span className="font-mono text-destructive">
                            -{formatCurrency(totals.globalDiscountAmount)}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span>IVA:</span>
                        <span className="font-mono">{formatCurrency(totals.tax)}</span>
                      </div>

                      <Separator />

                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span className="font-mono">{formatCurrency(totals.total)}</span>
                      </div>

                      {parseFloat(totals.totalSavings) > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Ahorro Total:</span>
                          <span className="font-mono">{formatCurrency(totals.totalSavings)}</span>
                        </div>
                      )}

                      {hasExceedingDiscounts && (
                        <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                          <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                            <AlertTriangle className="h-4 w-4" />
                            Requiere Aprobación
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Algunos descuentos exceden el máximo permitido. La cotización será enviada para autorización.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </ScrollArea>

            <Separator className="my-4" />

            <div className="flex justify-between items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {lineItems.filter(i => i.productName).length} producto(s) | Total: {formatCurrency(totals.total)}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isPending}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isPending || lineItems.filter(i => i.productName).length === 0}
                  data-testid="button-submit"
                >
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {hasExceedingDiscounts ? "Enviar a Autorización" : "Guardar Cotización"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
