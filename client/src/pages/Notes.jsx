export default function Notes() {
  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>📝 Notas</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>Tu diario personal</p>
      <div style={placeholderStyle}>
        <p style={{ fontSize: 48, margin: 0 }}>🚧</p>
        <p style={{ color: '#888', fontSize: 14, marginTop: 8 }}>Próximamente — escribe tus notas del día</p>
      </div>
    </div>
  )
}

const placeholderStyle = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', padding: '48px 0', borderRadius: 12,
  border: '2px dashed #eee', background: '#fafafa'
}
