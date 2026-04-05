const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const User = require('../models/User')

const ADMIN_EMAIL    = 'admin@lifeos.com'
const ADMIN_PASSWORD = 'admin1234'
const SALT_ROUNDS    = 12

async function main() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('MongoDB conectado')

  const exists = await User.findOne({ email: ADMIN_EMAIL })
  if (exists) {
    console.log('Admin ya existe:', ADMIN_EMAIL)
  } else {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS)
    await User.create({ email: ADMIN_EMAIL, password: hash })
    console.log('Admin creado:', ADMIN_EMAIL)
  }

  await mongoose.disconnect()
  console.log('Conexión cerrada')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
