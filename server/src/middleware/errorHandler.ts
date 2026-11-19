import { Request, Response, NextFunction, ErrorRequestHandler } from "express"
import { ZodError } from "zod"
import { Prisma } from "@prisma/client"

export class AppError extends Error {
  public statusCode: number
  public isOperational: boolean

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    Error.captureStackTrace(this, this.constructor)
  }
}

export const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }))

    res.status(400).json({
      success: false,
      error: "Validation failed",
      details: formattedErrors,
    })
    return
  }

  // Handle Prisma Database Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({
        success: false,
        error: "Conflict",
        message: "A record with these unique constraints already exists.",
      })
      return
    }

    if (err.code === "P2025") {
      res.status(404).json({
        success: false,
        error: "Not Found",
        message: "The requested database record was not found.",
      })
      return
    }
  }

  // Handle JSON parse errors
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({
      success: false,
      error: "Malformed JSON payload",
    })
    return
  }

  // Handle AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    })
    return
  }

  // Fallback 500 Internal Server Error
  console.error("Unhandled Error:", err)
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  })
}
