require('dotenv').config({ override: true })
const mongoose = require('mongoose')

const clearDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ MongoDB连接成功')
    
    const collections = await mongoose.connection.db.collections()
    
    for (const collection of collections) {
      await collection.deleteMany({})
      console.log(`✅ 已清空集合: ${collection.collectionName}`)
    }
    
    console.log('✅ 数据库已清空')
    process.exit(0)
  } catch (error) {
    console.error('❌ 清空数据库错误:', error)
    process.exit(1)
  }
}

clearDatabase()
