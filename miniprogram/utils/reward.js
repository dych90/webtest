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

export const getGrowthStarUnits = (growth = {}) => {
  const pointValue = Math.max(0, getGrowthPointValue(growth))
  const exactStarCount = pointValue / GROWTH_POINTS_PER_DISPLAY_STAR
  const fullCount = Math.floor(exactStarCount)
  const partialPercent = Math.round((exactStarCount - fullCount) * 100)
  const stars = Array.from({ length: fullCount }, (_, index) => ({
    key: `full-${index}`,
    fillPercent: 100
  }))

  if (partialPercent > 0) {
    stars.push({
      key: `partial-${fullCount}`,
      fillPercent: partialPercent
    })
  }

  return stars
}

export const formatGrowthStarText = (growth = {}) => {
  return `${formatGrowthStarCount(growth)}星`
}

export const formatGrowthPointValue = (growth = {}) => {
  return formatRewardAmount(getGrowthPointValue(growth))
}

export const formatGrowthValueText = (growth = {}) => {
  return `成长值：${formatGrowthPointValue(growth)}`
}

export const formatPointLabelText = (value) => {
  return `积分：${formatRewardAmount(value)}`
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
    parts.push(formatGrowthValueText(starRemainder))
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
