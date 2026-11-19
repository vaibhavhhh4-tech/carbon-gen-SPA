import dotenv from "dotenv"
dotenv.config()

import express, { Request, Response } from "express"
import cors from "cors"
import apiRoutes from "./routes/apiRoutes"
import { errorHandler } from "./middleware/errorHandler"
import prisma from "./config/db"

const app = express()
const PORT = Number(process.env.PORT) || 5000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000"

// Middlewares
app.use(
  cors({
    origin: [CLIENT_ORIGIN, "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
)

app.use(express.json({ limit: "1mb" }))
app.use(express.urlencoded({ extended: true }))

// Request Logging (in development)
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`)
    next()
  })
}

// API Routes
app.use("/api", apiRoutes)

// Root fallback
app.get("/", (req: Request, res: Response) => {
  res.json({
    name: "Carbon Engine API",
    version: "1.0.0",
    docs: "/api/health",
  })
})

// 404 Not Found Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl}`,
  })
})

// Centralized Error Handling Middleware
app.use(errorHandler)

// Start Server
const server = app.listen(PORT, () => {
  console.log(`🚀 Carbon Engine Backend running on http://localhost:${PORT}`)
  console.log(`📡 Accepting client connections from: ${CLIENT_ORIGIN}`)
})

// Graceful Shutdown
async function shutdown(signal: string) {
  console.log(`\nReceived ${signal}. Closing HTTP server and disconnecting Prisma...`)
  server.close(async () => {
    try {
      await prisma.$disconnect()
      console.log("Prisma disconnected successfully. Process exiting.")
      process.exit(0)
    } catch (err) {
      console.error("Error during disconnect:", err)
      process.exit(1)
    }
  })
}

process.on("SIGINT", () => shutdown("SIGINT"))
process.on("SIGTERM", () => shutdown("SIGTERM"))

export default app
