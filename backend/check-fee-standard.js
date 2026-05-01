const mongoose = require('mongoose')
const FeeStandard = require('./src/models/FeeStandard')
const CourseType = require('./src/models/CourseType')
const Student = require('./src/models/Student')

const MONGODB_URI = 'mongodb://localhost:27017/piano_studio'

async function checkFeeStandards() {
  try {
    console.log('🔗 连接数据库...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ 数据库连接成功\n')

    console.log('=' .repeat(70))
    console.log('📋 FeeStandard (收费标准) 表诊断')
    console.log('='.repeat(70) + '\n')

    const allStandards = await FeeStandard.find({})
    console.log(`📊 收费标准总数: ${allStandards.length}\n`)

    if (allStandards.length === 0) {
      console.log('❌ FeeStandard 表是空的！\n')
      
      console.log('💡 这就是为什么无法补录收入的原因：')
      console.log('   没有收费标准 → 无法获取单价 → 无法计算金额\n')

      console.log('📝 显示 CourseType (课程类型) 信息:\n')
      const courseTypes = await CourseType.find({})
      console.log(`   课程类型总数: ${courseTypes.length}\n`)
      courseTypes.forEach(ct => {
        console.log(`   • ${ct.name} (ID: ${ct._id})`)
      })

      console.log('\n💡 解决方案:')
      console.log('1. 在系统中添加收费标准（每个课程类型的单价）')
      console.log('2. 或者我可以创建一个使用默认单价的补录脚本\n')

      return
    }

    console.log('📋 所有收费标准:\n')
    
    for (const fs_item of allStandards) {
      const student = fs_item.studentId ? await Student.findById(fs_item.studentId).select('name') : null
      const courseType = fs_item.courseTypeId ? await CourseType.findById(fs_item.courseTypeId).select('name') : null

      console.log(`┌─ ID: ${fs_item._id}`)
      console.log(`│  课程类型: ${courseType?.name || '通用'}`)
      console.log(`│  学生: ${student?.name || '通用（适用于所有人）'}`)
      console.log(`│  单价: ¥${fs_item.price}`)
      console.log(`│  生效日期: ${fs_item.effectiveDate?.toISOString().slice(0,10) || '未设置'}`)
      console.log(`└\n`)
    }

  } catch (error) {
    console.error('❌ 诊断失败:', error.message)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 数据库连接已关闭')
  }
}

console.log('╔══════════════════════════════════════════════════╗')
console.log('║     收费标准诊断工具                              ║')
console.log('╚══════════════════════════════════════════════════╝\n')

checkFeeStandards()
