import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Mail, KeyRound, CheckCircle, ArrowLeft } from 'lucide-react';

// Mesma tela atende os dois casos: pedir o link (/recuperar-senha) e definir
// a nova senha (/redefinir-senha?token=...).

export default function RecuperarSenha() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();

  const redefinindo = Boolean(token);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [pronto, setPronto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const pedir = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setAviso('');
    setEnviando(true);

    try {
      const res = await fetch('/api/plataforma/recuperar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dados?.error || 'Não foi possível solicitar o link.');
      setAviso(dados.mensagem);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha de conexão.');
    } finally {
      setEnviando(false);
    }
  };

  const redefinir = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (senha.length < 6) return setErro('A senha deve ter ao menos 6 caracteres.');
    if (senha !== confirmar) return setErro('As senhas não conferem.');

    setEnviando(true);
    try {
      const res = await fetch('/api/plataforma/redefinir-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, senha }),
      });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dados?.error || 'Não foi possível redefinir a senha.');
      setPronto(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha de conexão.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-sky-600">
          <ArrowLeft className="h-4 w-4" /> Voltar ao login
        </Link>

        {pronto ? (
          <>
            <CheckCircle className="mb-4 h-10 w-10 text-emerald-500" />
            <h1 className="text-xl font-bold text-slate-900">Senha alterada</h1>
            <p className="mt-2 text-sm text-slate-600">
              Sua senha foi redefinida e as sessões abertas foram encerradas. Faça login novamente.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-6 w-full rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Ir para o login
            </button>
          </>
        ) : (
          <>
            <div className="mb-6 flex items-center gap-3">
              {redefinindo ? <KeyRound className="h-7 w-7 text-sky-600" /> : <Mail className="h-7 w-7 text-sky-600" />}
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {redefinindo ? 'Definir nova senha' : 'Recuperar senha'}
                </h1>
                <p className="text-sm text-slate-500">
                  {redefinindo ? 'Escolha uma senha nova para a sua conta.' : 'Enviamos um link para o seu e-mail.'}
                </p>
              </div>
            </div>

            {erro && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</div>}
            {aviso && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{aviso}</div>}

            {redefinindo ? (
              <form onSubmit={redefinir} className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Nova senha</span>
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
                    minLength={6}
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Confirmar senha</span>
                  <input
                    type="password"
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
                    minLength={6}
                    required
                  />
                </label>
                <button
                  type="submit"
                  disabled={enviando}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-70"
                >
                  {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar nova senha
                </button>
              </form>
            ) : (
              <form onSubmit={pedir} className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Seu e-mail</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
                    placeholder="voce@clinica.com"
                    required
                  />
                </label>
                <button
                  type="submit"
                  disabled={enviando}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-70"
                >
                  {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
                  Enviar link de recuperação
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}