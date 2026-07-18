import { useState } from 'react'
import { Lock } from 'lucide-react'
import { DASH_PASSWORD } from '../config'

export default function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (password === DASH_PASSWORD) {
      onLogin()
    } else {
      setError(true)
      setTimeout(() => setError(false), 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-accent-gold/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-accent-gold" />
          </div>
        </div>

        <h1 className="text-xl font-bold mb-1">Operações</h1>
        <p className="text-text-secondary text-sm mb-6">Dashboard de Trading</p>

        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Senha de acesso"
          className={`w-full px-4 py-3 rounded-lg bg-bg-primary border text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-gold transition-colors ${
            error ? 'border-accent-red' : 'border-border'
          }`}
          autoFocus
        />

        {error && (
          <p className="text-accent-red text-sm mt-2">Senha incorreta</p>
        )}

        <button
          type="submit"
          className="w-full mt-4 py-3 rounded-lg bg-accent-gold text-bg-primary font-semibold hover:bg-accent-gold/90 transition-colors"
        >
          Entrar
        </button>
      </form>
    </div>
  )
}
