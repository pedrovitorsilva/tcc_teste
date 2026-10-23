import { OVERTURE_BUCKET_URL, OVERTURE_FALLBACK_RELEASE } from '@/config/buildings';

let releaseRequest: Promise<string> | null = null;

/** Release mais nova do Overture no bucket (`AAAA-MM-DD.N` ordena como string). Uma vez por sessão. */
export function latestOvertureRelease(): Promise<string> {
  // ponytail: a release mais nova pode aparecer na listagem antes do upload
  // terminar; se der 404 nessa janela, escolher a mais nova que responde HEAD.
  releaseRequest ??= fetch(`${OVERTURE_BUCKET_URL}/?list-type=2&prefix=tiles/&delimiter=/`)
    .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then((xml) => {
      const releases = [...xml.matchAll(/<Prefix>tiles\/([^/<]+)\/<\/Prefix>/g)].map((m) => m[1]).sort();
      if (releases.length === 0) throw new Error('listagem vazia');
      return releases[releases.length - 1];
    })
    .catch((err: Error) => {
      console.warn(`[pmtiles] release do Overture indisponível (${err.message}) — usando ${OVERTURE_FALLBACK_RELEASE}.`);
      return OVERTURE_FALLBACK_RELEASE;
    });
  return releaseRequest;
}
