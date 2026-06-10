const express = require('express')
const router = express.Router()
const guardianController = require('../controllers/guardianController')
const { authenticateToken } = require('../middleware/auth')
const { authenticateGuardianToken } = require('../middleware/guardianAuth')

router.post('/guardian/invites', authenticateToken, guardianController.createInvite)
router.get('/guardian/invites/:token', guardianController.getInviteInfo)

router.post('/guardian/bind', guardianController.bindByInvite)
router.post('/guardian/login', guardianController.login)
router.post('/guardian/subscribe', authenticateGuardianToken, guardianController.subscribe)

router.get('/guardian/students', authenticateGuardianToken, guardianController.getStudents)
router.get('/guardian/students/:studentId/overview', authenticateGuardianToken, guardianController.getOverview)
router.get('/guardian/students/:studentId/courses', authenticateGuardianToken, guardianController.getCourses)
router.get('/guardian/students/:studentId/lesson-records', authenticateGuardianToken, guardianController.getLessonRecords)
router.get('/guardian/students/:studentId/payments', authenticateGuardianToken, guardianController.getPayments)
router.get('/guardian/students/:studentId/balance', authenticateGuardianToken, guardianController.getBalance)

module.exports = router
