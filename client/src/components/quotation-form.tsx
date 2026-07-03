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
import { useTenant } from "@/hooks/use-tenant";
import { useI18n } from "@/hooks/use-i18n";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CustomerCombobox } from "@/components/customer-combobox";
import { Customer } from "@shared/schema";

type ProductWithCategory = Product & { category?: ProductCategory | null };

interface QuotationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertQuotation & { items: InsertQuotationItem[]; _sendEmail: boolean }) => void;
  isPending: boolean;
  onCancel?: () => void;
  customers?: Customer[];
  userId?: string;
  initialData?: any;
  isEditing?: boolean;
  adjustMode?: boolean;
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
  { value: "contado", labelKey: "quotations.payment.cash" },
  { value: "15_dias", labelKey: "quotations.payment.15" },
  { value: "30_dias", labelKey: "quotations.payment.30" },
  { value: "45_dias", labelKey: "quotations.payment.45" },
  { value: "60_dias", labelKey: "quotations.payment.60" },
  { value: "90_dias", labelKey: "quotations.payment.90" },
  { value: "120_dias", labelKey: "quotations.payment.120" },
];

const DELIVERY_TIMES = [
  { value: "inmediato", labelKey: "quotations.delivery.immediate" },
  { value: "1_semana", labelKey: "quotations.delivery.1week" },
  { value: "2_semanas", labelKey: "quotations.delivery.2weeks" },
  { value: "3_semanas", labelKey: "quotations.delivery.3weeks" },
  { value: "1_mes", labelKey: "quotations.delivery.1month" },
  { value: "por_confirmar", labelKey: "quotations.delivery.tbc" },
];

const FOREIGN_RFC = "XEXX010101000";

const CURRENCIES = [
  { value: "AMBAS", labelKey: "quotations.currency.both" },
  { value: "MXN", labelKey: "quotations.currency.mxn" },
  { value: "USD", labelKey: "quotations.currency.usd" },
];

const buildQuotationFormSchema = (t: (key: string) => string) => z.object({
  customerId: z.string().min(1, t("val.select-customer")),
  currency: z.string().default("MXN"),
  exchangeRate: z.string().default("18.00"),
  paymentTerms: z.string().optional(),
  deliveryTime: z.string().optional(),
  validUntil: z.string().optional(),
  globalDiscount: z.string().default("0"),
  notes: z.string().optional(),
  conditions: z.string().optional(),
  shippingHandledByJoper: z.boolean().default(false),
  shippingMethod: z.string().default("truck"),
  requiresPallet: z.boolean().default(false),
  shippingNotes: z.string().optional(),
  shippingCost: z.string().default("0"),
  shippingCostStatus: z.string().default("confirmed"),
});

