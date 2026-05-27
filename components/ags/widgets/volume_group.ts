import { Label } from "../widget.ts"
import { Variable } from "astal"
import { assetsDir } from "../env.ts"
import { NierButton } from "../nier/buttons.ts"
import { NierSliderButton } from "../nier/slider.ts"
import { button_label_2, button_slider_width, settings_title_bottom, settings_title_top } from "../scaling.ts"

import AstalWp from "gi://AstalWp"
const audio = AstalWp.Wp.get_default().audio

const GROUP_HEADING_TOP = Math.round(settings_title_top * 0.55)
const GROUP_HEADING_BOTTOM = Math.round(settings_title_bottom * 0.42)
const GROUP_HEADING_CSS = `margin-top:${GROUP_HEADING_TOP}px;margin-bottom:${GROUP_HEADING_BOTTOM}px;font-size:40px;padding-left:24px;`
const GROUP_FONT = Math.max(18, Math.round(button_label_2 * 0.72))

const volume_slider = ({
    volume_ratio,
    label,
    endpoint = null as any,
    useAssetsDir = assetsDir,
}: {
    volume_ratio: Variable<number>
    label: string
    endpoint?: any
    useAssetsDir?: () => string
}) => {
    const slider = NierSliderButton({
        useAssetsDir,
        label,
        boxes: button_slider_width,
        font_size: GROUP_FONT,
        ratio: volume_ratio,
    })

    const unsub = volume_ratio.subscribe((v) => {
        if (endpoint) {
            const current = endpoint.volume ?? 0
            if (Math.round(current * 100) !== Math.round(v * 100)) {
                endpoint.volume = v
            }
        } else {
            const sink = audio.defaultSpeaker
            if (sink && Math.round((sink.volume ?? 0) * 100) !== Math.round(v * 100)) {
                sink.volume = v
            }
        }
    })

    if (endpoint) {
        endpoint.connect("notify::volume", () => {
            volume_ratio.set(endpoint.volume ?? 0)
        })
    } else {
        audio.connect("notify::default-speaker", () => {
            const sink = audio.defaultSpeaker
            if (sink) volume_ratio.set(sink.volume ?? 0)
        })
    }

    slider.connect("destroy", () => unsub())
    return slider
}

export const VolumeGroup = ({
    go_to = async (_buttons: any[], _parent: any) => {},
    volume_ratio = new Variable<number>(0),
    mic_volume_ratio = new Variable<number>(0),
    passAssetsDir = assetsDir,
}: {
    go_to?: (buttons: any[], parent: any) => Promise<void>
    volume_ratio?: Variable<number>
    mic_volume_ratio?: Variable<number>
    passAssetsDir?: () => string
}): any[] => {
    const defaultSpeaker = audio.defaultSpeaker
    const defaultMic = audio.defaultMicrophone

    if (defaultSpeaker) volume_ratio.set(defaultSpeaker.volume ?? 0)
    if (defaultMic) mic_volume_ratio.set(defaultMic.volume ?? 0)

    return [
        Label({ hpack: "start", label: "VOLUME", className: "heading", css: GROUP_HEADING_CSS }),
        volume_slider({ useAssetsDir: passAssetsDir, label: "Speaker", volume_ratio }),
        volume_slider({ useAssetsDir: passAssetsDir, label: "Microphone", volume_ratio: mic_volume_ratio }),
        NierButton({
            useAssetsDir: passAssetsDir,
            container_style: "padding-top: 28px;",
            label: "Applications",
            font_size: GROUP_FONT,
            vpack: "end",
            handleClick: async (self: any, _event: any) => {
                const streams = audio.streams ?? []
                await go_to(
                    [
                        Label({ hpack: "start", label: "APPS", className: "heading", css: GROUP_HEADING_CSS }),
                        ...streams.map((stream: any) =>
                            volume_slider({
                                useAssetsDir: passAssetsDir,
                                label: stream.description ?? "App",
                                endpoint: stream,
                                volume_ratio: new Variable<number>(stream.volume ?? 0),
                            })
                        ),
                    ],
                    self
                )
            },
        }),
        Label({ hpack: "start", label: "OUTPUT", className: "heading", css: GROUP_HEADING_CSS }),
        ...(audio.speakers ?? []).map((s: any) =>
            volume_slider({ useAssetsDir: passAssetsDir, label: s.description ?? "Speaker", endpoint: s, volume_ratio: new Variable<number>(s.volume ?? 0) })
        ),
        Label({ hpack: "start", label: "INPUT", className: "heading", css: GROUP_HEADING_CSS }),
        ...(audio.microphones ?? []).map((m: any) =>
            volume_slider({ useAssetsDir: passAssetsDir, label: m.description ?? "Mic", endpoint: m, volume_ratio: new Variable<number>(m.volume ?? 0) })
        ),
    ]
}
