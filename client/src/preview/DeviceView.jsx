import { useEffect, useRef, useState } from 'react';
import { fetchFrame, tap } from './device.js';

// Live view of the real phone inside the phone frame. Polls screen frames from
// the device bridge and maps clicks to real taps (device pixels). Frame polling
// is sequential — request the next only after the current lands — so a slow adb
// screencap can't pile up requests.
export default function DeviceView({ deviceSize, onTapError }) {
  const imgRef = useRef(null);
  const [src, setSrc] = useState(null);
  const [fps, setFps] = useState(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    let prevUrl = null;
    let frames = 0;
    let windowStart = performance.now();

    const loop = async () => {
      if (!alive.current) return;
      try {
        const url = await fetchFrame();
        if (!alive.current) { URL.revokeObjectURL(url); return; }
        setSrc(url);
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        prevUrl = url;
        frames += 1;
        const now = performance.now();
        if (now - windowStart >= 1000) { setFps(frames); frames = 0; windowStart = now; }
      } catch {
        // bridge down / device asleep — back off a beat
        await new Promise((r) => setTimeout(r, 700));
      }
      loop();
    };
    loop();

    return () => { alive.current = false; if (prevUrl) URL.revokeObjectURL(prevUrl); };
  }, []);

  // Map a click on the scaled <img> to device pixels and tap there.
  const onClick = async (e) => {
    const img = imgRef.current;
    if (!img || !deviceSize) return;
    const r = img.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * deviceSize.w;
    const y = ((e.clientY - r.top) / r.height) * deviceSize.h;
    try { await tap(x, y); }
    catch (err) { onTapError?.(err.message); }
  };

  return (
    <div className="dv">
      {src ? (
        <img ref={imgRef} className="dv__img" src={src} alt="device" onClick={onClick} draggable={false} />
      ) : (
        <div className="dv__wait">ממתין למכשיר…</div>
      )}
      <div className="dv__fps">{fps} fps</div>
    </div>
  );
}
