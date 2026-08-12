export const WHATSAPP_NUMBER = '5500000000000'; // Altere para o número real

// Endereço e coordenadas da loja (altere para o endereço real da sua loja)
export const STORE_ADDRESS = 'Av. Paulista, 1000, São Paulo, SP';
export const STORE_COORDS = [-23.5505, -46.6333]; // [lat, lon]

export const CATEGORIES = [
  { value: 'cervejas', label: 'Cervejas', icon: '🍺' },
  { value: 'refrigerantes', label: 'Refrigerantes', icon: '🥤' },
  { value: 'energeticos', label: 'Energéticos', icon: '⚡' },
  { value: 'aguas', label: 'Águas', icon: '💧' },
  { value: 'destilados', label: 'Destilados', icon: '🥃' },
  { value: 'vinhos', label: 'Vinhos', icon: '🍷' },
  { value: 'sucos', label: 'Sucos', icon: '🧃' },
  { value: 'gelo', label: 'Gelo', icon: '🧊' },
];

export const formatPrice = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};