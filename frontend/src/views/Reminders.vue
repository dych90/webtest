<template>
  <div class="reminders">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>提醒管理</span>
        </div>
      </template>
      
      <el-table :data="reminders" style="width: 100%">
        <el-table-column prop="type" label="类型" />
        <el-table-column prop="content" label="内容" />
        <el-table-column prop="reminderTime" label="提醒时间" />
        <el-table-column prop="isRead" label="状态">
          <template #default="{ row }">
            <el-tag :type="row.isRead ? 'success' : 'warning'">
              {{ row.isRead ? '已读' : '未读' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="handleMarkRead(row)" :disabled="row.isRead">标记已读</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const reminders = ref([])

const handleMarkRead = (row) => {
  console.log('标记已读', row)
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
