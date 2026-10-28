'use client';

import { IconPopoverButton, PANEL_ABOVE_CENTERED_BELOW_LG } from '../IconPopoverButton';
import { Caixa } from './LayerControls';
import { MapIcon } from '@/components/icons';
import { GRUPOS_VISUALIZACAO, type VisualizacaoId } from '@/config/visualizacoes';

/** Mesmo grupo de radio em todos os grupos do menu: seleção única no menu inteiro. */
const RADIO = 'visualizacao';

/** Botão "Visualizações": uma visualização do mapa por vez, de qualquer grupo. */
export function VisualizacoesPopoverButton({
  value,
  onChange,
  className,
}: {
  value: VisualizacaoId | null;
  onChange: (id: VisualizacaoId | null) => void;
  className?: string;
}) {
  return (
    <IconPopoverButton
      icon={<MapIcon className="h-4 w-4" />}
      ariaLabel="Visualizações do mapa"
      title="Visualizações"
      panelPosition={PANEL_ABOVE_CENTERED_BELOW_LG}
      className={className}
    >
      <div className="w-64 rounded-[10px] border border-cv-border bg-panel p-2 shadow-[0_4px_16px_rgba(0,0,0,.08)]">
        <Caixa radio={RADIO} checked={value === null} onChange={() => onChange(null)}>
          Nenhuma
        </Caixa>
        {GRUPOS_VISUALIZACAO.map((grupo) => (
          <fieldset key={grupo.titulo} className="mt-1 border-t border-cv-border-soft pt-1">
            <legend className="cv-sec-title px-2 pt-1 pb-0.5 text-[12px]">{grupo.titulo}</legend>
            {grupo.opcoes.map((opcao) => (
              <Caixa key={opcao.id} radio={RADIO} checked={value === opcao.id} onChange={() => onChange(opcao.id)}>
                {opcao.rotulo}
              </Caixa>
            ))}
          </fieldset>
        ))}
      </div>
    </IconPopoverButton>
  );
}
