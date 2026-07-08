// Saves a text file to the device. On Android's WebView (and any mobile
// browser that supports it), the Web Share API opens the native share
// sheet so the user can save the file to Drive/Files or send it elsewhere
// — no extra native plugin/permissions needed. Falls back to a normal
// browser download (desktop, or older WebViews without share support).
function isNativeShell() {
  try {
    return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true;
  } catch { return false; }
}

export async function downloadTextFile(filename, content) {
  if (isNativeShell() && typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const file = new File([content], filename, { type: 'text/plain' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return;
      }
    } catch {
      // Fall through to the download fallback (user cancelled share is
      // also caught here, which is fine — nothing else to do).
    }
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
