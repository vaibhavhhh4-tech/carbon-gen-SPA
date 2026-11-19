import { Request, Response, NextFunction } from "express"
import prisma from "../config/db"
import { profileSchema } from "../validators/schemas"

export async function createOrUpdateProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = profileSchema.parse(req.body)

    const user = await prisma.user.upsert({
      where: { handle: data.handle },
      update: {
        name: data.name,
        heightCm: data.heightCm,
        weightKg: data.weightKg,
        age: data.age,
        baselineCommuteKm: data.baselineCommuteKm,
      },
      create: {
        handle: data.handle,
        name: data.name,
        heightCm: data.heightCm,
        weightKg: data.weightKg,
        age: data.age,
        baselineCommuteKm: data.baselineCommuteKm,
      },
    })

    res.status(200).json({
      success: true,
      message: "User profile saved successfully",
      data: user,
    })
  } catch (error) {
    next(error)
  }
}

export async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawId = req.params.userId || (req.query.userId as string) || (req.query.handle as string)
    const idOrHandle = Array.isArray(rawId) ? rawId[0] : rawId

    let user = null
    if (idOrHandle) {
      if (idOrHandle.startsWith("@")) {
        user = await prisma.user.findUnique({ where: { handle: idOrHandle } })
      } else {
        user = await prisma.user.findUnique({ where: { id: idOrHandle } })
      }
    }

    if (!user) {
      // Default to @aanya or first user
      user = await prisma.user.findFirst({
        where: { handle: "@aanya" },
      })
    }

    if (!user) {
      user = await prisma.user.findFirst()
    }

    if (!user) {
      res.status(404).json({ success: false, error: "No user profile found" })
      return
    }

    res.json({ success: true, data: user })
  } catch (error) {
    next(error)
  }
}
