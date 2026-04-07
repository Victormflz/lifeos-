const express      = require('express')
const mongoose     = require('mongoose')
const router       = express.Router()
const requireAuth  = require('../middleware/auth')
const Sleep        = require('../models/Sleep')
const Habit        = require('../models/Habit')
const Workout      = require('../models/Workout')
const Score        = require('../models/Score')

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function getWeekBounds() {
  const now  = new Date()
  const day  = now.getDay()                          // 0=dom … 6=sáb (lunes como inicio)
  const diff = day === 0 ? -6 : 1 - day              // ajuste a lunes

  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() + diff)
  startOfWeek.setHours(0, 0, 0, 0)

  const startOfLastWeek = new Date(startOfWeek)
  startOfLastWeek.setDate(startOfWeek.getDate() - 7)

  return { startOfWeek, startOfLastWeek }
}

// Convierte Date → "YYYY-MM-DD"
function toDateStr(d) {
  return d.toISOString().split('T')[0]
}

// ── Sueño ─────────────────────────────────────────────────────────────────────

async function getSleepInsights(userId, startOfWeek, startOfLastWeek) {
  try {
    const startKey    = toDateStr(startOfLastWeek)   // filtro mínimo en string
    const weekKey     = toDateStr(startOfWeek)

    // El campo Sleep.date es string YYYY-MM-DD — filtramos con comparación de strings
    const records = await Sleep.find(
      { userId, date: { $gte: startKey } },
      { date: 1, hoursTotal: 1, _id: 0 }
    ).lean()

    const thisWeek  = records.filter(r => r.date >= weekKey)
    const lastWeek  = records.filter(r => r.date >= startKey && r.date < weekKey)

    const avg = (arr) =>
      arr.length ? Math.round((arr.reduce((s, r) => s + r.hoursTotal, 0) / arr.length) * 10) / 10 : null

    const avgThis = avg(thisWeek)
    const avgLast = avg(lastWeek)

    let message = 'Sin datos de sueño esta semana'
    if (avgThis !== null && avgLast !== null) {
      const diff = Math.round((avgThis - avgLast) * 10) / 10
      if (diff > 0)      message = `Tu sueño ha mejorado ${diff}h respecto a la semana pasada`
      else if (diff < 0) message = `Tu sueño ha bajado ${Math.abs(diff)}h respecto a la semana pasada`
      else               message = `Tu sueño es igual que la semana pasada (${avgThis}h)`
    } else if (avgThis !== null) {
      message = `Llevas un promedio de ${avgThis}h de sueño esta semana`
    }

    return {
      avgSleep: avgThis ?? 0,
      insight: { type: 'sleep', message }
    }
  } catch {
    return { avgSleep: 0, insight: null }
  }
}

// ── Hábitos ───────────────────────────────────────────────────────────────────

async function getHabitInsights(userId) {
  try {
    const habits = await Habit.find(
      { userId, frequency: 'daily' },
      { completions: 1, _id: 0 }
    ).lean()

    if (!habits.length) {
      return { rate: 0, insight: { type: 'habits', message: 'Aún no tienes hábitos diarios configurados' } }
    }

    // Contar completions por día de la semana (0=dom … 6=sáb)
    const counts = Array(7).fill(0)
    for (const habit of habits) {
      for (const dateStr of habit.completions) {
        const dow = new Date(dateStr + 'T12:00:00').getDay()   // mediodía → evita desfases UTC
        counts[dow]++
      }
    }

    // Tasa global: completions totales / (hábitos × días únicos con alguna completion)
    const totalCompletions = counts.reduce((s, c) => s + c, 0)
    const totalUniqueDays  = new Set(habits.flatMap(h => h.completions)).size
    const rate = totalUniqueDays > 0
      ? Math.round((totalCompletions / (habits.length * totalUniqueDays)) * 100)
      : 0

    // Mejor día
    const bestDow   = counts.indexOf(Math.max(...counts))
    const bestCount = counts[bestDow]
    const bestPct   = habits.length > 0 ? Math.round((bestCount / habits.length) * 100) : 0

    const message = bestCount > 0
      ? `Tu mejor día es el ${DAY_NAMES[bestDow]} (${bestPct}% completado)`
      : 'Completa hábitos para ver tu mejor día de la semana'

    return { rate, insight: { type: 'habits', message } }
  } catch {
    return { rate: 0, insight: null }
  }
}

// ── Gym ───────────────────────────────────────────────────────────────────────

async function getGymInsights(userId, startOfWeek) {
  try {
    const uid = new mongoose.Types.ObjectId(userId)

    // Récords all-time por ejercicio
    const allTimeRecords = await Workout.aggregate([
      { $match: { userId: uid } },
      { $group: { _id: '$exercise', maxWeight: { $max: '$weight' } } }
    ])
    const recordMap = Object.fromEntries(allTimeRecords.map(r => [r._id, r.maxWeight]))

    // Récords de esta semana por ejercicio
    const weekRecords = await Workout.aggregate([
      { $match: { userId: uid, date: { $gte: startOfWeek } } },
      { $group: { _id: '$exercise', maxWeight: { $max: '$weight' } } }
    ])

    // Un PR esta semana = máximo de la semana === máximo all-time para ese ejercicio
    const prs = weekRecords.filter(r => recordMap[r._id] && r.maxWeight >= recordMap[r._id]).length

    const message = prs > 0
      ? `Has conseguido ${prs} PR${prs > 1 ? 's' : ''} esta semana 🏆`
      : 'Aún no has conseguido PRs esta semana'

    return { prs, insight: { type: 'gym', message } }
  } catch {
    return { prs: 0, insight: null }
  }
}

// ── GET /api/insights ─────────────────────────────────────────────────────────

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId
    const { startOfWeek, startOfLastWeek } = getWeekBounds()

    const [sleepStats, habitStats, gymStats] = await Promise.all([
      getSleepInsights(userId, startOfWeek, startOfLastWeek),
      getHabitInsights(userId),
      getGymInsights(userId, startOfWeek),
    ])

    const insights = [
      sleepStats.insight,
      habitStats.insight,
      gymStats.insight,
    ].filter(Boolean)

    // ── Life Score (0–100) ────────────────────────────────────────────
    const habitsScore = (habitStats.rate || 0)       // ya es 0–100

    const avg = sleepStats.avgSleep || 0
    const sleepScore = avg >= 7 ? 100 : avg >= 6 ? 70 : avg > 0 ? 40 : 0

    const prs = gymStats.prs || 0
    const gymScore   = prs >= 3 ? 100 : prs >= 1 ? 70 : 40

    const score = Math.round(habitsScore * 0.4 + sleepScore * 0.3 + gymScore * 0.3)

    // Persistir score del día (upsert — fire & forget, no bloquea la respuesta)
    const today = new Date().toISOString().split('T')[0]
    Score.findOneAndUpdate(
      { userId, date: today },
      { score },
      { upsert: true }
    ).catch(() => {})   // silencioso: no queremos crashear el endpoint por esto

    res.json({
      insights,
      stats: {
        avgSleep:            sleepStats.avgSleep,
        habitCompletionRate: habitStats.rate,
        prsThisWeek:         gymStats.prs,
      },
      score,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router

// ── GET /api/insights/score/history ─────────────────────────────────────────
// Últimos 30 días de Life Score del usuario (orden ascendente para gráfica)

router.get('/score/history', requireAuth, async (req, res, next) => {
  try {
    const history = await Score.find({ userId: req.userId })
      .sort({ date: 1 })
      .limit(30)
      .select('date score -_id')
      .lean()
    res.json(history)
  } catch (err) {
    next(err)
  }
})

module.exports = router
