import { Router } from "express"
import { createOrUpdateProfile, getProfile } from "../controllers/profileController"
import { batchLogActivities, deleteActivityLog } from "../controllers/logController"
import {
  getDashboard,
  getCalendar,
  getLeaderboard,
} from "../controllers/dashboardController"

const router = Router()

// Health Check
router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Carbon Engine API",
    timestamp: new Date().toISOString(),
  })
})

// 1. Profile Endpoints
router.post("/profile", createOrUpdateProfile)
router.get("/profile", getProfile)
router.get("/profile/:userId", getProfile)

// 2. Activity Logging Endpoints (Batch & Delete)
router.post("/logs", batchLogActivities)
router.delete("/logs/:logId", deleteActivityLog)

// 3. Dashboard, Streak Calendar, and Leaderboard
router.get("/dashboard/:userId", getDashboard)
router.get("/calendar/:userId", getCalendar)
router.get("/leaderboard", getLeaderboard)

export default router
