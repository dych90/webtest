<template>
  <el-container class="layout-container">
    <el-drawer
      v-model="drawerVisible"
      direction="ltr"
      :size="240"
      :with-header="false"
      class="mobile-drawer"
    >
      <div class="logo">
        <h3>钢琴工作室</h3>
      </div>
      
      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
        @select="handleMenuSelect"
      >
        <el-menu-item index="/dashboard">
          <el-icon><HomeFilled /></el-icon>
          <span>首页</span>
        </el-menu-item>
        
        <el-menu-item v-if="userStore.isAdmin()" index="/users">
          <el-icon><User /></el-icon>
          <span>教师管理</span>
        </el-menu-item>
        
        <el-menu-item index="/students">
          <el-icon><User /></el-icon>
          <span>学生管理</span>
        </el-menu-item>
        
        <el-menu-item index="/course-types">
          <el-icon><Document /></el-icon>
          <span>课程类型</span>
        </el-menu-item>
        
        <el-menu-item index="/fee-standards">
          <el-icon><Money /></el-icon>
          <span>收费标准</span>
        </el-menu-item>
        
        <el-menu-item index="/payments">
          <el-icon><Wallet /></el-icon>
          <span>缴费管理</span>
        </el-menu-item>
        
        <el-menu-item index="/schedule">
          <el-icon><Calendar /></el-icon>
          <span>排课管理</span>
        </el-menu-item>
        
        <el-menu-item index="/lessons">
          <el-icon><Edit /></el-icon>
          <span>消课管理</span>
        </el-menu-item>
        
        <el-menu-item index="/repertoire">
          <el-icon><Headset /></el-icon>
          <span>曲目管理</span>
        </el-menu-item>
        
        <el-menu-item index="/balance">
          <el-icon><DataAnalysis /></el-icon>
          <span>剩余课费</span>
        </el-menu-item>
        
        <el-menu-item index="/statistics">
          <el-icon><TrendCharts /></el-icon>
          <span>数据统计</span>
        </el-menu-item>
        
        <el-menu-item index="/reminders">
          <el-icon><Bell /></el-icon>
          <span>提醒管理</span>
        </el-menu-item>
      </el-menu>
    </el-drawer>
    
    <el-aside width="200px" class="aside desktop-only">
      <div class="logo">
        <h3>钢琴工作室</h3>
      </div>
      
      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
      >
        <el-menu-item index="/dashboard">
          <el-icon><HomeFilled /></el-icon>
          <span>首页</span>
        </el-menu-item>
        
        <el-menu-item v-if="userStore.isAdmin()" index="/users">
          <el-icon><User /></el-icon>
          <span>教师管理</span>
        </el-menu-item>
        
        <el-menu-item index="/students">
          <el-icon><User /></el-icon>
          <span>学生管理</span>
        </el-menu-item>
        
        <el-menu-item index="/course-types">
          <el-icon><Document /></el-icon>
          <span>课程类型</span>
        </el-menu-item>
        
        <el-menu-item index="/fee-standards">
          <el-icon><Money /></el-icon>
          <span>收费标准</span>
        </el-menu-item>
        
        <el-menu-item index="/payments">
          <el-icon><Wallet /></el-icon>
          <span>缴费管理</span>
        </el-menu-item>
        
        <el-menu-item index="/schedule">
          <el-icon><Calendar /></el-icon>
          <span>排课管理</span>
        </el-menu-item>
        
        <el-menu-item index="/lessons">
          <el-icon><Edit /></el-icon>
          <span>消课管理</span>
        </el-menu-item>
        
        <el-menu-item index="/repertoire">
          <el-icon><Headset /></el-icon>
          <span>曲目管理</span>
        </el-menu-item>
        
        <el-menu-item index="/balance">
          <el-icon><DataAnalysis /></el-icon>
          <span>剩余课费</span>
        </el-menu-item>
        
        <el-menu-item index="/statistics">
          <el-icon><TrendCharts /></el-icon>
          <span>数据统计</span>
        </el-menu-item>
        
        <el-menu-item index="/reminders">
          <el-icon><Bell /></el-icon>
          <span>提醒管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    
    <el-container>
      <el-header class="header">
        <div class="header-content">
          <div class="header-left">
            <el-button
              class="menu-toggle mobile-only"
              :icon="Menu"
              @click="drawerVisible = true"
            />
            <span class="title">{{ currentTitle }}</span>
          </div>
          <div class="user-info">
            <el-dropdown>
              <span class="el-dropdown-link">
                {{ userStore.userInfo?.username || '管理员' }}
                <el-icon class="el-icon--right"><arrow-down /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </el-header>
      
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { Menu } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const drawerVisible = ref(false)

const activeMenu = computed(() => route.path)

const currentTitle = computed(() => {
  return route.meta.title || '首页'
})

const handleMenuSelect = () => {
  drawerVisible.value = false
}

const handleLogout = () => {
  userStore.clear()
  ElMessage.success('退出成功')
  router.push('/login')
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.aside {
  background-color: #304156;
  overflow-x: hidden;
}

.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid #1f2d3d;
}

.logo h3 {
  margin: 0;
}

.el-menu-vertical {
  border-right: none;
}

.header {
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  padding: 0 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.user-info {
  cursor: pointer;
}

.el-dropdown-link {
  display: flex;
  align-items: center;
  color: #333;
}

.main {
  background-color: #f0f2f5;
  padding: 20px;
}

.mobile-drawer .el-menu-vertical {
  border-right: none;
}

@media (max-width: 768px) {
  .desktop-only {
    display: none !important;
  }

  .mobile-only {
    display: inline-flex !important;
  }

  .main {
    padding: 12px;
  }

  .header {
    padding: 0 12px;
  }

  .title {
    font-size: 16px;
  }
}

@media (min-width: 769px) {
  .mobile-only {
    display: none !important;
  }
}
</style>
