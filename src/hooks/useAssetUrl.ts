import { useEffect, useState } from 'react'
import { db } from '@/db/db'

/**
 * Object URL for a stored image: `undefined` while loading, `null` if the image is missing.
 * Assets never change once stored, so this reads once and revokes the URL on unmount.
 */
export function useAssetUrl(assetId: string) {
  const [url, setUrl] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null
    void db.assets.get(assetId).then((asset) => {
      if (cancelled) return
      objectUrl = asset ? URL.createObjectURL(asset.blob) : null
      setUrl(objectUrl)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [assetId])

  return url
}
