const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')

const BACKUP_DIR = path.join(__dirname, '..', 'backups')
const LOG_FILE = path.join(BACKUP_DIR, 'backup.log')

async function runBackupTask() {
  const startTime = new Date()
  console.log('========== 自动备份任务开始 ==========')
  console.log(`⏰ 开始时间: ${startTime.toLocaleString('zh-CN')}\n`)

  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }

    await new Promise((resolve, reject) => {
      exec('node scripts/backup.js', { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
        if (error) {
          reject(error)
          return
        }
        console.log(stdout)
        if (stderr) console.error(stderr)
        resolve()
      })
    })

    console.log('\n🧹 开始清理过期备份...\n')
    
    await new Promise((resolve, reject) => {
      exec('node scripts/cleanup.js', { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
        if (error) {
          reject(error)
          return
        }
        console.log(stdout)
        if (stderr) console.error(stderr)
        resolve()
      })
    })

    const endTime = new Date()
    const duration = ((endTime - startTime) / 1000).toFixed(2)

    console.log('\n========== 任务完成 ==========')
    console.log(`⏱️ 总耗时: ${duration} 秒`)
    console.log(`✅ 备份和清理任务执行成功\n`)

  } catch (error) {
    console.error('\n❌ 任务执行失败:', error.message)
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'scheduled_task',
      status: 'error',
      error: error.message
    }

    try {
      fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n')
    } catch (e) {
      console.warn('无法写入日志文件')
    }

    process.exit(1)
  }
}

if (require.main === module) {
  runBackupTask().then(() => {
    process.exit(0)
  }).catch(() => {
    process.exit(1)
  })
}

module.exports = runBackupTask
