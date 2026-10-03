// Limitador de requisições em memória, para os endpoints públicos.
//
// Em produção com mais de uma instância do Node o limite passa a valer por
// processo. Para o nosso caso (uma instância por clínica) é suficiente; se
// escalar, trocar por Redis mantendo a mesma interface.

const janelas = new Map();

const limpar = () => {
  const agora = Date.now();
  for (const [chave, registro] of janelas) {
    if (agora > registro.reiniciaEm) janelas.delete(chave);
  }
};

// Evita crescimento ilimitado da memória em endpoints expostos.
const intervalo = setInterval(limpar, 60_000);
intervalo.unref?.();

export const limite = ({ janelaMs = 60_000, max = 10, mensagem } = {}) =>
  (req, res, next) => {
    const agora = Date.now();
    const chave = `${req.ip || 'desconhecido'}:${req.baseUrl}${req.path}`;

    let registro = janelas.get(chave);
    if (!registro || agora > registro.reiniciaEm) {
      registro = { contagem: 0, reiniciaEm: agora + janelaMs };
      janelas.set(chave, registro);
    }

    registro.contagem += 1;

    const restantes = max - registro.contagem;
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, restantes)));

    if (registro.contagem > max) {
      const espera = Math.ceil((registro.reiniciaEm - agora) / 1000);
      res.setHeader('Retry-After', String(espera));
      return res.status(429).json({
        error: mensagem || `Muitas tentativas. Tente novamente em ${espera} segundos.`,
      });
    }

    return next();
  };

export default { limite };