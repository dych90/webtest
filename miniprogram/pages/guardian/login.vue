<template>
  <view class="redirect-page"></view>
</template>

<script setup>
import { onLoad } from '@dcloudio/uni-app'

onLoad((options) => {
  const query = [`mode=guardian`]

  if (options?.invite) {
    query.push(`invite=${encodeURIComponent(options.invite)}`)
  }

  const url = `/pages/login/login?${query.join('&')}`
  uni.redirectTo({
    url,
    fail: () => {
      uni.reLaunch({ url })
    }
  })
})
</script>

<style scoped>
.redirect-page {
  min-height: 100vh;
  background: #f7efe3;
}
</style>
