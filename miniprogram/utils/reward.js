export const CROWN_TEXT_MAP = {
  gold: '金冠',
  silver: '银冠',
  bronze: '铜冠'
}

export const CROWN_MARK_MAP = {
  gold: '皇冠',
  silver: '皇冠',
  bronze: '皇冠'
}

export const GROWTH_POINTS_PER_DISPLAY_STAR = 5

export const formatRewardAmount = (value) => {
  const numericValue = Number(value) || 0
  const roundedValue = Math.round(numericValue * 100) / 100
  return Number.isInteger(roundedValue)
    ? String(roundedValue)
    : String(roundedValue).replace(/\.?0+$/, '')
}

const getGrowthPointValue = (growth = {}) => {
  if (typeof growth === 'number') {
    return growth
  }

  return Number(growth.rankScore ?? growth.totalGrowthStars ?? 0) || 0
}

export const formatGrowthStarCount = (growth = {}) => {
  const pointValue = getGrowthPointValue(growth)
  return formatRewardAmount(pointValue / GROWTH_POINTS_PER_DISPLAY_STAR)
}

export const formatGrowthStarText = (growth = {}) => {
  return `★×${formatGrowthStarCount(growth)}`
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
  const parts = []

  if (sunCount > 0) {
    parts.push(`${sunCount}日`)
  }

  if (moonRemainder > 0) {
    parts.push(`${moonRemainder}月`)
  }

  if (starRemainder > 0 || parts.length === 0) {
    parts.push(formatGrowthStarText(starRemainder))
  }

  return parts.join(' ')
}

export const formatPointText = (value) => {
  return `${formatRewardAmount(value)}积分`
}

export const formatDebtText = (debtOverview = {}) => {
  const debtPoints = Number(debtOverview.debtPoints) || 0
  return debtPoints > 0 ? `欠 ${formatRewardAmount(debtPoints)} 积分` : '无欠账'
}
