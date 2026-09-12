import webPush from 'web-push'

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || 'BE8PbPyCNWpbe0iBTusqGluzp0BNN03PSwHBs3HCyCQqsxLHFltHrfxGghsNdiVTzdZpsPAEJMdTjj5o7DWIffM'
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || 'KMYMDNmD4WMqaA6Dny7gy8wm3WDdDC3NZQyJQLLehTY'
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@mediprotect.com.mx'

let initialized = false

function ensureInit() {
  if (!initialized) {
    webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)
    initialized = true
  }
}

export async function sendPushToUser(
  pool: any,
  userId: string,
  userTipo: string,
  title: string,
  body: string,
  url?: string
) {
  ensureInit()

  const result = await pool.query(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1 AND user_tipo = $2',
    [userId, userTipo]
  )

  const payload = JSON.stringify({ title, body, url: url || '/mis-citas' })

  for (const sub of result.rows) {
    try {
      await webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint])
      }
    }
  }
}

export async function sendPushToRoom(
  pool: any,
  userIds: string[],
  userTipo: string,
  title: string,
  body: string,
  url?: string
) {
  for (const uid of userIds) {
    if (uid) await sendPushToUser(pool, uid, userTipo, title, body, url)
  }
}
