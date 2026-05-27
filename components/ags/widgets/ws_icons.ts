
const TAU = Math.PI * 2

export const drawWsIcon = (
    ctx: any, idx: number, S: number,
    r: number, g: number, b: number,
) => {
    const i = (((idx - 1) % 9) + 9) % 9
    ctx.save()
    ctx.setSourceRGBA(r, g, b, 1)
    ctx.setLineCap(1)   // round
    ctx.setLineJoin(1)  // round
    const lw = Math.max(1.4, S * 0.075)
    ctx.setLineWidth(lw)

    const move = (u: number, v: number) => ctx.moveTo(u * S, v * S)
    const line = (u: number, v: number) => ctx.lineTo(u * S, v * S)
    const dot  = (u: number, v: number, rr: number) => {
        ctx.newSubPath(); ctx.arc(u * S, v * S, rr * S, 0, TAU); ctx.fill()
    }

    switch (i) {
        case 0: {
            move(0.30, 0.64); line(0.40, 0.72); line(0.90, 0.10)
            ctx.closePath(); ctx.fill()
            ctx.setLineWidth(S * 0.10)
            move(0.12, 0.88); line(0.30, 0.66); ctx.stroke()
            ctx.setLineWidth(S * 0.05)
            move(0.20, 0.62); line(0.40, 0.82); ctx.stroke()
            break
        }
        case 1: {
            move(0.50, 0.10); line(0.74, 0.44); line(0.50, 0.64); line(0.30, 0.40)
            ctx.closePath(); ctx.fill()
            move(0.66, 0.62); line(0.80, 0.76); line(0.66, 0.88); line(0.54, 0.74)
            ctx.closePath(); ctx.fill()
            move(0.30, 0.70); line(0.40, 0.80); line(0.30, 0.90); line(0.22, 0.80)
            ctx.closePath(); ctx.fill()
            break
        }
        case 2: {
            ctx.newSubPath(); ctx.arc(0.5 * S, 0.5 * S, 0.36 * S, 0, TAU); ctx.stroke()
            move(0.34, 0.66); line(0.64, 0.36); ctx.stroke()       // shaft
            move(0.64, 0.36); line(0.50, 0.37); ctx.stroke()       // head wing
            move(0.64, 0.36); line(0.63, 0.51); ctx.stroke()       // head wing
            break
        }
        case 3: {
            const cx = 0.5 * S, cy = 0.5 * S
            for (let k = 0; k < 5; k++) {
                const a = -Math.PI / 2 + k * (TAU / 5)
                ctx.save()
                ctx.translate(cx, cy)
                ctx.rotate(a)
                ctx.newSubPath()
                ctx.moveTo(0.10 * S, 0)
                ctx.curveTo(0.24 * S, 0.12 * S, 0.40 * S, 0.06 * S, 0.46 * S, 0)
                ctx.curveTo(0.40 * S, -0.06 * S, 0.24 * S, -0.12 * S, 0.10 * S, 0)
                ctx.closePath(); ctx.fill()
                ctx.restore()
            }
            dot(0.5, 0.5, 0.07)
            break
        }
        case 4: {
            move(0.28, 0.88); line(0.40, 0.88); line(0.34, 0.10)
            ctx.closePath(); ctx.fill()
            move(0.60, 0.88); line(0.72, 0.88); line(0.66, 0.10)
            ctx.closePath(); ctx.fill()
            break
        }
        case 5: {
            ctx.setLineWidth(S * 0.06)
            ctx.rectangle(0.26 * S, 0.22 * S, 0.48 * S, 0.42 * S); ctx.stroke()
            for (const px of [0.37, 0.50, 0.63]) { move(px, 0.64); line(px, 0.80) }
            ctx.stroke()
            dot(0.50, 0.43, 0.07)
            break
        }
        case 6: {
            ctx.setLineWidth(S * 0.06)
            ctx.newSubPath(); ctx.arc(0.5 * S, 0.5 * S, 0.30 * S, 0, TAU); ctx.stroke()
            move(0.50, 0.10); line(0.50, 0.26)   // N
            move(0.50, 0.74); line(0.50, 0.90)   // S
            move(0.10, 0.50); line(0.26, 0.50)   // W
            move(0.74, 0.50); line(0.90, 0.50)   // E
            ctx.stroke()
            dot(0.50, 0.50, 0.06)
            break
        }
        case 7: {
            ctx.rectangle(0.18 * S, 0.24 * S, 0.52 * S, 0.13 * S); ctx.fill()
            ctx.rectangle(0.34 * S, 0.44 * S, 0.46 * S, 0.13 * S); ctx.fill()
            ctx.rectangle(0.16 * S, 0.64 * S, 0.38 * S, 0.13 * S); ctx.fill()
            break
        }
        case 8: {
            ctx.setLineWidth(S * 0.07)
            const cx = 0.5 * S, cy = 0.5 * S, R = 0.36 * S
            ctx.newSubPath()
            for (let k = 0; k < 6; k++) {
                const a = -Math.PI / 2 + k * (TAU / 6)
                const px = cx + R * Math.cos(a), py = cy + R * Math.sin(a)
                if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
            }
            ctx.closePath(); ctx.stroke()
            dot(0.5, 0.5, 0.10)
            break
        }
    }

    ctx.restore()
}
