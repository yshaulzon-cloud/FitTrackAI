// "Export my data" (Settings → Privacy & data): the file name and the JSON text for the download.
// The server builds the data (GET /user/export); this only names and formats it.

const pad = (n) => String(n).padStart(2, '0');

// areto-export-2026-11-19.json (the user's local date, so it matches the day they pressed the button)
export function exportFileName(date = new Date()) {
  return `areto-export-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

// Readable, two-space JSON: a person may open this file, not just a program.
export function exportJson(data) {
  return JSON.stringify(data ?? {}, null, 2);
}

// How many records of each kind the export holds, for the confirmation toast.
export function exportCounts(data) {
  const n = (v) => (Array.isArray(v) ? v.length : 0);
  return {
    meals: n(data?.nutrition),
    workouts: n(data?.workouts),
    sleep: n(data?.sleep),
    measurements: n(data?.measurements),
  };
}

// Which way to hand the file over, by what the device can do:
//   'share'     the system share sheet with the file (a phone or tablet; on a desktop browser that has the Web
//               Share API, e.g. Chrome on Windows, a plain download is what people expect, not a share dialog)
//   'download'  a normal browser download
//   'clipboard' the JSON is copied (the Android WebView can neither share a file nor download a blob)
export function exportDelivery({ canShareFile, isNative, isTouch, canCopy }) {
  if (canShareFile && (isNative || isTouch)) return 'share';
  if (!isNative) return 'download';
  return canCopy ? 'clipboard' : 'download';
}
