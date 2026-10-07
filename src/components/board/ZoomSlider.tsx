import { Panel, useReactFlow, useStore } from '@xyflow/react'
import { Maximize, Minus, Plus } from 'lucide-react'
import { Tip } from '@/components/Tip'
import { Button } from '@/components/ui/button'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 2
// The slider works on a log scale, so every step feels like the same amount of zoom
const toSlider = (zoom: number) => Math.log(zoom)
const fromSlider = (value: number) => Math.exp(value)

/** Zoom out / slider / zoom in, the zoom level (click for 100%) and "fit all", in the bottom-left corner. */
export function ZoomSlider() {
  const { zoomTo, zoomIn, zoomOut, fitView } = useReactFlow()
  const zoom = useStore((s) => s.transform[2])
  const percent = Math.round(zoom * 100)

  return (
    <Panel
      position="bottom-left"
      className="nodrag nopan flex items-center gap-0.5 rounded-lg border bg-background p-0.5 shadow-sm"
    >
      <Tip label="Zoom out">
        <Button variant="ghost" size="icon-xs" className="size-8" aria-label="Zoom out" onClick={() => void zoomOut({ duration: 150 })}>
          <Minus />
        </Button>
      </Tip>
      <input
        type="range"
        aria-label="Zoom"
        aria-valuetext={`${percent}%`}
        min={toSlider(MIN_ZOOM)}
        max={toSlider(MAX_ZOOM)}
        step={0.01}
        value={toSlider(zoom)}
        onChange={(e) => void zoomTo(fromSlider(Number(e.target.value)))}
        className="h-8 w-28 cursor-pointer accent-primary"
      />
      <Tip label="Zoom in">
        <Button variant="ghost" size="icon-xs" className="size-8" aria-label="Zoom in" onClick={() => void zoomIn({ duration: 150 })}>
          <Plus />
        </Button>
      </Tip>
      <Tip label="Reset to 100%">
        <Button
          variant="ghost"
          size="xs"
          className="h-8 w-12 justify-center tabular-nums"
          aria-label={`Zoom ${percent}%, reset to 100%`}
          onClick={() => void zoomTo(1, { duration: 150 })}
        >
          {percent}%
        </Button>
      </Tip>
      <Tip label="Fit everything in view">
        <Button
          variant="ghost"
          size="icon-xs"
          className="size-8"
          aria-label="Fit everything in view"
          onClick={() => void fitView({ duration: 250, padding: 0.2, maxZoom: 1 })}
        >
          <Maximize />
        </Button>
      </Tip>
    </Panel>
  )
}
