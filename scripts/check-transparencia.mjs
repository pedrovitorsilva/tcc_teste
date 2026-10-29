// Check das regras de transparência da ficha (faixas de qualidade e frase da sobra).
// Roda sem bundler: `npm run check` (Node lê o .ts direto, só com tipos a apagar).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avaliarQualidade, textoSobra } from '../src/lib/qualidade.ts';

const q = (coord) => ({ sobreposicao_pct: 0, enderecos_compartilhados: 0, contem_sigilo: [], pct_coord_precisas: coord });

test('pior das duas vence', () => {
  assert.equal(avaliarQualidade(q(0.99), true).geral, 'boa');
  assert.equal(avaliarQualidade(q(0.85), true).geral, 'media');
  assert.equal(avaliarQualidade(q(0.5), true).geral, 'baixa');
});
test('limites aproximados levam a geral para baixa, mas a linha de coordenadas segue boa', () => {
  const a = avaliarQualidade(q(0.99), false);
  assert.equal(a.geral, 'baixa');
  assert.deepEqual(a.itens.map((i) => [i.chave, i.faixa]), [['limites', 'baixa'], ['coordenadas', 'boa']]);
});
test('limiares inclusivos', () => {
  assert.equal(avaliarQualidade(q(0.95), true).geral, 'boa');
  assert.equal(avaliarQualidade(q(0.8), true).geral, 'media');
});
test('coordenada sem dado vira null e não derruba a faixa geral', () => {
  const a = avaliarQualidade(q(null), true);
  assert.deepEqual(a.itens.map((i) => i.faixa), ['boa', null]);
  assert.equal(a.geral, 'boa');
});
test('textoSobra', () => {
  assert.equal(textoSobra({ pop: 1306, pct: 0.571, tem_area: true }),
    '≈ 1.306 moradores (57,1%) vivem fora de qualquer loteamento, na área hachurada do mapa.');
  assert.equal(textoSobra({ pop: 85.9, pct: 0.0085, tem_area: false }),
    '≈ 86 moradores (0,9%) vivem fora de qualquer loteamento, em trechos pequenos entre eles.');
  assert.equal(textoSobra(null), null);
  assert.equal(textoSobra(undefined), null);
});
test('textoSobra sem resíduo: bairro todo coberto, sem "≈ 0 moradores"', () => {
  const todos = 'Todos os moradores do bairro estão em algum loteamento.';
  assert.equal(textoSobra({ pop: 0, pct: 0, tem_area: false }), todos);
  assert.equal(textoSobra({ pop: 0.4, pct: 0, tem_area: false }), todos);   // arredonda para 0
});
