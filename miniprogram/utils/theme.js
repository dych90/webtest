const THEME_STORAGE_KEY = 'appTheme'

export const THEME_KEYS = {
  classic: 'classic',
  dawn: 'dawn'
}

export const themes = {
  [THEME_KEYS.classic]: {
    key: THEME_KEYS.classic,
    name: '默认蓝色',
    navigationBarBackgroundColor: '#409EFF',
    backgroundColor: '#F8F8F8',
    tabBarColor: '#999999',
    tabBarSelectedColor: '#409EFF',
    tabBarBackgroundColor: '#ffffff',
    primary: '#409EFF',
    danger: '#F56C6C'
  },
  [THEME_KEYS.dawn]: {
    key: THEME_KEYS.dawn,
    name: '晨光琴房',
    navigationBarBackgroundColor: '#B8793E',
    backgroundColor: '#F7F2EA',
    tabBarColor: '#8B8176',
    tabBarSelectedColor: '#B8793E',
    tabBarBackgroundColor: '#FFFDF8',
    primary: '#B8793E',
    danger: '#C95745'
  }
}

const themeList = [themes[THEME_KEYS.classic], themes[THEME_KEYS.dawn]]

export const getThemeOptions = () => themeList.map(theme => theme.name)

export const getThemeByKey = (key) => themes[key] || themes[THEME_KEYS.classic]

export const getCurrentThemeKey = () => {
  const key = uni.getStorageSync(THEME_STORAGE_KEY)
  return themes[key] ? key : THEME_KEYS.classic
}

export const getCurrentTheme = () => getThemeByKey(getCurrentThemeKey())

export const getThemeClass = (key = getCurrentThemeKey()) => `theme-${getThemeByKey(key).key}`

export const getThemeIndex = (key = getCurrentThemeKey()) => {
  const index = themeList.findIndex(theme => theme.key === key)
  return index >= 0 ? index : 0
}

export const getThemeByIndex = (index) => themeList[Number(index)] || themes[THEME_KEYS.classic]

export const applyTheme = (key = getCurrentThemeKey()) => {
  const theme = getThemeByKey(key)

  if (uni.setNavigationBarColor) {
    uni.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: theme.navigationBarBackgroundColor,
      fail: () => {}
    })
  }

  if (uni.setBackgroundColor) {
    uni.setBackgroundColor({
      backgroundColor: theme.backgroundColor,
      backgroundColorTop: theme.backgroundColor,
      backgroundColorBottom: theme.backgroundColor,
      fail: () => {}
    })
  }

  if (uni.setTabBarStyle) {
    uni.setTabBarStyle({
      color: theme.tabBarColor,
      selectedColor: theme.tabBarSelectedColor,
      backgroundColor: theme.tabBarBackgroundColor,
      borderStyle: theme.key === THEME_KEYS.dawn ? 'white' : 'black',
      fail: () => {}
    })
  }

  return theme
}

export const setCurrentThemeKey = (key) => {
  const theme = getThemeByKey(key)
  uni.setStorageSync(THEME_STORAGE_KEY, theme.key)
  applyTheme(theme.key)
  return theme
}

export const setCurrentThemeByIndex = (index) => {
  const theme = getThemeByIndex(index)
  return setCurrentThemeKey(theme.key)
}