type QuotationFormData = z.infer<ReturnType<typeof buildQuotationFormSchema>>;

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
  adjustMode = false,
}: QuotationFormProps) {
  const { t, locale } = useI18n();
  const { tenant } = useTenant();
  const quotationFormSchema = useMemo(() => buildQuotationFormSchema(t), [locale]);
  const companyName = tenant?.name || t("quotations.the-company");
  const [lineItems, setLineItems] = useState<QuotationLineItem[]>([createEmptyLineItem(0)]);
  const [productSearchOpen, setProductSearchOpen] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [sinVigencia, setSinVigencia] = useState(false);
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
      currency: "AMBAS",
      exchangeRate: "18.00",
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

  const watchedCustomerId = form.watch("customerId");
  const isForeignCustomer = useMemo(() => {
    const c = customers.find(c => c.id === watchedCustomerId);
    return c?.rfc === FOREIGN_RFC;
  }, [customers, watchedCustomerId]);
  const prevCustomerIdRef = useRef<string>("");

  useEffect(() => {
    if (isEditing && initialData && open && !initialized && products !== undefined) {
      form.reset({
        customerId: initialData.customerId || "",
        currency: initialData.currency || "AMBAS",
        exchangeRate: initialData.exchangeRate?.toString() || "18.00",
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
      setSinVigencia(!initialData.validUntil);

      if (initialData.items && initialData.items.length > 0) {
        const items: QuotationLineItem[] = initialData.items.map((item: any, index: number) => {
          const productData = products?.find((p: any) => p.id === item.productId);
          const resolvedMaxDiscount = productData?.maxDiscount || "0";
          const discountPercent = parseFloat(item.discountPercent?.toString() || "0");
          const maxDisc = parseFloat(resolvedMaxDiscount);
          return {
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
            exceedsMaxDiscount: maxDisc > 0 && discountPercent > maxDisc,
            maxDiscount: resolvedMaxDiscount,
            position: item.position ?? index,
            currency: item.currency || "MXN",
          };
        });
        setLineItems(items);
      }
      setInitialized(true);
    }
  }, [isEditing, initialData, open, form, initialized, products]);

  useEffect(() => {
    if (!open) {
      setInitialized(false);
      if (!isEditing) {
        form.reset({
          customerId: "",
          currency: "MXN",
          exchangeRate: "18.00",
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
    // Only flag when maxDiscount is explicitly set (>0) AND the positive discount exceeds it.
    // Negative discounts (unit price > list price) must never trigger the approval workflow.
    const exceedsMaxDiscount = maxDiscount > 0 && discountPercent > 0 && discountPercent > maxDiscount;

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

  // When customer changes, update taxRates on all line items
  useEffect(() => {
    const prevId = prevCustomerIdRef.current;
    prevCustomerIdRef.current = watchedCustomerId;
    // Only update if there was already a customer selected before (avoids overwriting on initial load)
    if (!prevId || prevId === watchedCustomerId) return;
    setLineItems(prev => prev.map(item => {
      const newTaxRate = isForeignCustomer ? "0" : "16";
      const newItem = { ...item, taxRate: newTaxRate };
      return calculateLineItem(newItem, "discountPercent");
    }));
  }, [watchedCustomerId, isForeignCustomer, calculateLineItem]);

  const normalizeDecimal = (value: string) => value.replace(',', '.');
  const normalizeDecimal2 = (value: string) => {
    const clean = value.replace(',', '.');
    const match = clean.match(/^-?\d*(\.\d{0,2})?/);
    return match ? match[0] : '';
  };
  const preventEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') e.preventDefault();
  };

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

  const toggleLineCurrency = useCallback((index: number) => {
    const exRate = Math.max(parseFloat(form.getValues("exchangeRate")) || 18, 0.0001);
    setLineItems(prev => {
      const newItems = [...prev];
      const item = newItems[index];
      const fromUSD = item.currency === "USD";
      const newCurrency = fromUSD ? "MXN" : "USD";
      const factor = fromUSD ? exRate : 1 / exRate;
      const newListPrice = (parseFloat(item.listPrice) || 0) * factor;
      const updated: QuotationLineItem = {
        ...item,
        currency: newCurrency,
        listPrice: newListPrice.toFixed(2),
      };
      newItems[index] = calculateLineItem(updated, 'discountPercent');
      return newItems;
    });
  }, [calculateLineItem, form]);

  const addProduct = useCallback((index: number, product: ProductWithCategory) => {
    const DEFAULT_DISCOUNT = 47;
    const listPrice = parseFloat(product.listPrice);
    const maxDiscount = parseFloat(product.maxDiscount || "0");
    const discountPercent = Math.min(DEFAULT_DISCOUNT, maxDiscount > 0 ? maxDiscount : DEFAULT_DISCOUNT);
    const discountAmount = listPrice * (discountPercent / 100);
    const unitPrice = listPrice - discountAmount;
    const quantity = 1;
    const subtotal = unitPrice * quantity;
    const taxRate = isForeignCustomer ? 0 : parseFloat(product.taxRate);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    const exceedsMaxDiscount = maxDiscount > 0 && discountPercent > maxDiscount;

    let newItem: QuotationLineItem = {
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
      taxRate: isForeignCustomer ? "0" : product.taxRate,
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
      exceedsMaxDiscount,
      maxDiscount: product.maxDiscount || "0",
      position: index,
      currency: product.currency || "MXN",
    };

    // If the quotation has a fixed currency (USD or MXN), convert the item's prices to match
    const quoteCurrency = form.getValues("currency") || "AMBAS";
    if (quoteCurrency !== "AMBAS" && newItem.currency !== quoteCurrency) {
      const exRate = Math.max(parseFloat(form.getValues("exchangeRate")) || 18, 0.0001);
      const fromMXN = newItem.currency === "MXN";
      const convert = (v: number) => fromMXN ? v / exRate : v * exRate;
      const newListPrice = convert(parseFloat(newItem.listPrice) || 0);
      const newUnitPrice = convert(parseFloat(newItem.unitPrice) || 0);
      const qty = parseFloat(newItem.quantity) || 1;
      const taxRateNum = parseFloat(newItem.taxRate) || 0;
      const newSubtotal = qty * newUnitPrice;
      newItem = {
        ...newItem,
        currency: quoteCurrency,
        listPrice: newListPrice.toFixed(2),
        unitPrice: newUnitPrice.toFixed(2),
        discountAmount: (newListPrice - newUnitPrice).toFixed(2),
        subtotal: newSubtotal.toFixed(2),
        taxAmount: (newSubtotal * taxRateNum / 100).toFixed(2),
        total: (newSubtotal * (1 + taxRateNum / 100)).toFixed(2),
      };
    }

    setLineItems(prev => {
      const newItems = [...prev];
      newItems[index] = newItem;
      return newItems;
    });
    setProductSearchOpen(null);
    setSearchQuery("");
  }, [isForeignCustomer]);

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
    const quoteCurrency = form.watch("currency") || "AMBAS";
    const exRate = Math.max(parseFloat(form.watch("exchangeRate")) || 18, 0.0001);

    // Convert any amount from itemCurrency to the quotation currency
    // For AMBAS, aggregate to MXN (USD items converted to MXN)
    const effectiveCurrency = quoteCurrency === "AMBAS" ? "MXN" : quoteCurrency;
    const toQuote = (amount: number, itemCurrency: string) => {
      if (itemCurrency === effectiveCurrency) return amount;
      if (itemCurrency === "USD" && effectiveCurrency === "MXN") return amount * exRate;
      if (itemCurrency === "MXN" && effectiveCurrency === "USD") return amount / exRate;
      return amount;
    };

    const namedItems = lineItems.filter(item => item.productName);
    const hasMixedCurrencies = namedItems.some(i => i.currency === "MXN") && namedItems.some(i => i.currency === "USD");

    // All amounts converted to quotation currency
    const subtotalBeforeDiscount = lineItems.reduce((sum, item) =>
      sum + toQuote(parseFloat(item.subtotal), item.currency), 0);
    const totalTax = lineItems.reduce((sum, item) =>
      sum + toQuote(parseFloat(item.taxAmount), item.currency), 0);
    const globalDiscountAmount = subtotalBeforeDiscount * (globalDiscountPercent / 100);
    const subtotalAfterDiscount = subtotalBeforeDiscount - globalDiscountAmount;
    const adjustedTax = totalTax * (1 - globalDiscountPercent / 100);
    const total = subtotalAfterDiscount + adjustedTax;
    const totalSavings = lineItems.reduce((sum, item) =>
      sum + toQuote(parseFloat(item.quantity) * parseFloat(item.discountAmount), item.currency), 0) + globalDiscountAmount;

    // Per-currency breakdown (in their original currency, for info display)
    const mxnItems = namedItems.filter(i => i.currency === "MXN");
    const usdItems = namedItems.filter(i => i.currency === "USD");
    const mxnSubtotal = mxnItems.reduce((s, i) => s + parseFloat(i.subtotal), 0);
    const usdSubtotal = usdItems.reduce((s, i) => s + parseFloat(i.subtotal), 0);

    return {
      subtotal: subtotalBeforeDiscount.toFixed(2),
      globalDiscountAmount: globalDiscountAmount.toFixed(2),
      tax: adjustedTax.toFixed(2),
      total: total.toFixed(2),
      totalSavings: totalSavings.toFixed(2),
      hasMixedCurrencies,
      quoteCurrency,
      exRate,
      mxnSubtotal: mxnSubtotal.toFixed(2),
      usdSubtotal: usdSubtotal.toFixed(2),
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

    // Recalculate totals fresh at submit time using the actual submitted exchange rate
    // (avoids stale closure from render-time form.watch())
    const submitExRate = Math.max(parseFloat(data.exchangeRate) || 18, 0.0001);
    const submitCurrency = data.currency || "AMBAS";
    const globalDiscountPercent = parseFloat(data.globalDiscount) || 0;
    const toQuoteSubmit = (amount: number, itemCurrency: string) => {
      // AMBAS: convert everything to MXN equivalent for stored totals
      if (submitCurrency === "AMBAS") {
        if (itemCurrency === "USD") return amount * submitExRate;
        return amount;
      }
      if (itemCurrency === submitCurrency) return amount;
      if (itemCurrency === "USD" && submitCurrency === "MXN") return amount * submitExRate;
      if (itemCurrency === "MXN" && submitCurrency === "USD") return amount / submitExRate;
      return amount;
    };
    const validItems = lineItems.filter(i => i.productName);
    const submitSubtotalBefore = validItems.reduce((s, i) => s + toQuoteSubmit(parseFloat(i.subtotal), i.currency), 0);
    const submitTotalTax = validItems.reduce((s, i) => s + toQuoteSubmit(parseFloat(i.taxAmount), i.currency), 0);
    const submitGlobalDiscAmt = submitSubtotalBefore * (globalDiscountPercent / 100);
    const submitAdjustedTax = submitTotalTax * (1 - globalDiscountPercent / 100);
    const submitTotal = (submitSubtotalBefore - submitGlobalDiscAmt) + submitAdjustedTax;
    const submitTotalSavings = validItems.reduce((s, i) =>
      s + toQuoteSubmit(parseFloat(i.quantity) * parseFloat(i.discountAmount), i.currency), 0) + submitGlobalDiscAmt;

    const freshTotals = {
      subtotal: submitSubtotalBefore.toFixed(2),
      tax: submitAdjustedTax.toFixed(2),
      total: submitTotal.toFixed(2),
      totalSavings: submitTotalSavings.toFixed(2),
    };

    // Determine if requires approval (either for discounts or free shipping by Joper)
    const requiresFreeShippingApproval = data.shippingHandledByJoper;
    const requiresAnyApproval = hasExceedingDiscounts || requiresFreeShippingApproval;
    
    // Build approval reason
    let approvalReason = null;
    if (hasExceedingDiscounts && requiresFreeShippingApproval) {
      approvalReason = t("quotations.reason-discounts-and-shipping").replace("{company}", companyName);
    } else if (hasExceedingDiscounts) {
      approvalReason = t("quotations.reason-discounts");
    } else if (requiresFreeShippingApproval) {
      approvalReason = t("quotations.reason-shipping").replace("{company}", companyName);
    }

    const quotationData: InsertQuotation & { items: InsertQuotationItem[]; _sendEmail: boolean } = {
      customerId: data.customerId,
      userId: userId || "",
      // In adjustMode keep original status; otherwise compute from save mode
      status: adjustMode
        ? (initialData?.status ?? QuotationStatus.DRAFT)
        : (!saveAsDraftRef.current && requiresAnyApproval) ? QuotationStatus.PENDING_APPROVAL : QuotationStatus.DRAFT,
      currency: data.currency,
      exchangeRate: data.exchangeRate,
      paymentTerms: data.paymentTerms || null,
      deliveryTime: data.deliveryTime || null,
      validUntil: data.validUntil ? new Date(data.validUntil + "T12:00:00") : null,
      subtotal: freshTotals.subtotal,
      globalDiscount: data.globalDiscount,
      tax: freshTotals.tax,
      total: freshTotals.total,
      totalSavings: freshTotals.totalSavings,
      notes: data.notes || null,
      conditions: data.conditions || null,
      requiresApproval: adjustMode ? (initialData?.requiresApproval ?? false) : (!saveAsDraftRef.current && requiresAnyApproval),
      approvalReason: adjustMode ? (initialData?.approvalReason ?? null) : (saveAsDraftRef.current ? null : approvalReason),
      _sendEmail: adjustMode ? false : (!saveAsDraftRef.current && !requiresAnyApproval),
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

  // Format in the quotation's currency (for totals/summary)
  // When AMBAS, default to MXN display
  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    const cur = form.watch("currency") || "AMBAS";
    const displayCur = cur === "AMBAS" ? "MXN" : cur;
    return num.toLocaleString("es-MX", {
      style: "currency",
      currency: displayCur,
    });
  };

  // Format in the item's own currency (for per-row list price and subtotal)
  const formatItemCurrency = (value: string | number, itemCurrency: string) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return num.toLocaleString("es-MX", {
      style: "currency",
      currency: itemCurrency || "MXN",
    });
  };

  // Convert a per-item amount to the quotation currency
  const quoteCurrencyWatched = form.watch("currency") || "AMBAS";
  const exRateWatched = Math.max(parseFloat(form.watch("exchangeRate") || "18"), 0.0001);
  const convertToQuote = (amount: number, itemCurrency: string): number => {
    // When AMBAS, each item keeps its own currency — no conversion needed
    if (quoteCurrencyWatched === "AMBAS") return amount;
    if (itemCurrency === quoteCurrencyWatched) return amount;
    if (itemCurrency === "USD" && quoteCurrencyWatched === "MXN") return amount * exRateWatched;
    if (itemCurrency === "MXN" && quoteCurrencyWatched === "USD") return amount / exRateWatched;
    return amount;
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-6xl h-[100dvh] sm:h-[90vh] flex flex-col rounded-none sm:rounded-lg p-4 sm:p-6 gap-0">
        <DialogHeader className="flex-shrink-0 mb-3">
          <DialogTitle>{isEditing ? t("quotations.edit-title") : t("quotations.new")}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? t("quotations.edit-desc") 
              : t("quotations.create-desc")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto overflow-x-hidden sm:pr-4 min-h-0">
              <div className="space-y-6 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    name="validUntil"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Vigencia</FormLabel>
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground select-none">
                            <Checkbox
                              checked={sinVigencia}
                              onCheckedChange={(checked) => {
                                setSinVigencia(!!checked);
                                if (checked) field.onChange("");
                              }}
                              data-testid="checkbox-sin-vigencia"
                            />
                            Sin vigencia
                          </label>
                        </div>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            disabled={sinVigencia}
                            className={sinVigencia ? "opacity-40" : ""}
                            data-testid="input-valid-until"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {isForeignCustomer && (
                  <div className="flex items-center gap-2 rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>{t("quotations.foreign-customer-note").replace("{rfc}", FOREIGN_RFC)}</span>
                  </div>
                )}

                {/* ── Moneda y Tipo de Cambio ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("quotations.quote-currency")}</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(newCurrency) => {
                            const oldCurrency = field.value || "AMBAS";
                            if (newCurrency !== oldCurrency) {
                              // When selecting AMBAS: keep items' own currencies as-is
                              if (newCurrency !== "AMBAS") {
                                const exRate = Math.max(parseFloat(form.getValues("exchangeRate")) || 18, 0.0001);
                                // Convert every item to the new single currency
                                const toNew = (v: number, fromCurrency: string) => {
                                  if (fromCurrency === newCurrency) return v;
                                  if (fromCurrency === "MXN" && newCurrency === "USD") return v / exRate;
                                  if (fromCurrency === "USD" && newCurrency === "MXN") return v * exRate;
                                  return v;
                                };
                                setLineItems(prev => prev.map(item => {
                                  const itemCurrency = item.currency || "MXN";
                                  if (itemCurrency === newCurrency) return item;
                                  const lp = parseFloat(item.listPrice) || 0;
                                  const up = parseFloat(item.unitPrice) || 0;
                                  const qty = parseFloat(item.quantity) || 0;
                                  const taxRate = parseFloat(item.taxRate) || 16;
                                  const newUp = toNew(up, itemCurrency);
                                  const newLp = toNew(lp, itemCurrency);
                                  const newSubtotal = qty * newUp;
                                  return {
                                    ...item,
                                    currency: newCurrency,
                                    listPrice: newLp.toFixed(2),
                                    unitPrice: newUp.toFixed(2),
                                    discountAmount: (newLp - newUp).toFixed(2),
                                    subtotal: newSubtotal.toFixed(2),
                                    taxAmount: (newSubtotal * taxRate / 100).toFixed(2),
                                    total: (newSubtotal * (1 + taxRate / 100)).toFixed(2),
                                  };
                                }));
                              }
                            }
                            field.onChange(newCurrency);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-currency">
                              <SelectValue placeholder={t("quotations.select-currency")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CURRENCIES.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {t(c.labelKey)}
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
                    name="exchangeRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("quotations.exchange-rate-mxnusd")}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">$</span>
                            <Input
                              type="text"
                              inputMode="decimal"
                              {...field}
                              onChange={(e) => field.onChange(normalizeDecimal(e.target.value))}
                              onKeyDown={preventEnter}
                              className="pl-6"
                              placeholder="18.00"
                              data-testid="input-exchange-rate"
                            />
                          </div>
                        </FormControl>
                        <p className="text-xs text-muted-foreground">{t("quotations.exchange-rate-hint")}</p>
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
                        <FormLabel>{t("quotations.payment-terms")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-terms">
                              <SelectValue placeholder={t("quotations.select-placeholder")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PAYMENT_TERMS.map((term) => (
                              <SelectItem key={term.value} value={term.value}>
                                {t(term.labelKey)}
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
                        <FormLabel>{t("label.delivery-time")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-delivery-time">
                              <SelectValue placeholder={t("quotations.select-placeholder")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DELIVERY_TIMES.map((time) => (
                              <SelectItem key={time.value} value={time.value}>
                                {t(time.labelKey)}
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
                      {t("label.shipping")}
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
                              {t("quotations.shipping-by-company").replace("{company}", companyName)}
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">
                              {t("quotations.shipping-requires-auth")}
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
                            <FormLabel>{t("quotations.form.shipping-method")}</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-shipping-method">
                                  <SelectValue placeholder={t("quotations.select-method")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="truck">{t("quotations.shipping.truck")}</SelectItem>
                                <SelectItem value="parcel">{t("quotations.shipping.parcel")}</SelectItem>
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
                              {t("quotations.requires-pallet")}
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
                          <FormLabel>{t("quotations.shipping-notes-label")}</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder={t("quotations.shipping-notes-placeholder")}
                              className="resize-none min-h-[60px]"
                              data-testid="textarea-shipping-notes"
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            {t("quotations.shipping-notes-hint")}
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
                              <FormLabel>{t("label.shipping-cost")}</FormLabel>
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
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">Productos</CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addNewLine}
                        data-testid="button-add-line"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t("quotations.add-line")}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* ── Desktop table (sm+) ── */}
                    <div className="hidden sm:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">{t("label.product")}</TableHead>
                            <TableHead className="w-[80px] text-center">{t("quotations.qty-short")}</TableHead>
                            <TableHead className="w-[100px] text-right">{t("quotations.list-price-short")}</TableHead>
                            <TableHead className="w-[80px] text-center">{t("quotations.disc-pct")}</TableHead>
                            <TableHead className="w-[100px] text-right">{t("quotations.unit-price")}</TableHead>
                            <TableHead className="w-[100px] text-right">{t("label.subtotal")}</TableHead>
                            <TableHead className="w-[60px] text-center">{t("quotations.currency-short")}</TableHead>
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
                                  onClick={() => { setProductSearchOpen(index); setSearchQuery(""); setProductCategoryFilter(""); }}
                                >
                                  {item.productName ? (
                                    <div className="flex flex-col items-start">
                                      <span className="font-medium text-xs">{item.productCode}</span>
                                      <span className="text-sm truncate max-w-[180px]">{item.productName}</span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground flex items-center gap-1">
                                      <Search className="h-3 w-3" />
                                      {t("quotations.search-product")}
                                    </span>
                                  )}
                                </Button>
                                {item.exceedsMaxDiscount && (
                                  <div className="flex items-center gap-1 mt-1 text-destructive text-xs">
                                    <AlertTriangle className="h-3 w-3" />
                                    {t("quotations.exceeds-max")} ({item.maxDiscount}%)
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input type="text" inputMode="decimal" value={item.quantity}
                                  onChange={(e) => updateLineItem(index, { quantity: normalizeDecimal2(e.target.value) })}
                                  onBlur={() => updateLineItem(index, {}, 'discountPercent')}
                                  onKeyDown={preventEnter}
                                  className="w-20 text-center" data-testid={`input-quantity-${index}`} />
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                <div className="flex flex-col items-end leading-tight">
                                  <span>{formatItemCurrency(item.listPrice, item.currency)}</span>
                                  {item.currency !== quoteCurrencyWatched && item.productName && (
                                    <span className="text-xs text-muted-foreground">
                                      {formatCurrency(convertToQuote(parseFloat(item.listPrice) || 0, item.currency))}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input type="text" inputMode="decimal" value={item.discountPercent}
                                  onChange={(e) => updateLineItem(index, { discountPercent: normalizeDecimal2(e.target.value) })}
                                  onBlur={() => updateLineItem(index, {}, 'discountPercent')}
                                  onKeyDown={preventEnter}
                                  className={`w-16 text-center ${item.exceedsMaxDiscount ? "border-destructive" : ""}`}
                                  data-testid={`input-discount-${index}`} />
                              </TableCell>
                              <TableCell>
                                <Input type="text" inputMode="decimal" value={item.unitPrice}
                                  onChange={(e) => updateLineItem(index, { unitPrice: normalizeDecimal2(e.target.value) })}
                                  onBlur={() => updateLineItem(index, {}, 'unitPrice')}
                                  onKeyDown={preventEnter}
                                  className="w-24 text-right font-mono" data-testid={`input-unit-price-${index}`} />
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm font-medium">
                                <div className="flex flex-col items-end leading-tight">
                                  <span>{formatItemCurrency(item.subtotal, item.currency)}</span>
                                  {item.currency !== quoteCurrencyWatched && item.productName && (
                                    <span className="text-xs text-muted-foreground">
                                      {formatCurrency(convertToQuote(parseFloat(item.subtotal) || 0, item.currency))}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {quoteCurrencyWatched === "AMBAS" ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-xs font-mono px-2 h-6"
                                    data-testid={`badge-currency-${index}`}
                                    onClick={() => toggleLineCurrency(index)}
                                  >
                                    {item.currency || "MXN"}
                                  </Button>
                                ) : (
                                  <Badge variant={item.currency === "USD" ? "secondary" : "outline"} className="text-xs font-mono" data-testid={`badge-currency-${index}`}>
                                    {item.currency || "MXN"}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(index)}
                                  disabled={lineItems.length === 1} data-testid={`button-remove-line-${index}`}>
                                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* ── Mobile cards (below sm) ── */}
                    <div className="sm:hidden divide-y">
                      {lineItems.map((item, index) => (
                        <div key={index} className={`p-3 space-y-3 ${item.exceedsMaxDiscount ? "bg-destructive/10" : ""}`}>
                          {/* Product selector */}
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            className="w-full justify-start text-left font-normal h-auto min-h-9 py-2"
                            data-testid={`button-select-product-${index}`}
                            onClick={() => { setProductSearchOpen(index); setSearchQuery(""); setProductCategoryFilter(""); }}
                          >
                            {item.productName ? (
                              <div className="flex flex-col w-full min-w-0 overflow-hidden">
                                <span className="font-medium text-xs text-muted-foreground truncate">{item.productCode}</span>
                                <span className="text-sm truncate">{item.productName}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground flex items-center gap-2">
                                <Search className="h-4 w-4 shrink-0" />
                                {t("quotations.search-product")}
                              </span>
                            )}
                          </Button>
                          {item.exceedsMaxDiscount && (
                            <div className="flex items-center gap-1 text-destructive text-xs">
                              <AlertTriangle className="h-3 w-3" />
                              {t("quotations.exceeds-max-discount")} ({item.maxDiscount}%)
                            </div>
                          )}

                          {/* Numeric fields: Cantidad + Desc% side by side, P.Unitario full width below */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">{t("label.quantity")}</label>
                              <Input type="text" inputMode="decimal" value={item.quantity}
                                onChange={(e) => updateLineItem(index, { quantity: normalizeDecimal2(e.target.value) })}
                                onBlur={() => updateLineItem(index, {}, 'discountPercent')}
                                onKeyDown={preventEnter}
                                className="w-full text-center text-sm" data-testid={`input-quantity-${index}`} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">{t("quotations.disc-pct")}</label>
                              <Input type="text" inputMode="decimal" value={item.discountPercent}
                                onChange={(e) => updateLineItem(index, { discountPercent: normalizeDecimal2(e.target.value) })}
                                onBlur={() => updateLineItem(index, {}, 'discountPercent')}
                                onKeyDown={preventEnter}
                                className={`w-full text-center text-sm ${item.exceedsMaxDiscount ? "border-destructive" : ""}`}
                                data-testid={`input-discount-${index}`} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">{t("quotations.unit-price")}</label>
                            <Input type="text" inputMode="decimal" value={item.unitPrice}
                              onChange={(e) => updateLineItem(index, { unitPrice: normalizeDecimal2(e.target.value) })}
                              onBlur={() => updateLineItem(index, {}, 'unitPrice')}
                              onKeyDown={preventEnter}
                              className="w-full text-right font-mono text-sm" data-testid={`input-unit-price-${index}`} />
                          </div>

                          {/* Summary row: P.Lista info (left, shrinkable) + Subtotal + delete (right, fixed) */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-1.5 min-w-0 flex-1">
                              {quoteCurrencyWatched === "AMBAS" ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-xs font-mono px-2 h-6 shrink-0 mt-0.5"
                                  onClick={() => toggleLineCurrency(index)}
                                >
                                  {item.currency || "MXN"}
                                </Button>
                              ) : (
                                <Badge variant={item.currency === "USD" ? "secondary" : "outline"} className="text-xs font-mono shrink-0 mt-0.5">
                                  {item.currency || "MXN"}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                                {t("quotations.list-price-short")} {formatItemCurrency(item.listPrice, item.currency)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="font-mono font-semibold text-sm">
                                {formatCurrency(convertToQuote(parseFloat(item.subtotal) || 0, item.currency))}
                              </span>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(index)}
                                disabled={lineItems.length === 1} data-testid={`button-remove-line-${index}`}>
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
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
                          <FormLabel>{t("label.notes")}</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder={t("quotations.notes-placeholder")}
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
                          <FormLabel>{t("quotations.form.conditions")}</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder={t("quotations.conditions-placeholder")}
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
                        {t("quotations.summary")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {/* Global discount — always visible */}
                      <div className="flex items-center justify-between text-sm gap-2">
                        <span>{t("quotations.global-discount-colon")}</span>
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
                        </div>
                      </div>

                      {/* ── Unified summary in the quote currency ── */}
                      <div className="space-y-2">
                        {/* Conversion note when there are products in both currencies */}
                        {totals.hasMixedCurrencies && (
                          <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                            <p className="font-medium">{t("quotations.mixed-currencies")}</p>
                            <p>MXN: ${parseFloat(totals.mxnSubtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })} · USD: ${parseFloat(totals.usdSubtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                            <p>{t("quotations.converted-to").replace("{currency}", totals.quoteCurrency).replace("{rate}", totals.exRate.toFixed(4))}</p>
                          </div>
                        )}

                        <div className="flex justify-between text-sm">
                          <span>{t("label.subtotal")}:</span>
                          <span className="font-mono">{formatCurrency(totals.subtotal)}</span>
                        </div>

                        {parseFloat(totals.globalDiscountAmount) > 0 && (
                          <div className="flex justify-between text-sm text-destructive">
                            <span>{t("label.discount")}:</span>
                            <span className="font-mono">-{formatCurrency(totals.globalDiscountAmount)}</span>
                          </div>
                        )}

                        <div className="flex justify-between text-sm">
                          <span>{t("label.tax")}:</span>
                          <span className="font-mono">{formatCurrency(totals.tax)}</span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span>{t("label.shipping")}:</span>
                          <span className="font-mono">
                            {form.watch("shippingHandledByJoper")
                              ? `$0.00 (${companyName})`
                              : form.watch("shippingCostStatus") === "pending"
                                ? t("quotations.to-quote")
                                : formatCurrency(form.watch("shippingCost") || "0")}
                          </span>
                        </div>

                        <Separator />

                        <div className="flex justify-between items-center text-lg font-bold gap-2">
                          <span>{t("quotations.total-currency").replace("{currency}", totals.quoteCurrency)}</span>
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
                          {t("quotations.edit-total-hint")}
                        </p>

                        {parseFloat(totals.totalSavings) > 0 && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>{t("quotations.total-savings-colon")}</span>
                            <span className="font-mono">{formatCurrency(totals.totalSavings)}</span>
                          </div>
                        )}
                      </div>

                      {(hasExceedingDiscounts || form.watch("shippingHandledByJoper")) && (
                        <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                          <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                            <AlertTriangle className="h-4 w-4" />
                            {t("quotations.requires-approval")}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {hasExceedingDiscounts && form.watch("shippingHandledByJoper")
                              ? t("quotations.approval-both")
                              : hasExceedingDiscounts
                                ? t("quotations.approval-discounts")
                                : t("quotations.approval-shipping").replace("{company}", companyName)}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            <Separator className="mt-3 mb-3" />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0">
              <div className="text-xs text-muted-foreground">
                {lineItems.filter(i => i.productName).length} {t("quotations.products-suffix")}
                {totals.hasMixedCurrencies
                  ? ` · MXN equiv.: ${formatCurrency(totals.total)} (T/C ${totals.exRate.toFixed(2)})`
                  : ` · Total: ${formatCurrency(totals.total)}`}
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isPending}
                  data-testid="button-cancel"
                >
                  {t("btn.cancel")}
                </Button>
                {adjustMode ? (
                  <Button
                    type="submit"
                    disabled={isPending || lineItems.filter(i => i.productName).length === 0}
                    onClick={() => { saveAsDraftRef.current = false; }}
                    data-testid="button-submit"
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("quotations.save-adjustments")}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={isPending || lineItems.filter(i => i.productName).length === 0}
                      onClick={() => { saveAsDraftRef.current = true; }}
                      data-testid="button-save-draft"
                    >
                      {isPending && saveAsDraftRef.current && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t("quotations.save-draft")}
                    </Button>
                    {(hasExceedingDiscounts || form.watch("shippingHandledByJoper")) ? (
                      <Button
                        type="submit"
                        disabled={isPending || lineItems.filter(i => i.productName).length === 0}
                        onClick={() => { saveAsDraftRef.current = false; }}
                        data-testid="button-submit"
                      >
                        {isPending && !saveAsDraftRef.current && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("quotations.send-to-auth")}
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={isPending || lineItems.filter(i => i.productName).length === 0}
                        onClick={() => { saveAsDraftRef.current = false; }}
                        data-testid="button-submit"
                      >
                        {isPending && !saveAsDraftRef.current && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("quotations.save-quotation")}
                      </Button>
                    )}
                  </>
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
      <DialogContent className="w-full sm:max-w-3xl h-[100dvh] sm:h-[80vh] flex flex-col p-0 rounded-none sm:rounded-lg">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 flex-shrink-0">
          <DialogTitle>{t("quotations.select-product-title")}</DialogTitle>
          <DialogDescription>
            {t("quotations.product-search-desc")}
          </DialogDescription>
        </DialogHeader>

        {/* Search + Category filter */}
        <div className="px-4 sm:px-6 pb-3 flex flex-col sm:flex-row gap-2 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t("quotations.search-code-name")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              data-testid="input-product-dialog-search"
            />
          </div>
          <Select value={productCategoryFilter || "all"} onValueChange={(v) => setProductCategoryFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-product-category-filter">
              <SelectValue placeholder={t("quotations.all-categories")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("quotations.all-categories")}</SelectItem>
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
              ? t("quotations.searching")
              : `${displayedProducts.length} ${t("quotations.products-suffix")}${products && products.length > 150 ? " " + t("quotations.showing-first-150") : ""}`}
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
              <p className="text-sm">{t("quotations.no-products-found")}</p>
              {searchQuery && <p className="text-xs mt-1">{t("quotations.try-another-search")}</p>}
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
                    <span className="text-sm font-semibold">{formatItemCurrency(product.listPrice, product.currency || "MXN")}</span>
                    {parseFloat(product.maxDiscount || "0") > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {t("quotations.max-disc-short")} {product.maxDiscount}%
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
