import { useAssetUrl } from '@/hooks/useAssetUrl'
import { cn } from '@/lib/utils'

/** A note's cover image, cropped to fill its box. Decorative, so it has no alt text. */
export function NoteCover({ assetId, className }: { assetId: string; className?: string }) {
  const url = useAssetUrl(assetId)
  return (
    <div className={cn('overflow-hidden bg-muted', className)}>
      {url && <img src={url} alt="" loading="lazy" draggable={false} className="size-full object-cover" />}
    </div>
  )
}
