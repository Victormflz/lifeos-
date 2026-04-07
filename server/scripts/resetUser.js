/**
 * resetUser.js — Crea o actualiza un usuario (email + contraseña)
 *
 * Uso:
 *   node scripts/resetUser.js <email> <nueva_contraseña>
 *
 * Ejemplo:
 *   node scripts/resetUser.js admin@gmail.com miContraseña123
 */

const mongoose = require('mongoose')
const bcrypt   = require('bcrypt')
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const User = require('../models/User')

const [,, email, password] = process.argv

if (!email || !password) {
  console.error('❌  Uso: node scripts/resetUser.js <email> <contraseña>')
  process.exit(1)
}
if (password.length < 8) {
  console.error('❌  La contraseña debe tener al menos 8 caracteres')
  process.exit(1)
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI)

  const hash = await bcrypt.hash(password, 12)
  const user = await User.findOneAndUpdate(
    { email },
    { email, password: hash },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  console.log(`✅  Usuario listo: ${user.email}`)
  await mongoose.disconnect()
}

main().catch(err => {
  console.error('❌  Error:', err.message)
  process.exit(1)
})
