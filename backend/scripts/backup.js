const { execSync, exec } = require('child_process')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/piano_studio'

function parseMongoDBUri(uri) {
  const match = uri.match(/mongodb:\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)\/(.+)/)
  
  if (!match) {
    throw new Error(`无效的 MongoDB URI: ${uri}`)
  }

  return {
    username: match[1] || '',
    password: match[2] || '',
    host: match[3],
    port: parseInt(match[4]),
    database: match[5]
  }
}

async function backupDatabase() {
  try {
    console.log('========== 数据库备份工具 ==========\n')
    
    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const dateStr = now.toISOString().split('T')[0]
    
    console.log(`⏰ 备份时间: ${now.toLocaleString('zh-CN')}`)
    console.log(`📦 数据库: ${MONGODB_URI}\n`)

    const dbConfig = parseMongoDBUri(MONGODB_URI)
    console.log('🔍 数据库配置:', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      hasAuth: !!(dbConfig.username && dbConfig.password)
    })

    const backupDir = path.join(__dirname, '..', 'backups', dateStr)
    const backupFile = path.join(backupDir, `${dbConfig.database}_${timestamp}`)
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
      console.log(`\n📁 创建备份目录: ${backupDir}`)
    }

    let mongodumpCmd = `mongodump --host ${dbConfig.host} --port ${dbConfig.port} --db ${dbConfig.database} --out "${backupFile}"`

    if (dbConfig.username && dbConfig.password) {
      mongodumpCmd += ` --username "${dbConfig.username}" --password "${dbConfig.password}" --authenticationDatabase admin`
    }

    console.log('\n🚀 开始备份...')
    console.log(`📝 执行命令: ${mongodumpCmd}\n`)
    
    const startTime = Date.now()
    
    exec(mongodumpCmd, (error, stdout, stderr) => {
      const endTime = Date.now()
      const duration = ((endTime - startTime) / 1000).toFixed(2)
      
      if (error) {
        console.error('❌ 备份失败:', error)
        console.error('错误输出:', stderr)
        process.exit(1)
        return
      }

      const backupPath = path.join(backupFile, dbConfig.database)
      
      if (fs.existsSync(backupPath)) {
        const getDirectorySize = (dirPath) => {
          let size = 0
          const files = fs.readdirSync(dirPath, { withFileTypes: true })
          
          for (const file of files) {
            const filePath = path.join(dirPath, file.name)
            if (file.isDirectory()) {
              size += getDirectorySize(filePath)
            } else {
              size += fs.statSync(filePath).size
            }
          }
          
          return size
        }

        const backupSize = getDirectorySize(backupPath)
        const sizeInMB = (backupSize / (1024 * 1024)).toFixed(2)

        console.log('✅ 备份成功！\n')
        console.log('📊 备份信息:')
        console.log(`   📍 备份路径: ${backupPath}`)
        console.log(`   📦 备份大小: ${sizeInMB} MB`)
        console.log(`   ⏱️ 耗时: ${duration} 秒`)
        console.log(`   🕐 时间戳: ${timestamp}`)

        const logEntry = {
          timestamp: now.toISOString(),
          type: 'backup',
          status: 'success',
          path: backupPath,
          size: backupSize,
          duration: parseFloat(duration),
          database: dbConfig.database
        }

        const logFile = path.join(__dirname, '..', 'backups', 'backup.log')
        const logLine = JSON.stringify(logEntry) + '\n'
        
        fs.appendFileSync(logFile, logLine)
        console.log(`\n📋 日志已记录到: ${logFile}`)

        console.log('\n========== 备份完成 ==========\n')
      } else {
        console.error('❌ 备份文件未生成')
        process.exit(1)
      }
    })

  } catch (error) {
    console.error('❌ 备份过程出错:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  backupDatabase()
}

module.exports = { backupDatabase, parseMongoDBUri }
