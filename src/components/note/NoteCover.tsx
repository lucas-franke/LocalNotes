import { useAssetUrl } from '@/hooks/useAssetUrl'
import type { ResolvedCover } from '@/lib/cover'
import { gradientById, gradientCss } from '@/lib/gradients'
import { cn } from '@/lib/utils'

/** A note's cover (image or gradient), cropped to fill its box. Decorative, so it has no alt text. */
export function NoteCover({ cover, className }: { cover: ResolvedCover; className?: string }) {
  return cover.kind === 'image' ? (
    <ImageCover assetId={cover.assetId} className={className} />
  ) : (
    <div
      data-testid="cover-gradient"
      className={cn('overflow-hidden', className)}
      style={{ backgroundImage: gradientCss(gradientById(cover.id)) }}
    />
  )
}

function ImageCover({ assetId, className }: { assetId: string; className?: string }) {
  const url = useAssetUrl(assetId)
  return (
    <div className={cn('overflow-hidden bg-muted', className)}>
      {url && <img src={url} alt="" loading="lazy" draggable={false} className="size-full object-cover" />}
    </div>
  )
}
