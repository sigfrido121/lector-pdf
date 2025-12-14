
import express from 'express'
import mongoose from 'mongoose'

const app = express()
app.use(express.json())

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB conectado'))
    .catch(err => console.error(err))
} else {
  console.log('MongoDB no configurado')
}

app.get('/health', (_, res) => {
  res.json({ status: 'ok' })
})

app.listen(3001, () => {
  console.log('Backend escuchando en puerto 3001')
})
