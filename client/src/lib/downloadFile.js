// Saves/shares a text file. On the Android (Capacitor) shell the WebView
// supports neither <a download> blob URLs nor navigator.share with files —
// both silently do nothing — so there we open the NATIVE share sheet via
// the official @capacitor/share plugin (user can save to Drive/Files, send
// on WhatsApp, etc.). On the web we do a normal browser download.
function isNativeShell() {
  try {
    return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true;
  } catch { return false; }
}

export async function downloadTextFile(filename, content) {
  if (isNativeShell()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: filename,
        text: content,
        dialogTitle: filename,
      });
      return;
    } catch (err) {
      // User closing the share sheet rejects with a "canceled" error —
      // that's a normal outcome, not a failure.
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('cancel')) return;
      // Plugin missing/failed → fall through to the web download attempt
      // rather than dying silently.
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
