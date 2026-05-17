import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { initDb, getDb } from './db.js'
import tasksRouter from './routes/tasks.js'
import agentsRouter from './routes/agents.js'
import positionsRouter from './routes/positions.js'
import leaderboardRouter from './routes/leaderboard.js'
import escrowRouter from './routes/escrow.js'
import queueRouter from './routes/queue.js'
import marketplaceRouter, { initMarketplaceTables } from './routes/marketplace.js'


const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' })
})

app.use('/api/tasks', tasksRouter)
app.use('/api/agents', agentsRouter)
app.use('/api/positions', positionsRouter)
app.use('/api/leaderboard', leaderboardRouter)
app.use('/api/escrow', escrowRouter)
app.use('/api/queue', queueRouter)
app.use('/api/marketplace', marketplaceRouter)

initDb()
initMarketplaceTables(getDb())
app.listen(PORT, () => {
  console.log(`🚀 Argentus API running on http://localhost:${PORT}`)
  console.log(`   Tasks:      POST /api/tasks`)
  console.log(`   Escrow:     POST /api/escrow/create|fulfill|arbitrate|collect`)
  console.log(`   Agents:     GET  /api/agents`)
  console.log(`   Positions:  GET  /api/positions`)
  console.log(`   Leaderboard:GET  /api/leaderboard
   Queue:       GET  /api/queue/restore | POST /api/queue/sync`)
})
