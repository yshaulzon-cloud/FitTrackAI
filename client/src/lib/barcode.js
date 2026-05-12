// Barcode scan + Open Food Facts product lookup.
// On web, scanBarcode() returns null. lookupBarcode() works on both platforms.

function isNative() {
  try {
    return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true;
  } catch { return false; }
}

export async function scanBarcode() {
  if (!isNative()) return null;
  const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');

  // MLKit ships its module separately on Android; install if missing.
  const moduleAvailable = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable()
    .catch(() => ({ available: true }));
  if (moduleAvailable && moduleAvailable.available === false) {
    await BarcodeScanner.installGoogleBarcodeScannerModule().catch(() => {});
  }

  const perm = await BarcodeScanner.requestPermissions();
  if (perm.camera !== 'granted' && perm.camera !== 'limited') {
    throw new Error('Camera permission denied');
  }

  const { barcodes } = await BarcodeScanner.scan({
    formats: ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'CODE_128', 'CODE_39'],
  });
  if (!barcodes || barcodes.length === 0) return null;
  return barcodes[0].rawValue || barcodes[0].displayValue || null;
}

// Open Food Facts — free, no key. Returns the localized product name.
export async function lookupBarcode(code, lang = 'he') {
  const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Lookup failed');
  const data = await res.json();
  if (data.status !== 1) return null;
  const p = data.product || {};
  const name =
    (lang === 'he' && p.product_name_he) ||
    p.product_name ||
    p.generic_name ||
    p.brands ||
    null;
  return name ? name.trim() : null;
}
