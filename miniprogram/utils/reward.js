export const CROWN_TEXT_MAP = {
  gold: '金冠',
  silver: '银冠',
  bronze: '铜冠'
}

export const CROWN_MARK_MAP = {
  gold: '金',
  silver: '银',
  bronze: '铜'
}

export const getCrownText = (crownType) => {
  return CROWN_TEXT_MAP[crownType] || ''
}

export const getCrownMark = (crownType) => {
  return CROWN_MARK_MAP[crownType] || ''
}

export const formatGrowthLevel = (growth = {}) => {
  const sunCount = Number(growth.sunCount) || 0
  const moonRemainder = Number(growth.moonRemainder) || 0
  const starRemainder = Number(growth.starRemainder) || 0

  if (sunCount > 0) {
    return `${sunCount}日 ${moonRemainder}月 ${starRemainder}星`
  }

  if (moonRemainder > 0) {
    return `${moonRemainder}月 ${starRemainder}星`
  }

  return `${starRemainder}星`
}

export const formatPointText = (value) => {
  const numericValue = Number(value) || 0
  return `${numericValue}积分`
}

export const formatDebtText = (debtOverview = {}) => {
  const debtPoints = Number(debtOverview.debtPoints) || 0
  return debtPoints > 0 ? `欠 ${debtPoints} 积分` : '无欠账'
}
