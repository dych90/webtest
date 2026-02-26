import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCourseStore = defineStore('course', {
  state: () => ({
    courses: [],
    lastUpdate: 0
  }),

  getters: {
    getCourses: (state) => state.courses,
    getLastUpdate: (state) => state.lastUpdate
  },

  actions: {
    setCourses(courses) {
      this.courses = courses
      this.lastUpdate = Date.now()
    },

    async fetchCourses() {
      try {
        const response = await fetch('/api/courses')
        const data = await response.json()
        this.courses = data
        this.lastUpdate = Date.now()
        return data
      } catch (error) {
        console.error('获取课程列表失败', error)
        throw error
      }
    },

    async updateCourse(courseId, courseData) {
      try {
        await fetch(`/api/courses/${courseId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(courseData)
        })
        
        const index = this.courses.findIndex(c => c._id === courseId)
        if (index !== -1) {
          this.courses[index] = { ...this.courses[index], ...courseData }
        }
        
        this.lastUpdate = Date.now()
      } catch (error) {
        console.error('更新课程失败', error)
        throw error
      }
    },

    async deleteCourse(courseId) {
      try {
        await fetch(`/api/courses/${courseId}`, {
          method: 'DELETE'
        })
        
        this.courses = this.courses.filter(c => c._id !== courseId)
        this.lastUpdate = Date.now()
      } catch (error) {
        console.error('删除课程失败', error)
        throw error
      }
    },

    async addCourse(courseData) {
      try {
        const response = await fetch('/api/courses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(courseData)
        })
        
        const data = await response.json()
        this.courses.push(data)
        this.lastUpdate = Date.now()
        return data
      } catch (error) {
        console.error('添加课程失败', error)
        throw error
      }
    },

    clearCourses() {
      this.courses = []
      this.lastUpdate = 0
    }
  }
})
