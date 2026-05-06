import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const ADMIN_EMAIL = 'admin@feedpulse.com';
const ADMIN_PASSWORD = 'admin123';

export const login = (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials',
      message: 'Email or password is incorrect',
      data: null,
    });
  }

  const token = jwt.sign(
    { email },
    process.env.JWT_SECRET as string,
    { expiresIn: '24h' }
  );

  return res.status(200).json({
    success: true,
    data: { token },
    error: null,
    message: 'Login successful',
  });
};