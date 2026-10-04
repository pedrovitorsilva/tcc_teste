import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { intersect } from '@turf/intersect';
import { area } from '@turf/area';
import { centroid } from '@turf/centroid';
import { distance } from '@turf/distance';
import { featureCollection } from '@turf/helpers';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, 'public', 'data');
mkdirSync(outDir, { recursive: true });

function normalizeBairros(geojson) {
  geojson.features = geojson.features.map((feature) => {
    if (feature.geometry.type === 'GeometryCollection') {
      return {
        ...feature,
        geometry: {
          type: 'MultiPolygon',
          coordinates: feature.geometry.geometries.map((g) => g.coordinates),
        },
      };
    }
    return feature;
  });
  return geojson;
}

// Atribui a cada filho o nome do ÚNICO pai cuja geometria tem a MAIOR área de
// sobreposição com a do filho. Se não houver nenhuma sobreposição real, cai no
// pai cujo centróide está mais próximo do centróide do filho, garantindo que
// targetProp nunca fique vazio (sempre 1 bairro, nunca 0).
function attachSingleParentByArea(childrenFC, parentsFC, parentNameProp, targetProp) {
  let fallbackCount = 0;
  childrenFC.features.forEach((child) => {
    let bestParent = null;
    let bestArea = 0;
    parentsFC.features.forEach((parent) => {
      let overlap;
      try {
        overlap = intersect(featureCollection([child, parent]));
      } catch {
        overlap = null;
      }
      if (!overlap) return;
      const overlapArea = area(overlap);
      if (overlapArea > bestArea) {
        bestArea = overlapArea;
        bestParent = parent;
      }
    });

    if (!bestParent) {
      fallbackCount += 1;
      const childCentroid = centroid(child);
      bestParent = parentsFC.features.reduce((closest, parent) => {
        const d = distance(childCentroid, centroid(parent));
        return !closest || d < closest.d ? { parent, d } : closest;
      }, null)?.parent ?? null;
    }

    child.properties[targetProp] = bestParent ? bestParent.properties[parentNameProp] : null;
  });
  console.log(
    `  ${targetProp}: ${childrenFC.features.length} features, ${fallbackCount} via fallback de centróide`
  );
  return childrenFC;
}

// MOCK (MVP): campo sintético e determinístico, marcando ~1 em cada 6
// loteamentos (~17%) como não confiável. Ver docs/DECISOES-TECNICAS.md §3.
function attachReliability(loteamentosFC) {
  loteamentosFC.features.forEach((feature, index) => {
    feature.properties.is_reliable = index % 6 !== 0;
  });
}

const bairros = normalizeBairros(
  JSON.parse(readFileSync(path.join(root, 'neatogeo_Bairros.geojson'), 'utf8'))
);

const loteamentos = JSON.parse(
  readFileSync(path.join(root, 'neatogeo_Loteamentos.geojson'), 'utf8')
);
attachSingleParentByArea(loteamentos, bairros, 'name', 'parentBairro');
attachReliability(loteamentos);

writeFileSync(path.join(outDir, 'bairros.geojson'), JSON.stringify(bairros));
writeFileSync(path.join(outDir, 'loteamentos.geojson'), JSON.stringify(loteamentos));

console.log('Dados preparados em public/data/:');
console.log(`  bairros.geojson: ${bairros.features.length} features`);
console.log(`  loteamentos.geojson: ${loteamentos.features.length} features`);
console.log('  setores.geojson: mantido como está (fonte raw não faz mais parte do projeto)');
