const StudentAccount = require('../models/StudentAccount')
const { isSameId, toIdString } = require('./studentAccess')

const PAYMENT_TYPES = ['prepaid', 'payPerLesson', 'free']

const normalizePaymentType = (value, fallback = 'prepaid') => {
  return PAYMENT_TYPES.includes(value) ? value : fallback
}

const getStudentId = (student) => {
  return student?._id || student
}

const getStudentOwnerTeacherId = (student) => {
  return student?.teacherId?._id || student?.teacherId
}

const isOwnerStudentAccount = (student, teacherId) => {
  return isSameId(getStudentOwnerTeacherId(student), teacherId)
}

const getStudentAccount = async (studentId, teacherId) => {
  if (!studentId || !teacherId) return null
  return StudentAccount.findOne({ studentId, teacherId })
}

const getEffectiveStudentAccount = async (student, teacherId) => {
  const studentId = getStudentId(student)
  const accountTeacherId = toIdString(teacherId)
  const account = await getStudentAccount(studentId, accountTeacherId)
  const ownerAccount = isOwnerStudentAccount(student, accountTeacherId)
  const fallbackPaymentType = normalizePaymentType(student?.paymentType)

  return {
    account,
    studentId,
    teacherId: accountTeacherId,
    isOwnerAccount: ownerAccount,
    paymentType: normalizePaymentType(account?.paymentType, fallbackPaymentType),
    currentPrice: account?.currentPrice ?? (ownerAccount ? (student?.currentPrice || 0) : 0),
    priceEffectiveDate: account?.priceEffectiveDate || (ownerAccount ? student?.priceEffectiveDate : null),
    source: account ? 'account' : 'student'
  }
}

const getEffectivePaymentType = async (student, teacherId) => {
  const account = await getEffectiveStudentAccount(student, teacherId)
  return account.paymentType
}

const getEffectiveCurrentPrice = async (student, teacherId) => {
  const account = await getEffectiveStudentAccount(student, teacherId)
  return account.currentPrice
}

const saveStudentAccountSettings = async ({ student, teacherId, paymentType, currentPrice, priceEffectiveDate }) => {
  const studentId = getStudentId(student)
  if (!studentId || !teacherId) return null

  const updateData = {
    updatedAt: new Date()
  }

  if (paymentType !== undefined) {
    updateData.paymentType = normalizePaymentType(paymentType)
  }
  if (currentPrice !== undefined) {
    updateData.currentPrice = Number(currentPrice) || 0
  }
  if (priceEffectiveDate !== undefined) {
    updateData.priceEffectiveDate = priceEffectiveDate || new Date()
  } else if (currentPrice !== undefined) {
    updateData.priceEffectiveDate = new Date()
  }

  if (updateData.paymentType === 'free') {
    updateData.currentPrice = 0
  }

  return StudentAccount.findOneAndUpdate(
    { studentId, teacherId },
    {
      $set: updateData,
      $setOnInsert: { createdAt: new Date() }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )
}

const attachAccountBillingToStudent = async (student, teacherId) => {
  const plainStudent = student?.toObject ? student.toObject() : { ...student }
  if (!plainStudent || !teacherId) return plainStudent

  const account = await getEffectiveStudentAccount(plainStudent, teacherId)
  return {
    ...plainStudent,
    studentPaymentType: plainStudent.paymentType,
    studentCurrentPrice: plainStudent.currentPrice,
    accountTeacherId: account.teacherId,
    accountPaymentType: account.paymentType,
    accountCurrentPrice: account.currentPrice,
    accountPriceEffectiveDate: account.priceEffectiveDate,
    paymentType: account.paymentType,
    currentPrice: account.currentPrice,
    billingAccountId: account.account?._id || null
  }
}

const attachAccountBillingToStudents = async (students, teacherId) => {
  return Promise.all((students || []).map(student => attachAccountBillingToStudent(student, teacherId)))
}

module.exports = {
  PAYMENT_TYPES,
  attachAccountBillingToStudent,
  attachAccountBillingToStudents,
  getEffectiveCurrentPrice,
  getEffectivePaymentType,
  getEffectiveStudentAccount,
  getStudentAccount,
  isOwnerStudentAccount,
  normalizePaymentType,
  saveStudentAccountSettings
}
