import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerLocale, setDefaultLocale } from 'react-datepicker'
import { ptBR } from 'date-fns/locale'
import App from './App'
import './index.css'

registerLocale('pt-BR', ptBR)
setDefaultLocale('pt-BR')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
