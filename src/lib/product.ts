// Product, price, stock and order helpers ported from the website.

export type Product = Record<string, any>;

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=400&h=400';
export const FALLBACK_CATEGORY_IMAGE = 'https://cdn-icons-png.flaticon.com/128/2321/2321831.png';

/** Same mapping the website applies to every product list response. */
export function toCardProduct(p: Product): Product {
  return {
    ...p,
    id: p._id ?? p.id,
    image: p.mainImage || p.image || FALLBACK_IMAGE,
    price: p.sellingPrice || p.mrp || p.price,
    originalPrice: p.mrp ?? p.originalPrice,
    weight: p.weight || '1 unit',
    deliveryTime: p.deliveryTime || '8-15 mins',
  };
}

const CLOUDINARY = /res\.cloudinary\.com/i;
const UPLOAD_SEGMENT = /\/upload\/([^/]+)\//i;

export function cloudinary(url?: string, params = 'f_auto,q_auto,w_400') {
  if (!url || !CLOUDINARY.test(url)) return url;
  const m = url.match(UPLOAD_SEGMENT);
  if (!m) return url;
  const seg = m[1] || '';
  if (seg.includes(',') || /^[a-z]{1,4}_[^/]+$/i.test(seg)) return url;
  return url.replace(UPLOAD_SEGMENT, `/upload/${params}/$1/`);
}

export const rupees = (n: number | string) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export function isVariantOutOfStock(v: any) {
  if (!v || v.stock === undefined || v.stock === null) return false;
  return Number(v.stock) <= 0;
}

export function isProductOutOfStock(p: Product) {
  if (!p) return false;
  if (p.stock !== undefined && p.stock !== null && Number(p.stock) <= 0) return true;
  const tracked = (Array.isArray(p.variants) ? p.variants : []).filter(
    (v: any) => v && v.stock !== undefined && v.stock !== null,
  );
  return tracked.length > 0 && tracked.every((v: any) => Number(v.stock) <= 0);
}

export const onlyInStock = (list: Product[]) => (list || []).filter((p) => !isProductOutOfStock(p));

/** Units the customer may buy; Infinity when the payload has no stock data. */
export function getAvailableStock(product: Product, variantSku = '') {
  const key = String(variantSku || '').trim();
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const variant =
    key && variants.find((v: any) => String(v?.sku || '').trim() === key || String(v?.name || '').trim() === key);
  const raw = variant && variant.stock != null ? variant.stock : product?.stock;
  const n = Number(raw);
  return raw == null || raw === '' || !Number.isFinite(n) ? Infinity : Math.max(0, n);
}

export function resolveVariantPricing(product: Product, variantSku = '') {
  const key = String(variantSku || '').trim();
  if (!key) {
    return {
      price: Number(product?.mrp ?? product?.price ?? 0),
      salePrice: Number(product?.sellingPrice ?? product?.salePrice ?? 0),
      variantName: '',
    };
  }
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const hit = variants.find((v: any) => {
    const sku = String(v?.sku || '').trim();
    const name = String(v?.name || '').trim();
    return (sku && sku === key) || name === key;
  });
  return {
    price: Number(hit?.mrp ?? hit?.price ?? product?.mrp ?? product?.price ?? 0),
    salePrice: Number(hit?.sellingPrice ?? hit?.salePrice ?? 0),
    variantName: String(hit?.name || '').trim(),
  };
}

/** Effective unit price of a cart line. */
export function unitPrice(item: Product) {
  const sale = Number(item.salePrice || 0);
  const mrp = Number(item.price || 0);
  return sale > 0 && sale < mrp ? sale : mrp || sale;
}

