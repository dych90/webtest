export const createAudioPlayback = ({ onStateChange, onError } = {}) => {
  let audioContext = null
  let currentKey = ''
  let playing = false

  const emitState = () => {
    if (onStateChange) {
      onStateChange({
        key: currentKey,
        playing
      })
    }
  }

  const clearContext = (context = audioContext) => {
    if (!context) return

    const isCurrent = context === audioContext
    if (isCurrent) {
      audioContext = null
      currentKey = ''
      playing = false
      emitState()
    }

    try {
      context.destroy()
    } catch (error) {
      console.warn('audio destroy failed', error)
    }
  }

  const stop = (key) => {
    if (key && key !== currentKey) return
    clearContext()
  }

  const playOrPause = (src, key = src) => {
    if (!src || !key) return false

    if (!uni.createInnerAudioContext) {
      if (onError) onError()
      return false
    }

    if (audioContext && currentKey === key) {
      if (playing) {
        audioContext.pause()
        playing = false
        emitState()
        return false
      }

      audioContext.play()
      playing = true
      emitState()
      return true
    }

    clearContext()

    const context = uni.createInnerAudioContext()
    audioContext = context
    currentKey = key
    playing = true
    emitState()

    context.src = src
    context.onEnded(() => {
      clearContext(context)
    })
    context.onError(() => {
      clearContext(context)
      if (onError) onError()
    })
    context.play()
    return true
  }

  return {
    playOrPause,
    stop
  }
}
