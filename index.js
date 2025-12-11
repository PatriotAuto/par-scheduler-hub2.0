const express = require('express')
const app = express()

app.get('/health', (req, res) => {
  res.json({ ok: true, message: 'Patriot Scheduler backend is alive' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log('Server running on port', PORT)
})