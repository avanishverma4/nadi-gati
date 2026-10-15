// The GloFAS model cell to read river flow from, per gauge. Generated on 15 Oct 2026 by comparing
// the 5×5 cells (0.05°, about 5 km apart) around each gauge and checking the choice by hand.
//
// A gauge's own coordinates often land on a cell beside the river, which reads 0–5 m³/s even on the
// Brahmaputra, or on a bigger river nearby (a tributary gauge at a confluence). So each gauge uses
// the nearest cell whose 30-day mean flow (15 Sep–15 Oct 2026) is in the range expected for its
// river, taken from the gauges on that river whose cell was clear-cut.
//
// minM3s is 2% of that mean: lower than any real dry-season flow on the river, but above the
// near-zero values of a cell off the channel. The ingestion job rejects anything below it.
//
// Gauges missing from FLOW_CELLS get no modelled flow; see FLOW_DISABLED for why.

export interface FlowCell {
  latitude: number;
  longitude: number;
  minM3s: number;
}

export const FLOW_CELLS: Record<string, FlowCell> = {
  station_bagmati_aurai: { latitude: 26.312, longitude: 85.525, minM3s: 7 }, // Bagmati, ~333 m³/s
  station_bagmati_benibad: { latitude: 26.12, longitude: 85.62, minM3s: 7 }, // Bagmati, ~340 m³/s
  station_bagmati_dheng: { latitude: 26.79, longitude: 85.29, minM3s: 5 }, // Bagmati, ~247 m³/s
  station_bagmati_katra: { latitude: 26.215, longitude: 85.595, minM3s: 7 }, // Bagmati, ~337 m³/s
  station_bagmati_runisaidpur: { latitude: 26.38, longitude: 85.48, minM3s: 7 }, // Bagmati, ~327 m³/s
  station_barak_annapurnaghat: { latitude: 24.83, longitude: 92.78, minM3s: 26 }, // Barak, ~1,314 m³/s
  station_barak_badarpur: { latitude: 24.85, longitude: 92.58, minM3s: 34 }, // Barak, ~1,708 m³/s
  station_barak_dudpatil: { latitude: 24.845, longitude: 92.812, minM3s: 26 }, // Barak, ~1,285 m³/s
  station_barak_sadarghat: { latitude: 24.838, longitude: 92.802, minM3s: 26 }, // Barak, ~1,285 m³/s
  station_brahmaputra_aswaklanta: { latitude: 26.208, longitude: 91.735, minM3s: 273 }, // Brahmaputra, ~13,649 m³/s
  station_brahmaputra_bogibeel: { latitude: 27.402, longitude: 94.715, minM3s: 137 }, // Brahmaputra, ~6,859 m³/s
  station_brahmaputra_dhubri: { latitude: 26.02, longitude: 89.98, minM3s: 324 }, // Brahmaputra, ~16,189 m³/s
  station_brahmaputra_dibrugarh: { latitude: 27.53, longitude: 94.87, minM3s: 135 }, // Brahmaputra, ~6,755 m³/s
  station_brahmaputra_fancybazar: { latitude: 26.185, longitude: 91.691, minM3s: 273 }, // Brahmaputra, ~13,658 m³/s
  station_brahmaputra_goalpara: { latitude: 26.17, longitude: 90.62, minM3s: 282 }, // Brahmaputra, ~14,089 m³/s
  station_brahmaputra_jogighopa: { latitude: 26.195, longitude: 90.575, minM3s: 317 }, // Brahmaputra, ~15,840 m³/s
  station_brahmaputra_kamakhya: { latitude: 26.172, longitude: 91.655, minM3s: 273 }, // Brahmaputra, ~13,658 m³/s
  station_brahmaputra_kamalabari: { latitude: 26.925, longitude: 94.185, minM3s: 157 }, // Brahmaputra, ~7,841 m³/s
  station_brahmaputra_maijan: { latitude: 27.558, longitude: 94.952, minM3s: 135 }, // Brahmaputra, ~6,745 m³/s
  station_brahmaputra_mohanaghat: { latitude: 27.542, longitude: 94.858, minM3s: 135 }, // Brahmaputra, ~6,755 m³/s
  station_brahmaputra_neamati: { latitude: 26.9, longitude: 94.23, minM3s: 157 }, // Brahmaputra, ~7,834 m³/s
  station_brahmaputra_pandu: { latitude: 26.17, longitude: 91.68, minM3s: 273 }, // Brahmaputra, ~13,658 m³/s
  station_brahmaputra_sukreswar: { latitude: 26.18, longitude: 91.69, minM3s: 273 }, // Brahmaputra, ~13,658 m³/s
  station_brahmaputra_tarabari: { latitude: 26.235, longitude: 91.025, minM3s: 279 }, // Brahmaputra, ~13,953 m³/s
  station_brahmaputra_tezpur: { latitude: 26.62, longitude: 92.74, minM3s: 249 }, // Brahmaputra, ~12,431 m³/s
  station_brahmaputra_uzanbazar: { latitude: 26.245, longitude: 91.758, minM3s: 273 }, // Brahmaputra, ~13,639 m³/s
  station_burhidihing_khowang: { latitude: 27.325, longitude: 94.922, minM3s: 6 }, // Burhi Dihing, ~283 m³/s
  station_burhidihing_naharkatia: { latitude: 27.302, longitude: 95.278, minM3s: 5 }, // Burhi Dihing, ~246 m³/s
  station_burhigandak_ahirwalia: { latitude: 26.65, longitude: 84.91, minM3s: 6 }, // Burhi Gandak, ~292 m³/s
  station_burhigandak_akharaghat: { latitude: 26.128, longitude: 85.398, minM3s: 8 }, // Burhi Gandak, ~397 m³/s
  station_burhigandak_chakia: { latitude: 26.425, longitude: 85.048, minM3s: 7 }, // Burhi Gandak, ~354 m³/s
  station_burhigandak_chandwara: { latitude: 26.119, longitude: 85.385, minM3s: 8 }, // Burhi Gandak, ~397 m³/s
  station_burhigandak_khagaria: { latitude: 25.5, longitude: 86.48, minM3s: 11 }, // Burhi Gandak, ~536 m³/s
  station_burhigandak_lalbegia: { latitude: 26.585, longitude: 85.025, minM3s: 6 }, // Burhi Gandak, ~314 m³/s
  station_burhigandak_rosera: { latitude: 25.75, longitude: 85.96, minM3s: 9 }, // Burhi Gandak, ~430 m³/s
  station_burhigandak_samastipur: { latitude: 25.855, longitude: 85.775, minM3s: 8 }, // Burhi Gandak, ~415 m³/s
  station_burhigandak_sikandarpur: { latitude: 26.13, longitude: 85.39, minM3s: 8 }, // Burhi Gandak, ~397 m³/s
  station_dhansiri_numaligarh: { latitude: 26.56, longitude: 93.75, minM3s: 7 }, // Dhansiri (South), ~358 m³/s
  station_gandak_bagaha: { latitude: 27.002, longitude: 84.095, minM3s: 84 }, // Gandak, ~4,181 m³/s
  station_gandak_dumariya: { latitude: 26.23, longitude: 84.88, minM3s: 87 }, // Gandak, ~4,344 m³/s
  station_gandak_hajipur: { latitude: 25.68, longitude: 85.11, minM3s: 88 }, // Gandak, ~4,406 m³/s
  station_gandak_jadopur: { latitude: 26.545, longitude: 84.525, minM3s: 86 }, // Gandak, ~4,302 m³/s
  station_gandak_lalganj: { latitude: 25.825, longitude: 85.125, minM3s: 88 }, // Gandak, ~4,392 m³/s
  station_gandak_rewaghat: { latitude: 25.98, longitude: 85, minM3s: 88 }, // Gandak, ~4,377 m³/s
  station_gandak_sangrampur: { latitude: 26.435, longitude: 84.675, minM3s: 86 }, // Gandak, ~4,319 m³/s
  station_gandak_sonepur: { latitude: 25.698, longitude: 85.145, minM3s: 88 }, // Gandak, ~4,406 m³/s
  station_gandak_valmikinagar: { latitude: 27.432, longitude: 83.865, minM3s: 82 }, // Gandak, ~4,100 m³/s
  station_ganga_barhara: { latitude: 25.715, longitude: 84.715, minM3s: 496 }, // Ganga, ~24,783 m³/s
  station_ganga_bateshwar: { latitude: 25.321, longitude: 87.229, minM3s: 724 }, // Ganga, ~36,181 m³/s
  station_ganga_bhadraghat: { latitude: 25.608, longitude: 85.221, minM3s: 667 }, // Ganga, ~33,368 m³/s
  station_ganga_bhagalpur: { latitude: 25.26, longitude: 87.01, minM3s: 719 }, // Ganga, ~35,948 m³/s
  station_ganga_buxar: { latitude: 25.62, longitude: 83.98, minM3s: 311 }, // Ganga, ~15,547 m³/s
  station_ganga_collectorateghat: { latitude: 25.626, longitude: 85.148, minM3s: 667 }, // Ganga, ~33,333 m³/s
  station_ganga_danapurghat: { latitude: 25.641, longitude: 85.095, minM3s: 578 }, // Ganga, ~28,922 m³/s
  station_ganga_dighaghat: { latitude: 25.65, longitude: 85.07, minM3s: 578 }, // Ganga, ~28,907 m³/s
  station_ganga_gaighat: { latitude: 25.614, longitude: 85.202, minM3s: 667 }, // Ganga, ~33,368 m³/s
  station_ganga_gandhighat: { latitude: 25.62, longitude: 85.17, minM3s: 667 }, // Ganga, ~33,353 m³/s
  station_ganga_hathidah: { latitude: 25.37, longitude: 85.98, minM3s: 686 }, // Ganga, ~34,284 m³/s
  station_ganga_kahalgaon: { latitude: 25.32, longitude: 87.24, minM3s: 724 }, // Ganga, ~36,181 m³/s
  station_ganga_manihari: { latitude: 25.334, longitude: 87.625, minM3s: 823 }, // Ganga, ~41,127 m³/s
  station_ganga_maniksarkar: { latitude: 25.264, longitude: 86.994, minM3s: 719 }, // Ganga, ~35,937 m³/s
  station_ganga_mehnar: { latitude: 25.552, longitude: 85.402, minM3s: 669 }, // Ganga, ~33,454 m³/s
  station_ganga_munger: { latitude: 25.38, longitude: 86.52, minM3s: 713 }, // Ganga, ~35,634 m³/s
  station_ganga_sultanganj: { latitude: 25.298, longitude: 86.738, minM3s: 716 }, // Ganga, ~35,779 m³/s
  station_ghaghra_chhapra: { latitude: 25.775, longitude: 84.635, minM3s: 168 }, // Ghaghra, ~8,401 m³/s
  station_ghaghra_darauli: { latitude: 26.02, longitude: 84.13, minM3s: 165 }, // Ghaghra, ~8,246 m³/s
  station_ghaghra_gangpur: { latitude: 25.87, longitude: 84.45, minM3s: 167 }, // Ghaghra, ~8,342 m³/s
  station_ghaghra_manjhi: { latitude: 25.775, longitude: 84.582, minM3s: 167 }, // Ghaghra, ~8,372 m³/s
  station_ghaghra_revelganj: { latitude: 25.785, longitude: 84.615, minM3s: 168 }, // Ghaghra, ~8,401 m³/s
  station_jiabhoreli_tezpur: { latitude: 26.685, longitude: 92.805, minM3s: 27 }, // Jia Bhoreli, ~1,353 m³/s
  station_kamla_jhanjharpur: { latitude: 26.26, longitude: 86.23, minM3s: 2 }, // Kamla Balan, ~118 m³/s
  station_karmanasa_chausa: { latitude: 25.475, longitude: 83.845, minM3s: 7 }, // Karmanasa, ~344 m³/s
  station_kosi_baltara: { latitude: 25.51, longitude: 86.72, minM3s: 88 }, // Kosi, ~4,405 m³/s
  station_kosi_birpur: { latitude: 26.52, longitude: 86.94, minM3s: 64 }, // Kosi, ~3,196 m³/s
  station_kosi_kursela: { latitude: 25.42, longitude: 87.2, minM3s: 91 }, // Kosi, ~4,566 m³/s
  station_kosi_nirmali: { latitude: 26.265, longitude: 86.585, minM3s: 65 }, // Kosi, ~3,251 m³/s
  station_mahananda_amdabad: { latitude: 25.285, longitude: 87.825, minM3s: 16 }, // Mahananda, ~802 m³/s
  station_mahananda_azamnagar: { latitude: 25.598, longitude: 87.765, minM3s: 15 }, // Mahananda, ~739 m³/s
  station_mahananda_dhengra: { latitude: 25.86, longitude: 87.77, minM3s: 11 }, // Mahananda, ~525 m³/s
  station_mahananda_jhaua: { latitude: 25.59, longitude: 87.79, minM3s: 15 }, // Mahananda, ~739 m³/s
  station_punpun_fatuhatriveni: { latitude: 25.508, longitude: 85.312, minM3s: 8 }, // Punpun, ~387 m³/s
  station_punpun_sripalpur: { latitude: 25.51, longitude: 85.17, minM3s: 7 }, // Punpun, ~372 m³/s
  station_sone_koelwar: { latitude: 25.58, longitude: 84.79, minM3s: 77 }, // Sone, ~3,873 m³/s
};

