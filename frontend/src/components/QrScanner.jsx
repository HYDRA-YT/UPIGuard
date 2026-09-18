import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

export default function QrScannerModal({ onClose, onScan }) {
  const videoRef = useRef(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const [cameraError, setCameraError] = useState('');
  const [pasteValue, setPasteValue] = useState('');

  useEffect(() => {
    let raf = 0;
    let stream = null;
    let stopped = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const tick = () => {
      if (stopped) return;
      raf = requestAnimationFrame(tick);
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return;
      try {
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(video, 0, 0, w, h);
        const img = ctx.getImageData(0, 0, w, h);
        const code = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
        if (code && code.data) {
          stopped = true;
          cancelAnimationFrame(raf);
          onScanRef.current(code.data);
        }
      } catch {
        // keep scanning — frame data can rarely be unreadable
      }
    };

    (async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('no-camera');
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (stopped || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        tick();
      } catch {
        setCameraError('Camera unavailable or permission denied. You can paste the QR data below instead.');
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handlePaste = () => {
    const value = pasteValue.trim();
    if (value) onScan(value);
  };

  return (
    <div className="qr-overlay" role="dialog" aria-modal="true" aria-label="Scan UPI QR code">
      <div className="qr-modal">
        <div className="qr-modal-header">
          <h3>Scan UPI QR Code</h3>
          <button type="button" className="qr-close" onClick={onClose} aria-label="Close scanner">✕</button>
        </div>

        <div className="qr-video-wrap">
          <video ref={videoRef} className="qr-video" muted playsInline />
          <div className="qr-frame" aria-hidden="true" />
          {cameraError ? (
            <div className="qr-camera-error">{cameraError}</div>
          ) : (
            <div className="qr-hint">Point your camera at any UPI QR code</div>
          )}
        </div>

        <div className="qr-divider"><span>or paste the QR data</span></div>

        <div className="qr-paste">
          <input
            className="form-input"
            type="text"
            value={pasteValue}
            onChange={(e) => setPasteValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handlePaste(); }}
            placeholder="upi://pay?pa=name@bank&pn=Name&am=0"
            aria-label="Paste QR content"
          />
          <button type="button" className="btn btn-primary qr-analyze" onClick={handlePaste} disabled={!pasteValue.trim()}>
            Analyze QR
          </button>
        </div>

        <button type="button" className="btn btn-ghost qr-cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}