const mongoose = require('mongoose')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const Routine = require('../models/Routine')

const ROUTINES = [
  {
    name: 'Push',
    exercises: [
      'Press banca', 'Press inclinado', 'Aperturas en máquina',
      'Press militar', 'Elevaciones laterales', 'Pájaros',
      'Extensión de tríceps en polea', 'Fondos de tríceps'
    ]
  },
  {
    name: 'Pull',
    exercises: [
      'Dominadas', 'Remo con barra', 'Remo en polea baja',
      'Jalones al pecho', 'Pullover', 'Curl de bíceps con barra',
      'Curl martillo', 'Curl en polea'
    ]
  },
  {
    name: 'Legs',
    exercises: [
      'Sentadilla', 'Prensa de piernas', 'Extensiones de cuádriceps',
      'Curl femoral tumbado', 'Zancadas', 'Hip thrust',
      'Peso muerto rumano', 'Elevaciones de gemelo de pie'
    ]
  },
  {
    name: 'Full Body',
    exercises: [
      'Sentadilla', 'Press banca', 'Peso muerto', 'Press militar',
      'Dominadas', 'Remo con barra', 'Curl de bíceps con barra',
      'Extensión de tríceps en polea'
    ]
  }
]

async function main() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('MongoDB conectado')

  for (const r of ROUTINES) {
    await Routine.findOneAndUpdate({ name: r.name }, r, { upsert: true, new: true })
    console.log('Upsert:', r.name)
  }

  await mongoose.disconnect()
  console.log('Rutinas creadas/actualizadas.')
}

main().catch(err => { console.error(err); process.exit(1) })
