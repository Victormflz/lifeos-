const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const User = require('../models/User')

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const SALT_ROUNDS    = 12

async function createAdmin() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('❌  Faltan variables de entorno: ADMIN_EMAIL y/o ADMIN_PASSWORD')
    console.error('    Ejecútalo así:')
    console.error('    ADMIN_EMAIL=tu@email.com ADMIN_PASSWORD=contraseña_segura npm run create-admin')
    process.exit(1)
  }

  if (ADMIN_PASSWORD.length < 12) {
    console.error('❌  ADMIN_PASSWORD debe tener al menos 12 caracteres')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGODB_URI)

  const exists = await User.findOne({ email: ADMIN_EMAIL })
  if (exists) {
    console.log('⚠️   Ya existe un usuario con ese email. No se ha modificado nada.')
    await mongoose.disconnect()
    process.exit(0)
  }

  const hash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS)
  await User.create({ email: ADMIN_EMAIL, password: hash })

  console.log(`✅  Admin creado: ${ADMIN_EMAIL}`)
  await mongoose.disconnect()
  process.exit(0)
}

createAdmin().catch(err => {
  console.error('❌  Error inesperado:', err.message)
  process.exit(1)
})
