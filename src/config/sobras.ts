// "Sobra" de cada bairro: a parte que nenhum loteamento cobre. Polígonos
// gerados pelo ETL (dados/etl/etl.ipynb, Etapa 11.1, `sobras.geojson`) e
// copiados para public/data — um polígono por bairro, com `pop_sem_loteamento`, `pop_pct`,
// `area_km2` e `area_pct` nas properties. Distritos não entram (não têm loteamentos).

export const SOBRAS_URL = '/data/sobras.geojson';
export const SOBRA_SOURCE_ID = 'sobra-source';
export const SOBRA_FILL_LAYER_ID = 'sobra-fill';
export const SOBRA_HATCH_IMAGE_ID = 'sobra-hatch';

/**
 * Hachura da sobra: a do "aproximado" (45°, `uncertain-hatch`) espelhada e mais
 * aberta, na mesma cor `--uncertain` — mesma família visual ("dado incerto"),
 * mas distinguível do loteamento aproximado. Registrada em todos os temas.
 */
export const SOBRA_HATCH_SIZE = 12;
export const SOBRA_FILL_OPACITY = 0.85;
