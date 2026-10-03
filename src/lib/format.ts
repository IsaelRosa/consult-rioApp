export const moeda = (valor: number | string | null | undefined) => {
  const n = typeof valor === 'string' ? parseFloat(valor) : Number(valor ?? 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const dataBR = (data: string | Date | null | undefined) => {
  if (!data) return '-';
  const d = typeof data === 'string' ? new Date(data) : data;
  return d.toLocaleDateString('pt-BR');
};

export const dataHoraBR = (data: string | Date | null | undefined) => {
  if (!data) return '-';
  const d = typeof data === 'string' ? new Date(data) : data;
  return d.toLocaleString('pt-BR');
};

export const telefoneBR = (telefone: string | null | undefined) => {
  if (!telefone) return '-';
  const t = telefone.replace(/\D/g, '');
  if (t.length === 11) return `(${t.slice(0, 2)}) ${t.slice(2, 7)}-${t.slice(7)}`;
  if (t.length === 10) return `(${t.slice(0, 2)}) ${t.slice(2, 6)}-${t.slice(6)}`;
  return telefone;
};

export const cpfMask = (cpf: string | null | undefined) => {
  if (!cpf) return '-';
  const c = cpf.replace(/\D/g, '');
  if (c.length === 11) return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`;
  return cpf;
};
