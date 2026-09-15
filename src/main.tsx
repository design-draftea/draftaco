import { initializeBrand } from './shared/brand/config'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
import { initializeAppTheme } from './theme'

initializeBrand()
initializeAppTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