export const FLOW_DISABLED: Record<string, string> = {
  station_basistha_ashram: "stream too small for the 5 km model grid",
  station_baya_saraiya: "too small for the model grid; nearest channel is the Gandak",
  station_beki_roadbridge: "can't be told apart from the Manas in the model grid",
  station_bharalu_bharalumukh: "urban stream too small for the 5 km model grid",
  station_burhigandak_sikrahana: "too small for the model grid",
  station_champamati_chapar: "nearest strong channel is the Brahmaputra",
  station_chandan_bhagalpur: "nearest strong channel is the Ganga",
  station_chiri_lakhipur: "too small for the model grid; nearest channel is the Barak",
  station_dardha_dhanarua: "too small for the model grid",
  station_digaru_sonapur: "too small for the model grid",
  station_gadadhar_gauripur: "can't be told apart from the Brahmaputra and Sankosh",
  station_gadadhar_golakganj: "can't be told apart from the Brahmaputra and Sankosh",
  station_gerua_sanokhar: "too small for the model grid",
  station_ghaghra_doriganj: "no model cell within 10 km carries a Ghaghra-sized flow",
  station_jiri_jirighat: "too small for the model grid; nearest channel is the Barak",
  station_karikosi_katihar: "nearest strong channel is the Ganga",
  station_katakhal_matijuri: "too small for the model grid",
  station_kosi_barari_katihar: "no model cell within 10 km carries a Kosi-sized flow",
  station_lakhandei_muzaffarpur: "can't be told apart from the Bagmati and Burhi Gandak",
  station_madhura_cachar: "too small for the model grid; nearest channel is the Barak",
  station_manas_crossing: "model cell ambiguous at the Manas–Beki split",
  station_manor_chanpatia: "too small for the model grid",
  station_puthimari_crossing: "nearest strong channel is the Brahmaputra",
  station_rukni_dholai: "too small for the model grid",
  station_sessa_mancotta: "too small for the model grid; nearest channel is the Brahmaputra",
  station_sonai_bazar: "too small for the model grid; nearest channel is the Barak",
  station_sonkosh_sapatgram: "model cell ambiguous near the Brahmaputra",
  station_sudhani_barsoi: "nearest strong channel is the Mahananda",
  station_tipkai_bilasipara: "nearest strong channel is the Brahmaputra",
};
