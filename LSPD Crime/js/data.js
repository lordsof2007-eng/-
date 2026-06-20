const FranklinMorgenCATS = {
  fleeca:  { label:'بنك فليكا',      icon:'bank',  color:'var(--fleeca)'  },
  jewelry: { label:'مجوهرات',         icon:'gem',   color:'var(--jewelry)' },
  store:   { label:'متاجر وبقالات',   icon:'store', color:'var(--store)'   },
  house:   { label:'بيوت',            icon:'home',  color:'var(--house)'   },
  atm:     { label:'صرافات ATM',      icon:'atm',   color:'var(--atm)'     },
  other:   { label:'أخرى',            icon:'pin',   color:'var(--other)'   }
};
const CAT_KEYS = Object.keys(FranklinMorgenCATS);

const ZONES = [
  { name:'وسط المدينة',      x:30, y:18, w:30, h:24 },
  { name:'الضواحي',          x:6,  y:50, w:26, h:30 },
  { name:'المنطقة الصناعية', x:64, y:48, w:30, h:28 },
  { name:'الساحل',           x:8,  y:10, w:20, h:18 },
  { name:'المرتفعات',        x:62, y:8,  w:26, h:24 }
];

const DEFAULT_BG_SRC = 'assets/map-default.jpg';
const DEFAULT_BG_W = 973;
const DEFAULT_BG_H = 1107;

const state = {
  locations: [],
  activeFilters: new Set(CAT_KEYS),
  search: '',
  dateFilter: 'all',
  editingId: null,
  pendingPos: null,
  lastDeleted: null,
  storageOk: true,
  placingMode: false,
  pinsHidden: false
};

function uid(){ return 'loc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7); }
