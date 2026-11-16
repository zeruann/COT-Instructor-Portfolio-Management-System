// client/src/hooks/useSignedUrl.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchSignedFileUrl } from '../api/documents';

// key -> { promise } while in flight, or { data, expiresAt } once resolved
const cache = new Map();

const keyOf = (docId, version) => `${docId}:${version ?? 'latest'}`;

// Cache for slightly less than the server-side ticket lifetime (expiresInSeconds)
const ttlMsFor = (data) => Math.max(30, (data?.expiresInSeconds ?? 240) - 30) * 1000;

/** Call on logout so the next user never sees a previous user's cached links. */
export function clearSignedUrlCache() {
  cache.clear();
}

/**
 * Resolve a short-lived file link for a document version.
 * Concurrent callers share one request; results are cached until just before expiry.
 */
export function getSignedUrl(docId, version, { force = false } = {}) {
  const key = keyOf(docId, version);
  const hit = cache.get(key);

  if (!force && hit) {
    if (hit.promise) return hit.promise;
    if (hit.expiresAt > Date.now()) return Promise.resolve(hit.data);
  }

  const promise = fetchSignedFileUrl(docId, version)
    .then((data) => {
      cache.set(key, { data, expiresAt: Date.now() + ttlMsFor(data) });
      return data;
    })
    .catch((err) => {
      cache.delete(key);
      throw err;
    });

  cache.set(key, { promise });
  return promise;
}

/** Warm the cache (e.g. on row hover) so the modal opens instantly. */
export function prefetchSignedUrl(docId, version) {
  if (!docId) return;
  getSignedUrl(docId, version).catch(() => {});
}

export function useSignedUrl(docId, version, enabled = true) {
  const [state, setState] = useState({
    url: null,
    loading: false,
    error: false,
  });
  const [nonce, setNonce] = useState(0);
  const forceRef = useRef(false);

  useEffect(() => {
    if (!enabled || !docId) return;

    let cancelled = false;
    const force = forceRef.current;
    forceRef.current = false;

    setState({ url: null, loading: true, error: false });

    getSignedUrl(docId, version, { force })
      .then((data) => {
        if (cancelled) return;
        setState({ url: data.url, loading: false, error: false });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ url: null, loading: false, error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, docId, version, nonce]);

  /** Force a fresh link (use when the current one fails to load). */
  const refresh = useCallback(() => {
    forceRef.current = true;
    setNonce((n) => n + 1);
  }, []);

  return { ...state, refresh };
}
