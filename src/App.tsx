import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pacientes from './pages/Pacientes';
import Dentistas from './pages/Dentistas';
import Agenda from './pages/Agenda';
import Consulta from './pages/Consulta';
import Prontuarios from './pages/Prontuarios';
import Odontograma from './pages/Odontograma';
import Orcamentos from './pages/Orcamentos';
import Pagamentos from './pages/Pagamentos';
import Financeiro from './pages/Financeiro';
import Relatorios from './pages/Relatorios';
import Usuarios from './pages/Usuarios';
import Cadastro from './pages/Cadastro';
import RecuperarSenha from './pages/RecuperarSenha';
import Home from './pages/Home';
import Planos from './pages/Planos';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/recuperar-senha" element={<RecuperarSenha />} />
          <Route path="/redefinir-senha" element={<RecuperarSenha />} />
          {/* Fora do grupo protegido de propósito: quem não tem sessão precisa
              ver a landing, não ser jogado direto no login. A Home decide:
              logado vai ao painel, anônimo fica na landing. */}
          <Route path="/" element={<Home />} />
          <Route path="/inicio" element={<Home />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/planos" element={<ProtectedRoute permissao="usuarios"><Planos /></ProtectedRoute>} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pacientes" element={<ProtectedRoute permissao="pacientes"><Pacientes /></ProtectedRoute>} />
            <Route path="/dentistas" element={<ProtectedRoute permissao="dentistas"><Dentistas /></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute permissao="agenda"><Agenda /></ProtectedRoute>} />
            <Route path="/consulta/:id" element={<ProtectedRoute permissao="consultas"><Consulta /></ProtectedRoute>} />
            <Route path="/prontuarios" element={<ProtectedRoute permissao="prontuario"><Prontuarios /></ProtectedRoute>} />
            <Route path="/odontograma" element={<ProtectedRoute permissao="odontograma"><Odontograma /></ProtectedRoute>} />
            <Route path="/orcamentos" element={<ProtectedRoute permissao="orcamentos"><Orcamentos /></ProtectedRoute>} />
            <Route path="/pagamentos" element={<ProtectedRoute permissao="pagamentos"><Pagamentos /></ProtectedRoute>} />
            <Route path="/financeiro" element={<ProtectedRoute permissao="financeiro"><Financeiro /></ProtectedRoute>} />
            <Route path="/relatorios" element={<ProtectedRoute permissao="relatorios"><Relatorios /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute permissao="usuarios"><Usuarios /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/inicio" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
