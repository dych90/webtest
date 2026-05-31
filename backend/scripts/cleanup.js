const fs = require('fs')
const path = require('path')

const BACKUP_DIR = path.join(__dirname, '..', 'backups')
const RETENTION_DAYS = 30

async function cleanupOldBackups() {
  try {
    console.log('========== 备份清理工具 ==========\n')
    
    const now = new Date()
    console.log(`⏰ 清理时间: ${now.toLocaleString('zh-CN')}`)
    console.log(`📁 备份目录: ${BACKUP_DIR}`)
    console.log(`🗓️ 保留天数: ${RETENTION_DAYS} 天\n`)

    if (!fs.existsSync(BACKUP_DIR)) {
      console.log('ℹ️ 备份目录不存在，无需清理')
      return
    }

    const dateDirs = fs.readdirSync(BACKUP_DIR).filter(name => {
      const dirPath = path.join(BACKUP_DIR, name)
      return fs.statSync(dirPath).isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(name)
    }).sort()

    console.log(`📊 找到 ${dateDirs.length} 个日期备份目录\n`)

    if (dateDirs.length === 0) {
      console.log('ℹ️ 没有找到需要清理的备份')
      return
    }

    let deletedCount = 0
    let freedSpace = 0
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS)

    console.log(`🔍 清理截止日期: ${cutoffDate.toISOString().split('T')[0]}\n`)
    console.log('-'.repeat(80))

    for (const dateDir of dateDirs) {
      const dirPath = path.join(BACKUP_DIR, dateDir)
      const dirDate = new Date(dateDir + 'T00:00:00.000Z')

      if (dirDate < cutoffDate) {
        const dirSize = getDirectorySize(dirPath)
        const sizeInMB = (dirSize / (1024 * 1024)).toFixed(2)

        console.log(`🗑️ 删除过期备份:`)
        console.log(`   📅 日期: ${dateDir}`)
        console.log(`   📦 大小: ${sizeInMB} MB`)
        
        removeDirectory(dirPath)
        
        deletedCount++
        freedSpace += dirSize
        
        console.log('   ✅ 已删除\n')
      } else {
        console.log(`✅ 保留备份: ${dateDir}`)
      }
    }

    console.log('-'.repeat(80))
    console.log('\n========== 清理报告 ==========\n')
    console.log(`🗑️ 删除目录数: ${deletedCount}`)
    console.log(`💾 释放空间: ${(freedSpace / (1024 * 1024)).toFixed(2)} MB`)
    console.log(`📁 剩余备份: ${dateDirs.length - deletedCount} 个`)

    const logEntry = {
      timestamp: now.toISOString(),
      type: 'cleanup',
      deletedCount,
      freedSpace,
      remainingBackups: dateDirs.length - deletedCount
    }

    const logFile = path.join(BACKUP_DIR, 'backup.log')
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n')
    console.log(`\n📋 日志已记录到: ${logFile}`)

    console.log('\n========== 清理完成 ==========\n')

  } catch (error) {
    console.error('❌ 清理过程出错:', error)
    process.exit(1)
  }
}

function getDirectorySize(dirPath) {
  let size = 0
  
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true })
    
    for (const file of files) {
      const filePath = path.join(dirPath, file.name)
      
      if (file.isDirectory()) {
        size += getDirectorySize(filePath)
      } else {
        try {
          size += fs.statSync(filePath).size
        } catch (e) {
          console.warn(`⚠️ 无法读取文件大小: ${filePath}`)
        }
      }
    }
  } catch (e) {
    console.warn(`⚠️ 无法读取目录: ${dirPath}`)
  }
  
  return size
}

function removeDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true })
  }
}

if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args[0] && !isNaN(parseInt(args[0]))) {
    RETENTION_DAYS = parseInt(args[0])
  }
  
  cleanupOldBackups()
}

module.exports = cleanupOldBackups
