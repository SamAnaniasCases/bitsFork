"use client"

import { useRef, useEffect } from 'react'

/**
 * Hook that converts vertical mouse wheel into horizontal scroll on a container.
 * - Scrolls the table horizontally first until it reaches the edge.
 * - After reaching the edge, waits briefly then allows vertical page scrolling.
 * - Prevents simultaneous horizontal + vertical scrolling.
 */
export function useHorizontalDragScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)
  const atEdgeCount = useRef(0)
  const edgeThreshold = 3 // number of wheel ticks at the edge before releasing to vertical scroll

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      // If no horizontal overflow, let the page scroll normally
      if (el.scrollWidth <= el.clientWidth) return

      const maxScrollLeft = el.scrollWidth - el.clientWidth
      const atStart = el.scrollLeft <= 0
      const atEnd = el.scrollLeft >= maxScrollLeft - 1

      // Check if we're at the edge in the scroll direction
      const scrollingRight = e.deltaY > 0
      const scrollingLeft = e.deltaY < 0
      const atEdge = (scrollingRight && atEnd) || (scrollingLeft && atStart)

      if (atEdge) {
        atEdgeCount.current++
        // If user keeps scrolling at the edge, eventually release to vertical
        if (atEdgeCount.current >= edgeThreshold) {
          return // let the page scroll vertically
        }
      } else {
        // Reset the edge counter when actively scrolling horizontally
        atEdgeCount.current = 0
      }

      // Prevent vertical scroll and convert to horizontal
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }

    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      el.removeEventListener('wheel', onWheel)
    }
  }, [])

  return ref
}
