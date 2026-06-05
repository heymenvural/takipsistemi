import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import AnaSayfa from './AnaSayfa'
import Profil from './Profil'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AnaSayfa />} />
        <Route path="/profil/:id" element={<Profil />} />
      </Routes>
    </Router>
  )
}

export default App