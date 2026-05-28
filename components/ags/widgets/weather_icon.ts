// Weather condition → monochrome vector icon, drawn in Cairo so it recolours
// with the theme (same approach as ws_icons.ts). Maps the free-text condition
// from wttr.in (e.g. "Partly cloudy", "Light rain") to a small glyph.
/// Default city set is usually London, but you can search directly on modal to set your location to curl on wttr.in

const TAU = Math.PI * 2

type Kind = "sun" | "moon" | "partly" | "cloud" | "rain" | "snow" | "thunder" | "fog"

export const weatherKind = (condition: string): Kind => {
    const c = (condition || "").toLowerCase()
    if (/(thunder|storm|lightning)/.test(c)) return "thunder"
    if (/(snow|sleet|blizzard|ice)/.test(c))  return "snow"
    if (/(rain|drizzle|shower)/.test(c))       return "rain"
    if (/(fog|mist|haze|smoke)/.test(c))       return "fog"
    if (/(partly|partly cloudy|few clouds|scattered)/.test(c)) return "partly"
    if (/(overcast|cloud)/.test(c))            return "cloud"
    if (/(clear)/.test(c)) {
        const h = new Date().getHours()
        return (h >= 20 || h < 6) ? "moon" : "sun"
    }
    if (/(sun|fair)/.test(c)) return "sun"
    return "cloud"
}

// Draw a cloud icon  
const cloud = (ctx: any, S: number, cx = 0.5, cy = 0.58, scale = 1) => {
    const r = 0.16 * S * scale
    const X = cx * S, Y = cy * S
    ctx.newSubPath()
    ctx.arc(X - 0.16 * S * scale, Y, r, 0, TAU)
    ctx.arc(X + 0.14 * S * scale, Y, r * 0.95, 0, TAU)
    ctx.arc(X, Y - 0.12 * S * scale, r * 1.05, 0, TAU)
    ctx.rectangle(X - 0.30 * S * scale, Y - 0.02 * S * scale, 0.60 * S * scale, r)
    ctx.fill()
}

export const drawWeatherIcon = (
    ctx: any, condition: string, S: number,
    r: number, g: number, b: number,
) => {
    const kind = weatherKind(condition)
    ctx.save()
    ctx.setSourceRGBA(r, g, b, 1)
    ctx.setLineCap(1)
    ctx.setLineJoin(1)
    const lw = Math.max(1.3, S * 0.06)
    ctx.setLineWidth(lw)
    const px = (u: number) => u * S

    const sun = (cx: number, cy: number, rad: number, rays: boolean) => {
        if (rays) {
            ctx.setLineWidth(Math.max(1.3, S * 0.055))
            for (let k = 0; k < 8; k++) {
                const a = k * (TAU / 8)
                const r1 = rad + 0.06 * S, r2 = rad + 0.17 * S
                ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1)
                ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2)
            }
            ctx.stroke()
        }
        ctx.newSubPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.fill()
    }

    switch (kind) {
        case "sun":
            sun(px(0.5), px(0.5), 0.20 * S, true)
            break
        case "moon": {
            // crescent: full disc minus an offset disc (even-odd)
            ctx.newSubPath(); ctx.arc(px(0.52), px(0.5), 0.26 * S, 0, TAU)
            ctx.newSubPath(); ctx.arc(px(0.63), px(0.43), 0.24 * S, 0, TAU)
            try { ctx.setFillRule(1) } catch {}   // EVEN_ODD
            ctx.fill()
            try { ctx.setFillRule(0) } catch {}
            break
        }
        case "partly":
            sun(px(0.36), px(0.36), 0.15 * S, true)
            cloud(ctx, S, 0.56, 0.62, 1)
            break
        case "cloud":
            cloud(ctx, S, 0.5, 0.52, 1.05)
            break
        case "rain":
            cloud(ctx, S, 0.5, 0.44, 1)
            ctx.setLineWidth(Math.max(1.3, S * 0.06))
            for (const x of [0.34, 0.5, 0.66]) {
                ctx.moveTo(px(x), px(0.70)); ctx.lineTo(px(x - 0.05), px(0.88))
            }
            ctx.stroke()
            break
        case "snow":
            cloud(ctx, S, 0.5, 0.44, 1)
            for (const [x, y] of [[0.34, 0.78], [0.5, 0.84], [0.66, 0.78]]) {
                ctx.newSubPath(); ctx.arc(px(x), px(y), 0.035 * S, 0, TAU); ctx.fill()
            }
            break
        case "thunder":
            cloud(ctx, S, 0.5, 0.42, 1)
            ctx.moveTo(px(0.54), px(0.62)); ctx.lineTo(px(0.42), px(0.78))
            ctx.lineTo(px(0.52), px(0.78)); ctx.lineTo(px(0.40), px(0.95))
            ctx.lineTo(px(0.60), px(0.72)); ctx.lineTo(px(0.50), px(0.72))
            ctx.closePath(); ctx.fill()
            break
        case "fog":
            ctx.setLineWidth(Math.max(1.4, S * 0.07))
            for (let i = 0; i < 4; i++) {
                const y = 0.30 + i * 0.15
                ctx.moveTo(px(0.16 + (i % 2) * 0.06), px(y))
                ctx.lineTo(px(0.84 - (i % 2) * 0.06), px(y))
            }
            ctx.stroke()
            break
    }
    ctx.restore()
}
