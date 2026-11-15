import { useCallback, useRef, useState } from 'react';

// Screenshot + screen recording of the phone frame only. We capture the tab
// with getDisplayMedia (one permission prompt), then continuously draw just the
// phone-viewport rectangle onto an offscreen canvas. The still is one draw of
// that canvas; the video is MediaRecorder over canvas.captureStream(), so both
// contain the device and nothing else.
export function useCapture(getPhoneEl) {
  const [armed, setArmed] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState(null);

  const streamRef = useRef(null); // display stream
  const videoRef = useRef(null); // hidden <video> playing the stream
  const canvasRef = useRef(null); // offscreen crop canvas
  const rafRef = useRef(0);
  const recRef = useRef(null);
  const chunksRef = useRef([]);

  const drawFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const phone = getPhoneEl();
    if (video && canvas && phone && video.videoWidth) {
      // Map CSS pixels of the phone rect into the captured video's pixels.
      const scale = video.videoWidth / window.innerWidth;
      const r = phone.getBoundingClientRect();
      const sx = r.left * scale, sy = r.top * scale;
      const sw = r.width * scale, sh = r.height * scale;
      if (canvas.width !== Math.round(sw)) { canvas.width = Math.round(sw); canvas.height = Math.round(sh); }
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    }
    rafRef.current = requestAnimationFrame(drawFrame);
  }, [getPhoneEl]);

  const arm = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        // Chrome: default the picker to this tab so it's one tap.
        preferCurrentTab: true,
        audio: false,
      });
      streamRef.current = stream;
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      videoRef.current = video;
      canvasRef.current = document.createElement('canvas');
      // If the user stops sharing from the browser UI, tear down cleanly.
      stream.getVideoTracks()[0].addEventListener('ended', () => disarm());
      rafRef.current = requestAnimationFrame(drawFrame);
      setArmed(true);
    } catch (e) {
      setError(e.name === 'NotAllowedError' ? 'הלכידה בוטלה' : String(e.message || e));
    }
  }, [drawFrame]);

  const disarm = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    try { recRef.current?.state === 'recording' && recRef.current.stop(); } catch { /* ignore */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null; videoRef.current = null;
    setArmed(false); setRecording(false);
  }, []);

  const download = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const screenshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) { setError('קודם חבר לכידה'); return; }
    canvas.toBlob((blob) => blob && download(blob, `areto-${stamp()}.png`), 'image/png');
  }, []);

  const startRecording = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) { setError('קודם חבר לכידה'); return; }
    chunksRef.current = [];
    const stream = canvas.captureStream(30);
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    const rec = new MediaRecorder(stream, { mimeType: mime });
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = () => download(new Blob(chunksRef.current, { type: 'video/webm' }), `areto-${stamp()}.webm`);
    rec.start();
    recRef.current = rec;
    setRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* ignore */ }
    setRecording(false);
  }, []);

  return { armed, recording, error, arm, disarm, screenshot, startRecording, stopRecording };
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}