/** The variant a product card shows (same rules as the website card). */
export function defaultVariant(product: Product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) return null;
  const displayed = Number(product?.price || 0);
  const displayedOriginal = Number(product?.originalPrice || 0);
  const effective = (v: any) => {
    const mrp = Number(v?.mrp || 0);
    const sale = Number(v?.sellingPrice || 0);
    return sale > 0 && sale < mrp ? sale : mrp;
  };
  const inStock = variants.filter((v: any) => !isVariantOutOfStock(v));
  const pool = inStock.length ? inStock : variants;
  const priceMatch = pool.find((v: any) => effective(v) === displayed || Number(v?.mrp) === displayed);
  const picked = priceMatch || pool[0];
  const mrp = Number(picked?.mrp || 0);
  const sale = Number(picked?.sellingPrice || 0);
  const hasDiscount = sale > 0 && sale < mrp;
  const fallbackOriginal = priceMatch && displayedOriginal > displayed ? displayedOriginal : null;
  return {
    key: String(picked?.sku || picked?.name || '').trim(),
    name: String(picked?.name || '').trim(),
    displayPrice: hasDiscount ? sale : mrp || displayed,
    displayOriginalPrice: hasDiscount ? mrp : fallbackOriginal,
    discountPercent: hasDiscount
      ? Math.round(((mrp - sale) / mrp) * 100)
      : fallbackOriginal
        ? Math.round(((fallbackOriginal - displayed) / fallbackOriginal) * 100)
        : 0,
  };
}

export const savingPct = (p: Product) => {
  const mrp = Number(p.originalPrice ?? p.mrp) || 0;
  const price = Number(p.price ?? p.sellingPrice) || 0;
  return mrp > price && mrp > 0 ? (mrp - price) / mrp : 0;
};

// ----- Order status (mirrors shared/utils/orderStatus.js) -----

function legacyFromWorkflow(ws: string) {
  switch (ws) {
    case 'SELLER_ACCEPTED':
    case 'DELIVERY_SEARCH':
    case 'DELIVERY_ASSIGNED':
      return 'confirmed';
    case 'PICKUP_READY':
      return 'packed';
    case 'OUT_FOR_DELIVERY':
      return 'out_for_delivery';
    case 'DELIVERED':
      return 'delivered';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'pending';
  }
}

export function getOrderBucket(order: any): string {
  if (!order) return 'pending';
  if ((Number(order.workflowVersion) || 0) >= 2 && order.workflowStatus) {
    const ws = String(order.workflowStatus).toUpperCase();
    if (ws === 'DELIVERY_ASSIGNED') return order.sellerPackedAt ? 'packed' : 'confirmed';
    if (order.sellerPackedAt && (ws === 'SELLER_ACCEPTED' || ws === 'DELIVERY_SEARCH')) return 'packed';
    return legacyFromWorkflow(ws);
  }
  const step = Number(order.deliveryRiderStep) || 0;
  if (step >= 3 || order.outForDeliveryAt || order.pickupConfirmedAt) return 'out_for_delivery';
  if (step >= 1 || order.assignedAt || order.pickupReadyAt || order.deliveryBoy) return 'confirmed';
  const s = String(order.status ?? 'pending').toLowerCase();
  return ['pending', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'].includes(s) ? s : 'pending';
}

const LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  packed: 'Packed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const RETURN_LABELS: Record<string, string> = {
  return_requested: 'Return Requested',
  return_approved: 'Return Approved',
  return_pickup_assigned: 'Pickup Assigned',
  return_pickup_verified: 'Pickup Verified',
  return_in_transit: 'Return Picked Up – On the Way to Store',
  return_drop_pending: 'Return Reaching Store',
  returned: 'Return Received – Refund Processing',
  qc_passed: 'Return QC Passed',
  qc_failed: 'Return QC Failed',
  refund_completed: 'Returned & Refunded',
};

export function getOrderStatusLabel(order: any) {
  const rs = order?.returnStatus;
  if (rs && rs !== 'none') return RETURN_LABELS[rs] || rs.replace(/_/g, ' ');
  const b = getOrderBucket(order);
  return LABELS[b] || b.replace(/_/g, ' ');
}

export const ORDER_STEPS = ['pending', 'confirmed', 'packed', 'out_for_delivery', 'delivered'];

export function formatDateTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} • ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}
