require('dotenv').config()
const mysql = require('mysql2/promise')

const testConnection = async () => {
  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      database: 'piano_studio'
    })
    
    console.log('✅ 数据库连接成功！')
    console.log('连接信息：')
    console.log('- Host:', connection.config.host)
    console.log('- Port:', connection.config.port)
    console.log('- User:', connection.config.user)
    console.log('- Database:', connection.config.database)
    console.log('- Password:', connection.config.password ? '***' : '(空)')
    
    await connection.end()
  } catch (error) {
    console.error('❌ 数据库连接失败：')
    console.error(error.message)
    console.error('\n请检查：')
    console.error('1. MySQL服务是否启动')
    console.error('2. 端口是否正确（默认3306）')
    console.error('3. 用户名和密码是否正确')
    console.error('4. 数据库名称是否正确（piano_studio）')
    console.error('5. 防火墙是否阻止连接')
  }
}

testConnection()
