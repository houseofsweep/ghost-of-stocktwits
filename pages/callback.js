import { getSession } from '../lib/session'

// This page handles the Discord OAuth callback
// Discord redirects here after the user authorizes
export async function getServerSideProps({ query, req, res }) {
  const { code, error } = query

  if (error || !code) {
    console.log('Callback error:', error, 'code present:', !!code, 'query:', JSON.stringify(query))
    return { redirect: { destination: `/?error=${error || 'no_code'}`, permanent: false } }
  }

  try {
    // Step 1: Exchange code for access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
      }),
    })

    const tokenText = await tokenRes.text()
    if (!tokenRes.ok) {
      console.error('Token exchange failed:', tokenText)
      return { redirect: { destination: `/?error=token_failed&detail=${encodeURIComponent(tokenText.slice(0,100))}`, permanent: false } }
    }

    const tokens = JSON.parse(tokenText)

    // Step 2: Get user info
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const user = await userRes.json()

    // Step 3: Get user's guilds to check membership
    const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const guilds = await guildsRes.json()

    // Step 4: Check if user is in Ghost of Stocktwits server
    const isMember = Array.isArray(guilds) &&
      guilds.some(g => g.id === process.env.DISCORD_SERVER_ID)

    // Step 5: Save session
    const session = await getSession(req, res)
    session.user = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator || '0',
      avatar: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.id) % 5}.png`,
      isMember,
    }
    await session.save()

    return { redirect: { destination: '/', permanent: false } }

  } catch (err) {
    console.error('OAuth callback error:', err)
    return { redirect: { destination: '/?error=server_error', permanent: false } }
  }
}

// This component is never shown — we always redirect
export default function Callback() {
  return null
}
