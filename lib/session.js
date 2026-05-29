import { getIronSession } from 'iron-session'

export const sessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: 'ghost_session',
  cookieOptions: {
    secure: true,
    httpOnly: true,
    sameSite: 'none',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
}

export async function getSession(req, res) {
  return getIronSession(req, res, sessionOptions)
}
