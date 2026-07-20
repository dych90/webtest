export const REWARD_STATE_CHANGED_EVENT = 'reward-state-changed'

export const emitRewardStateChanged = (payload = {}) => {
  uni.$emit(REWARD_STATE_CHANGED_EVENT, {
    ...payload,
    changedAt: Date.now()
  })
}

export const onRewardStateChanged = (handler) => {
  uni.$on(REWARD_STATE_CHANGED_EVENT, handler)
}

export const offRewardStateChanged = (handler) => {
  uni.$off(REWARD_STATE_CHANGED_EVENT, handler)
}
