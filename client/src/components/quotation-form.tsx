import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertQuotationSchema, InsertQuotation, QuotationStatus, Product, ProductCategory, InsertQuotationItem } from "@shared/schema";
import { z } from "zod";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2, Search, AlertTriangle, Calculator, Truck } from "lucide-react";
import { useEntityQuery } from "@/hooks/use-entity-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CustomerCombobox } from "@/components/customer-combobox";
import { Customer } from "@shared/schema";

type ProductWithCategory = Product & { category?: ProductCategory | null };

interface QuotationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertQuotation & { items: InsertQuotationItem[] }) => void;
  isPending: boolean;
  onCancel?: () => void;
  customers?: Customer[];
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
  currency: string;
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
  shippingHandledByJoper: z.boolean().default(false),
  shippingMethod: z.string().default("truck"), // truck (camión), parcel (paquetería)
  requiresPallet: z.boolean().default(false),
  shippingNotes: z.string().optional(), // Notas de envío (no van en la cotización)
  shippingCost: z.string().default("0"),
  shippingCostStatus: z.string().default("confirmed"),
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
  currency: "MXN",
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
  const [productCategoryFilter, setProductCategoryFilter] = useState("");
  const [initialized, setInitialized] = useState(false);
  const saveAsDraftRef = useRef(false);

  const { data: products, isLoading: productsLoading } = useEntityQuery<ProductWithCategory[]>(
    searchQuery ? `/api/products?q=${encodeURIComponent(searchQuery)}` : "/api/products"
  );

  const { data: categories } = useEntityQuery<ProductCategory[]>("/api/product-categories");

  const normalizeStr = (str: string) =>
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const displayedProducts = useMemo(() => {
    if (!products) return [];
    let list = products;
    if (productCategoryFilter) {
      list = list.filter(p => p.categoryId === productCategoryFilter);
    }
    return list.slice(0, 150);
  }, [products, productCategoryFilter]);

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
      shippingHandledByJoper: false,
      shippingMethod: "truck",
      requiresPallet: false,
      shippingNotes: "",
      shippingCost: "0",
      shippingCostStatus: "confirmed",
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
        shippingHandledByJoper: initialData.shippingHandledByJoper || false,
        shippingMethod: initialData.shippingMethod || "truck",
        requiresPallet: initialData.requiresPallet || false,
        shippingNotes: initialData.shippingNotes || "",
        shippingCost: initialData.shippingCost || "0",
        shippingCostStatus: initialData.shippingCostStatus || "confirmed",
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
          currency: item.currency || "MXN",
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
          shippingHandledByJoper: false,
          shippingMethod: "truck",
          requiresPallet: false,
          shippingNotes: "",
          shippingCost: "0",
          shippingCostStatus: "confirmed",
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

  const normalizeDecimal = (value: string) => value.replace(',', '.');

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
    const DEFAULT_DISCOUNT = 47;
    const listPrice = parseFloat(product.listPrice);
    const maxDiscount = parseFloat(product.maxDiscount || "0");
    const discountPercent = Math.min(DEFAULT_DISCOUNT, maxDiscount > 0 ? maxDiscount : DEFAULT_DISCOUNT);
    const discountAmount = listPrice * (discountPercent / 100);
    const unitPrice = listPrice - discountAmount;
    const quantity = 1;
    const subtotal = unitPrice * quantity;
    const taxRate = parseFloat(product.taxRate);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    const exceedsMaxDiscount = maxDiscount > 0 && discountPercent > maxDiscount;

    const newItem: QuotationLineItem = {
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      description: product.description || "",
      unitOfMeasure: product.unitOfMeasure,
      quantity: quantity.toString(),
      listPrice: product.listPrice,
      unitPrice: unitPrice.toFixed(2),
      discountPercent: discountPercent.toString(),
      discountAmount: discountAmount.toFixed(2),
      subtotal: subtotal.toFixed(2),
      taxRate: product.taxRate,
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
      exceedsMaxDiscount,
      maxDiscount: product.maxDiscount || "0",
      position: index,
      currency: "MXN",
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

    const mxnItems = lineItems.filter(item => item.currency === "MXN" && item.productName);
    const usdItems = lineItems.filter(item => item.currency === "USD" && item.productName);
    
    const mxnSubtotal = mxnItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
    const mxnTax = mxnItems.reduce((sum, item) => sum + parseFloat(item.taxAmount), 0);
    const mxnTotal = (mxnSubtotal + mxnTax) * (1 - globalDiscountPercent / 100);
    
    const usdSubtotal = usdItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
    const usdTax = usdItems.reduce((sum, item) => sum + parseFloat(item.taxAmount), 0);
    const usdTotal = (usdSubtotal + usdTax) * (1 - globalDiscountPercent / 100);
    
    const hasMixedCurrencies = mxnItems.length > 0 && usdItems.length > 0;

    return {
      subtotal: subtotalBeforeDiscount.toFixed(2),
      globalDiscountAmount: globalDiscountAmount.toFixed(2),
      tax: adjustedTax.toFixed(2),
      total: total.toFixed(2),
      totalSavings: totalSavings.toFixed(2),
      mxnTotal: mxnTotal.toFixed(2),
      usdTotal: usdTotal.toFixed(2),
      hasMixedCurrencies,
    };
  }, [lineItems, form]);

  const totals = calculateTotals();

  const hasExceedingDiscounts = lineItems.some(item => item.exceedsMaxDiscount && item.productId);

  // Calculate global discount from desired total
  const handleTotalChange = useCallback((desiredTotal: string) => {
    const targetTotal = parseFloat(desiredTotal) || 0;
    const shippingCost = form.watch("shippingHandledByJoper") || form.watch("shippingCostStatus") === "pending"
      ? 0
      : parseFloat(form.watch("shippingCost") || "0");
    
    // Target total without shipping
    const targetTotalWithoutShipping = targetTotal - shippingCost;
    
    // Subtotal before any global discount
    const subtotalBeforeDiscount = lineItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
    const totalTax = lineItems.reduce((sum, item) => sum + parseFloat(item.taxAmount), 0);
    
    if (subtotalBeforeDiscount <= 0) return;
    
    // Formula: targetTotal = subtotal * (1 - globalDiscount/100) + tax * (1 - globalDiscount/100)
    // targetTotal = (subtotal + tax) * (1 - globalDiscount/100)
    // globalDiscount/100 = 1 - targetTotal / (subtotal + tax)
    // globalDiscount = 100 * (1 - targetTotal / (subtotal + tax))
    
    const subtotalPlusTax = subtotalBeforeDiscount + totalTax;
    
    if (subtotalPlusTax <= 0) return;
    
    const calculatedDiscount = 100 * (1 - targetTotalWithoutShipping / subtotalPlusTax);
    
    // Clamp between 0 and 100
    const finalDiscount = Math.max(0, Math.min(100, calculatedDiscount));
    
    form.setValue("globalDiscount", finalDiscount.toFixed(2));
  }, [form, lineItems]);

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
        currency: item.currency,
      }));

    // Determine if requires approval (either for discounts or free shipping by Joper)
    const requiresFreeShippingApproval = data.shippingHandledByJoper;
    const requiresAnyApproval = hasExceedingDiscounts || requiresFreeShippingApproval;
    
    // Build approval reason
    let approvalReason = null;
    if (hasExceedingDiscounts && requiresFreeShippingApproval) {
      approvalReason = "Descuentos exceden el máximo permitido y envío sin costo por cuenta de Joper";
    } else if (hasExceedingDiscounts) {
      approvalReason = "Descuentos exceden el máximo permitido";
    } else if (requiresFreeShippingApproval) {
      approvalReason = "Envío sin costo por cuenta de Joper requiere autorización";
    }

    const quotationData: InsertQuotation & { items: InsertQuotationItem[] } = {
      customerId: data.customerId,
      userId: userId || "",
      status: (!saveAsDraftRef.current && requiresAnyApproval) ? QuotationStatus.PENDING_APPROVAL : QuotationStatus.DRAFT,
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
      requiresApproval: !saveAsDraftRef.current && requiresAnyApproval,
      approvalReason: saveAsDraftRef.current ? null : approvalReason,
      shippingHandledByJoper: data.shippingHandledByJoper,
      shippingMethod: data.shippingMethod,
      requiresPallet: data.requiresPallet,
      shippingNotes: data.shippingNotes || null,
      shippingCost: data.shippingCost,
      shippingCostStatus: data.shippingCostStatus,
      shippingApprovalStatus: data.shippingHandledByJoper ? "pending" : "not_required",
      items,
    };

    onSubmit(quotationData);
    saveAsDraftRef.current = false;
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
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isEditing ? "Editar Cotización" : "Nueva Cotización"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Modifica los datos de la cotización y sus productos" 
              : "Crea una cotización agregando productos y configurando términos comerciales"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 pr-4 min-h-0">
              <div className="space-y-6 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente *</FormLabel>
                        <FormControl>
                          <CustomerCombobox
                            customers={customers}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Buscar cliente..."
                            data-testid="select-customer"
                          />
                        </FormControl>
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

                {/* Shipping Section - Visible early in the form */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Envío
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="shippingHandledByJoper"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                field.onChange(checked);
                                if (checked) {
                                  form.setValue("shippingCost", "0");
                                }
                              }}
                              data-testid="checkbox-shipping-joper"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="cursor-pointer">
                              Envío por cuenta de Joper (sin costo al cliente)
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">
                              Requiere autorización del administrador antes de enviar al cliente
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="shippingMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Método de Envío</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-shipping-method">
                                  <SelectValue placeholder="Seleccionar método" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="truck">Camión</SelectItem>
                                <SelectItem value="parcel">Paquetería</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="requiresPallet"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0 md:mt-8">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-requires-pallet"
                              />
                            </FormControl>
                            <FormLabel className="cursor-pointer text-sm font-normal">
                              Requiere pallet
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="shippingNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notas de Envío (uso interno)</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Notas internas sobre el envío (no se muestran en la cotización)"
                              className="resize-none min-h-[60px]"
                              data-testid="textarea-shipping-notes"
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Estas notas no aparecen en la cotización enviada al cliente
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {!form.watch("shippingHandledByJoper") && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="shippingCost"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Costo de Envío</FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  {...field}
                                  onChange={(e) => field.onChange(normalizeDecimal(e.target.value))}
                                  disabled={form.watch("shippingCostStatus") === "pending"}
                                  placeholder="0.00"
                                  data-testid="input-shipping-cost"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="shippingCostStatus"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 md:mt-8">
                              <FormControl>
                                <Checkbox
                                  checked={field.value === "pending"}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked ? "pending" : "confirmed");
                                    if (checked) {
                                      form.setValue("shippingCost", "0");
                                    }
                                  }}
                                  data-testid="checkbox-shipping-pending"
                                />
                              </FormControl>
                              <FormLabel className="cursor-pointer text-sm font-normal">
                                Costo pendiente por cotizar
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

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
                            <TableHead className="w-[80px] text-center">Moneda</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lineItems.map((item, index) => (
                            <TableRow key={index} className={item.exceedsMaxDiscount ? "bg-destructive/10" : ""}>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-start text-left font-normal h-auto min-h-9 py-1"
                                  data-testid={`button-select-product-${index}`}
                                  onClick={() => {
                                    setProductSearchOpen(index);
                                    setSearchQuery("");
                                    setProductCategoryFilter("");
                                  }}
                                >
                                  {item.productName ? (
                                    <div className="flex flex-col items-start">
                                      <span className="font-medium text-xs">{item.productCode}</span>
                                      <span className="text-sm truncate max-w-[180px]">{item.productName}</span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground flex items-center gap-1">
                                      <Search className="h-3 w-3" />
                                      Buscar producto...
                                    </span>
                                  )}
                                </Button>
                                {item.exceedsMaxDiscount && (
                                  <div className="flex items-center gap-1 mt-1 text-destructive text-xs">
                                    <AlertTriangle className="h-3 w-3" />
                                    Excede máximo ({item.maxDiscount}%)
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    updateLineItem(index, { quantity: normalizeDecimal(e.target.value) });
                                  }}
                                  onBlur={() => {
                                    updateLineItem(index, {}, 'discountPercent');
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
                                  type="text"
                                  inputMode="decimal"
                                  value={item.discountPercent}
                                  onChange={(e) => {
                                    updateLineItem(index, { discountPercent: normalizeDecimal(e.target.value) });
                                  }}
                                  onBlur={() => {
                                    updateLineItem(index, {}, 'discountPercent');
                                  }}
                                  className={`w-16 text-center ${item.exceedsMaxDiscount ? "border-destructive" : ""}`}
                                  data-testid={`input-discount-${index}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={item.unitPrice}
                                  onChange={(e) => {
                                    updateLineItem(index, { unitPrice: normalizeDecimal(e.target.value) });
                                  }}
                                  onBlur={() => {
                                    updateLineItem(index, {}, 'unitPrice');
                                  }}
                                  className="w-24 text-right font-mono"
                                  data-testid={`input-unit-price-${index}`}
                                />
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm font-medium">
                                {formatCurrency(item.subtotal)}
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={item.currency}
                                  onValueChange={(value) => updateLineItem(index, { currency: value })}
                                >
                                  <SelectTrigger className="w-[70px] h-8" data-testid={`select-currency-${index}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="MXN">MXN</SelectItem>
                                    <SelectItem value="USD">USD</SelectItem>
                                  </SelectContent>
                                </Select>
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
                                type="text"
                                inputMode="decimal"
                                {...field}
                                onChange={(e) => field.onChange(normalizeDecimal(e.target.value))}
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

                      <div className="flex justify-between text-sm">
                        <span>Envío:</span>
                        <span className="font-mono">
                          {form.watch("shippingHandledByJoper") 
                            ? "$0.00 (Joper)" 
                            : form.watch("shippingCostStatus") === "pending"
                              ? "Por cotizar"
                              : formatCurrency(form.watch("shippingCost") || "0")}
                        </span>
                      </div>

                      <Separator />

                      <div className="flex justify-between items-center text-lg font-bold gap-2">
                        <span>Total:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">$</span>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={(parseFloat(totals.total) + 
                              (form.watch("shippingHandledByJoper") || form.watch("shippingCostStatus") === "pending" 
                                ? 0 
                                : parseFloat(form.watch("shippingCost") || "0"))
                            ).toFixed(2)}
                            onChange={(e) => handleTotalChange(normalizeDecimal(e.target.value))}
                            className="w-28 h-8 text-right font-mono font-bold"
                            data-testid="input-total"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Edita el total para ajustar el descuento global automáticamente
                      </p>

                      {parseFloat(totals.totalSavings) > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Ahorro Total:</span>
                          <span className="font-mono">{formatCurrency(totals.totalSavings)}</span>
                        </div>
                      )}

                      {totals.hasMixedCurrencies && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Totales por Moneda:</p>
                          <div className="flex justify-between text-sm">
                            <span>Total MXN:</span>
                            <span className="font-mono font-medium">${parseFloat(totals.mxnTotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Total USD:</span>
                            <span className="font-mono font-medium">${parseFloat(totals.usdTotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })} USD</span>
                          </div>
                        </div>
                      )}

                      {(hasExceedingDiscounts || form.watch("shippingHandledByJoper")) && (
                        <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                          <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                            <AlertTriangle className="h-4 w-4" />
                            Requiere Aprobación
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {hasExceedingDiscounts && form.watch("shippingHandledByJoper")
                              ? "Descuentos exceden el máximo y envío sin costo requiere autorización."
                              : hasExceedingDiscounts
                                ? "Algunos descuentos exceden el máximo permitido."
                                : "Envío sin costo por cuenta de Joper requiere autorización del administrador."}
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
                  variant="outline"
                  disabled={isPending || lineItems.filter(i => i.productName).length === 0}
                  onClick={() => { saveAsDraftRef.current = true; }}
                  data-testid="button-save-draft"
                >
                  {isPending && saveAsDraftRef.current && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar Borrador
                </Button>
                {(hasExceedingDiscounts || form.watch("shippingHandledByJoper")) && (
                  <Button
                    type="submit"
                    disabled={isPending || lineItems.filter(i => i.productName).length === 0}
                    onClick={() => { saveAsDraftRef.current = false; }}
                    data-testid="button-submit"
                  >
                    {isPending && !saveAsDraftRef.current && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enviar a Autorización
                  </Button>
                )}
                {!hasExceedingDiscounts && !form.watch("shippingHandledByJoper") && (
                  <Button
                    type="submit"
                    disabled={isPending || lineItems.filter(i => i.productName).length === 0}
                    onClick={() => { saveAsDraftRef.current = false; }}
                    data-testid="button-submit"
                  >
                    {isPending && !saveAsDraftRef.current && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Cotización
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Product Search Dialog */}
    <Dialog
      open={productSearchOpen !== null}
      onOpenChange={(open) => {
        if (!open) {
          setProductSearchOpen(null);
          setSearchQuery("");
          setProductCategoryFilter("");
        }
      }}
    >
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 flex-shrink-0">
          <DialogTitle>Seleccionar Producto</DialogTitle>
          <DialogDescription>
            Busca por código, nombre o filtra por categoría
          </DialogDescription>
        </DialogHeader>

        {/* Search + Category filter */}
        <div className="px-6 pb-3 flex gap-2 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por código o nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              data-testid="input-product-dialog-search"
            />
          </div>
          <Select value={productCategoryFilter || "all"} onValueChange={(v) => setProductCategoryFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[200px]" data-testid="select-product-category-filter">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Results count */}
        <div className="px-6 py-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            {productsLoading
              ? "Buscando..."
              : `${displayedProducts.length} producto(s)${products && products.length > 150 ? " (mostrando primeros 150)" : ""}`}
          </span>
        </div>

        {/* Product list */}
        <ScrollArea className="flex-1 px-6 pb-6">
          {productsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No se encontraron productos</p>
              {searchQuery && <p className="text-xs mt-1">Intenta con otro término de búsqueda</p>}
            </div>
          ) : (
            <div className="space-y-1">
              {displayedProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="w-full text-left rounded-md px-3 py-2.5 hover-elevate flex items-start gap-3 transition-colors"
                  onClick={() => {
                    if (productSearchOpen !== null) {
                      addProduct(productSearchOpen, product);
                      setProductSearchOpen(null);
                      setSearchQuery("");
                      setProductCategoryFilter("");
                    }
                  }}
                  data-testid={`option-product-${product.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-muted-foreground shrink-0">
                        {product.code}
                      </span>
                      {product.category && (
                        <Badge variant="secondary" className="text-xs">
                          {product.category.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium mt-0.5 leading-snug">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{product.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end">
                    <span className="text-sm font-semibold">{formatCurrency(product.listPrice)}</span>
                    {parseFloat(product.maxDiscount || "0") > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Desc. máx: {product.maxDiscount}%
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
    </>
  );
}
