const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      role: 'admin'
    }
  })
  
  console.log('创建管理员账户成功:', admin)
  
  const courseTypes = await Promise.all([
    prisma.courseType.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        name: '一对一（45分钟）',
        duration: 45
      }
    }),
    prisma.courseType.upsert({
      where: { id: 2 },
      update: {},
      create: {
        id: 2,
        name: '一对一（60分钟）',
        duration: 60
      }
    })
  ])
  
  console.log('创建课程类型成功:', courseTypes)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
