import { useEffect, useState } from 'react';
import { planAssets } from '../data/assets';
export function usePlanImage(assetId?: string) {
  const [state, setState] = useState<{
    assetId?: string;
    image?: HTMLImageElement;
    error?: string;
    loading: boolean;
  }>({ loading: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true,
      url: string | undefined;
    setState({ assetId, loading: !!assetId });
    if (assetId)
      void (async () => {
        try {
          const asset = await planAssets.get(assetId);
          if (!asset)
            throw new Error(
              'Der Hintergrund fehlt im lokalen Speicher. Importieren Sie die Datei im Raumeditor erneut. Ihre Objekte und Buchungen sind weiterhin vorhanden.',
            );
          if (!live) return;
          url = URL.createObjectURL(asset.image);
          const image = new Image();
          image.src = url;
          await image.decode();
          if (live) setState({ assetId, image, loading: false });
        } catch (e) {
          if (live) setState({ assetId, error: (e as Error).message, loading: false });
        }
      })();
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [assetId, attempt]);
  return {
    ...(state.assetId === assetId ? state : { loading: !!assetId }),
    retry: () => setAttempt((n) => n + 1),
  };
}
