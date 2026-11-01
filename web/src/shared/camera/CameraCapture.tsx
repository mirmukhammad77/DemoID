import { useEffect, useRef, useState } from 'react';
interface Props { busy: boolean; submitLabel: string; onSubmit: (photo: Blob) => void; onBack: () => void }
export function CameraCapture({ busy, submitLabel, onSubmit, onBack }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [revision, setRevision] = useState(0);
  const [ready, setReady] = useState(false);
  const [capture, setCapture] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  function stop() { stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; }
  useEffect(() => {
    let cancelled = false; setReady(false); setError('');
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) { setError('Camera access needs a supported browser on localhost or HTTPS.'); return; }
      try {
        const media = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } });
        if (cancelled) { media.getTracks().forEach(track => track.stop()); return; }
        stream.current = media;
        if (video.current) { video.current.srcObject = media; await video.current.play(); }
      } catch (failure) {
        if (!cancelled) {
          stop();
          const name = failure instanceof DOMException ? failure.name : '';
          setError(name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access in your browser, then try again.' : 'Cannot start your camera. Check that it is connected and not in use by another app.');
        }
      }
    }
    void start();
    return () => { cancelled = true; stop(); };
  }, [revision]);
  useEffect(() => {
    if (!capture) { setPreview(null); return; }
    const url = URL.createObjectURL(capture); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [capture]);
  async function takePhoto() {
    const element = video.current;
    if (!element?.videoWidth || !element.videoHeight) return;
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1280 / Math.max(element.videoWidth, element.videoHeight));
    canvas.width = Math.round(element.videoWidth * scale); canvas.height = Math.round(element.videoHeight * scale);
    canvas.getContext('2d')!.drawImage(element, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob || blob.size > 5_242_880) { setError('Could not capture a photo. Please try again.'); return; }
    setCapture(blob); stop(); setReady(false);
  }
  function retake() { setCapture(null); setRevision(value => value + 1); }
  return <div className="camera-section">
    <div className="camera-frame">
      {capture && preview ? <img src={preview} alt="Your captured face" /> : <><video ref={video} playsInline muted onLoadedData={() => setReady(true)} /><div className="face-guide" aria-hidden="true" />{!ready && <span className="camera-placeholder">Waiting for camera…</span>}</>}
      <span className="camera-tag">{capture ? 'Photo captured' : 'Camera preview'}</span>
    </div>
    <p className="hint">Face the camera in good light. Keep only your face in the frame.</p>
    {error && <p className="notice error" role="alert">{error}</p>}
    <div className="actions">
      {capture ? <><button className="secondary" type="button" disabled={busy} onClick={retake}>Retake photo</button><button type="button" disabled={busy} onClick={() => onSubmit(capture)}>{busy ? 'Verifying…' : submitLabel}</button></> : <button type="button" disabled={busy || !ready} onClick={() => void takePhoto()}>Capture photo</button>}
    </div>
    {error && !capture && <button className="text-button" type="button" onClick={retake}>Try camera again</button>}
    <button className="text-button back" type="button" disabled={busy} onClick={onBack}>← Back to details</button>
  </div>;
}
