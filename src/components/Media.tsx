import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';

export function useBlobUrl(id: string | undefined, mime: string, key?: CryptoKey) {
  const s = useStore(); const [url, setUrl] = useState(''); const [err, setErr] = useState('');
  useEffect(() => {
    let u = ''; let dead = false; setUrl(''); setErr('');
    if (!id) return;
    s.getBlob(id, key).then(b => { if (dead) return; u = URL.createObjectURL(new Blob([b as BlobPart], { type: mime })); setUrl(u); }).catch(e => !dead && setErr(e.message));
    return () => { dead = true; if (u) URL.revokeObjectURL(u); };
  }, [id, mime, key]); // eslint-disable-line
  return { url, err };
}
export function Img({ id, alt, style }: { id: string; alt: string; style?: React.CSSProperties }) {
  const { url, err } = useBlobUrl(id, 'image/jpeg');
  return err ? <span className="muted small">{err}</span> : url ? <img src={url} alt={alt} style={{ maxWidth: '100%', borderRadius: 10, ...style }} /> : <span className="muted small">Loading…</span>;
}
export function Audio({ id, mime }: { id: string; mime: string }) {
  const { url, err } = useBlobUrl(id, mime);
  return err ? <span className="muted small">{err}</span> : url ? <audio controls src={url} style={{ width: '100%' }} /> : <span className="muted small">Loading…</span>;
}
// resize an image file to JPEG bytes (max 1600px) to keep storage small
export async function imageToJpeg(f: File, max = 1600): Promise<Uint8Array> {
  const bmp = await createImageBitmap(f); const sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
  const x = c.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height);
  const b = await new Promise<Blob | null>(r => c.toBlob(r, 'image/jpeg', 0.85)); if (!b) throw new Error('Could not read that image.');
  return new Uint8Array(await b.arrayBuffer());
}
