let _toggle = () => {}
let _open = () => {}
let _close = () => {}
let _isOpen = () => false

export const bindSettingsController = (ctl: {
    toggle: () => void
    open: () => void
    close: () => void
    isOpen: () => boolean
}) => {
    _toggle = ctl.toggle
    _open = ctl.open
    _close = ctl.close
    _isOpen = ctl.isOpen
}

export const toggleSettings = () => _toggle()
export const openSettings = () => _open()
export const closeSettings = () => _close()
export const isSettingsOpen = () => _isOpen()
