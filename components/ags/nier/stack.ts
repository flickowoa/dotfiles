import GLib from "gi://GLib"
import { timeout } from "astal"
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "../env.ts"

const BASE = 70
const GAP = 12
const EDGE = 18
const COL_GAP = 16

const MODAL_H: Record<string, number> = {
    weather: 500,
    wifi: 520,
    disk: 220,
    battery: 200,
    sliders: 80,
}

const MODAL_W: Record<string, number> = {
    weather: 590,
    wifi: 530,
    disk: 430,
    battery: 410,
    sliders: 260,
}

type Entry = { name: string; win: any }
const stack: Entry[] = []

const recalc = () => {
    let y = BASE
    let right = EDGE
    let colW = 0
    const bottom = Math.max(BASE + 120, SCREEN_HEIGHT - EDGE)
    const availableH = Math.max(120, SCREEN_HEIGHT - EDGE * 2)

    for (const e of stack) {
        const h = MODAL_H[e.name] ?? 200
        const w = MODAL_W[e.name] ?? 380
        if (y > BASE && y + h > bottom) {
            right += colW + COL_GAP
            y = BASE
            colW = 0
        }

        const maxRight = Math.max(EDGE, SCREEN_WIDTH - w - EDGE)
        const placedRight = Math.min(right, maxRight)
        const placedTop = h > availableH ? EDGE : y
        if (e.win) {
            try { e.win.marginTop = placedTop } catch {}
            try { e.win.marginRight = placedRight } catch {}
        }
        y += h + GAP
        colW = Math.max(colW, w)
    }
}

export const modalOpen = (name: string, win: any) => {
    const existing = stack.find(e => e.name === name)
    if (existing) {
        existing.win = win
        recalc()
        return
    }
    stack.push({ name, win })
    recalc()
}

export const modalClose = (name: string) => {
    const idx = stack.findIndex(e => e.name === name)
    if (idx < 0) return
    stack.splice(idx, 1)
    recalc()
}

export const addDragDismiss = (
    win: any,
    onClose: () => void,
    startMarginRight: number = 20,
): () => void => {
    let dragStartX = 0
    let isDragging = false
    let animating = false
    let springId: number | null = null
    let restMarginRight = startMarginRight

    const cancelAnimation = () => {
        if (springId !== null) { try { GLib.source_remove(springId) } catch {}; springId = null }
        animating = false
    }

    const springEasing = (t: number): number => {
        const damping = 0.55
        const freq = 1.6
        const decay = Math.exp(-damping * t * 8)
        const phase = Math.cos(freq * t * 4)
        return 1 - decay * phase
    }

    const springBack = (from: number) => {
        cancelAnimation()
        animating = true
        const start = from
        const end = restMarginRight
        const dur = 450
        const t0 = Date.now()
        const tick = () => {
            const t = Math.min((Date.now() - t0) / dur, 1)
            const e = springEasing(t)
            try { win.marginRight = start + (end - start) * e } catch {}
            if (t < 1) { springId = timeout(16, tick) } else { animating = false; springId = null }
        }
        tick()
    }

    const animateDismiss = () => {
        cancelAnimation()
        animating = true
        const start = (win.marginRight as number) || startMarginRight
        const end = 600
        const dur = 300
        const t0 = Date.now()
        const tick = () => {
            const t = Math.min((Date.now() - t0) / dur, 1)
            const e = t * t * t
            try { win.marginRight = start + (end - start) * e } catch {}
            if (t < 1) { springId = timeout(16, tick) } else { animating = false; springId = null; onClose() }
        }
        tick()
    }

    const bp = win.connect("button-press-event", (_w: any, ev: any) => {
        if (animating) { cancelAnimation(); return true }
        const btn = ev?.get_button?.()?.[1] ?? 0
        if (btn !== 1) return false
        const coords = ev.get_coords?.()
        if (Array.isArray(coords)) dragStartX = coords[1]
        restMarginRight = (win.marginRight as number) || startMarginRight
        isDragging = false
        return false
    })

    const mp = win.connect("motion-notify-event", (_w: any, ev: any) => {
        if (animating) return false
        if (dragStartX === 0) return false
        isDragging = true
        const coords = ev.get_coords?.()
        if (!Array.isArray(coords)) return false
        const dx = coords[1] - dragStartX
        try { win.marginRight = Math.max(5, restMarginRight - dx * 0.85) } catch {}
        return false
    })

    const rp = win.connect("button-release-event", (_w: any, ev: any) => {
        if (animating) return false
        if (!isDragging) { dragStartX = 0; return false }
        const coords = ev.get_coords?.()
        if (!Array.isArray(coords)) { dragStartX = 0; return false }
        const dx = coords[1] - dragStartX
        if (dx < -100) {
            animateDismiss()
        } else {
            springBack(win.marginRight as number || restMarginRight)
        }
        dragStartX = 0; isDragging = false
        return false
    })

    return () => {
        cancelAnimation()
        try { win.disconnect(bp) } catch {}
        try { win.disconnect(mp) } catch {}
        try { win.disconnect(rp) } catch {}
    }
}
