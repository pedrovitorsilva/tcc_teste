// Geometria ilustrativa (desenhada à mão) no viewBox de conquista.svg.
export const VB = '0 0 288 359.546922';
export const W = 288;
export const H = 359.546922;

export const LOTS = [
  '40,60 120,40 140,110 60,130',
  '120,40 210,55 190,120 140,110',
  '210,55 260,110 230,160 190,120',
  '60,130 140,110 150,190 50,200',
  '140,110 190,120 200,190 150,190',
  '190,120 230,160 240,220 200,190',
  '50,200 150,190 160,280 70,290',
  '150,190 200,190 240,220 230,300 160,280',
];

export const BAIRROS = ['0,0 170,0 140,200 0,230', '170,0 288,0 288,190 140,200', '0,230 140,200 288,190 288,360 0,360'];

export const SETOR_V = [96, 192];
export const SETOR_H = [120, 240];

// Setor ilustrativo isolado (viewBox 0 0 320 220)
export const SECTOR_VB = '0 0 320 220';
export const SECTOR_LOTS = {
  a: '20,20 150,20 130,110 20,120', // menos endereços
  b: '150,20 300,20 300,120 130,110', // mais endereços
  c: '20,120 130,110 300,120 300,140 20,140', // sobra
};
export const SECTOR_DOTS: number[][] = [
  [50, 50], [90, 70], [60, 95],
  [170, 45], [200, 60], [230, 40], [260, 70], [190, 90], [240, 95], [280, 50], [215, 105],
];
