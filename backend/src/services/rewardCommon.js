const mongoose = require('mongoose')

const toObjectId = (value, fieldName = 'id') => {
  const rawValue = value && value._id ? value._id : value

  if (!rawValue) {
    throw new Error(`${fieldName} is required`)
  }

  if (rawValue instanceof mongoose.Types.ObjectId) {
    return rawValue
  }

  if (!mongoose.isValidObjectId(rawValue)) {
    throw new Error(`${fieldName} is invalid`)
  }

  return new mongoose.Types.ObjectId(rawValue)
}

const toInteger = (value, fieldName = 'value', options = {}) => {
  const parsed = Number(value)
  const min = options.min
  const max = options.max

  if (!Number.isInteger(parsed)) {
    throw new Error(`${fieldName} must be an integer`)
  }

  if (min !== undefined && parsed < min) {
    throw new Error(`${fieldName} must be >= ${min}`)
  }

  if (max !== undefined && parsed > max) {
    throw new Error(`${fieldName} must be <= ${max}`)
  }

  return parsed
}

const normalizeAmount = (value, precision = 2) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return 0
  }

  const safePrecision = Number.isInteger(precision) && precision >= 0
    ? precision
    : 2
  const factor = 10 ** safePrecision
  return Math.round(parsed * factor) / factor
}

const toAmount = (value, fieldName = 'value', options = {}) => {
  const parsed = Number(value)
  const min = options.min
  const max = options.max
  const precision = options.precision

  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a number`)
  }

  const normalized = normalizeAmount(parsed, precision)

  if (min !== undefined && normalized < min) {
    throw new Error(`${fieldName} must be >= ${min}`)
  }

  if (max !== undefined && normalized > max) {
    throw new Error(`${fieldName} must be <= ${max}`)
  }

  return normalized
}

const toDate = (value, fieldName = 'date') => {
  const dateValue = value ? new Date(value) : new Date()

  if (Number.isNaN(dateValue.getTime())) {
    throw new Error(`${fieldName} is invalid`)
  }

  return dateValue
}

module.exports = {
  toObjectId,
  toInteger,
  toAmount,
  normalizeAmount,
  toDate
}
