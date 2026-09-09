import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AuthProvider } from './state/AuthProvider'
import './styles.css'
import './interactive.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Above App so the refresh-cookie redemption starts on the first paint rather than after it:
        every signed-in query below waits on the answer, and starting it a render later shows an
        anonymous page to a user who is in fact signed in. */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
