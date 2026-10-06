#!/bin/bash
cat << 'DATA_EOF' > /src/data.ts
import { Guide, Place, FeedItem, Category, Colonia, Visit } from './types';

export const categories: Category[] = [
  { id: 'c1', name: 'Hoteles', visits: 0, gradient: 'bg-gradient-to-br from-blue-500 to-blue-700', emoji: '🏨' },
  { id: 'c2', name: 'Restaurantes', visits: 0, gradient: 'bg-gradient-to-br from-orange-400 to-red-500', emoji: '🍽️' },
  { id: 'c3', name: 'Supermercados', visits: 0, gradient: 'bg-gradient-to-br from-green-500 to-emerald-700', emoji: '🛒' },
  { id: 'c4', name: 'Bancos', visits: 0, gradient: 'bg-gradient-to-br from-indigo-500 to-purple-600', emoji: '🏦' },
];

export const allColonias: Colonia[] = [
  { id: '1', name: 'Nochistlán Centro', type: 'Colonia', cp: '99900', visits: 145, image: 'https://foodandpleasure.com/wp-content/uploads/2025/05/nochistlan-pueblo-magica-de-zacatecas5-2.jpg' },
  { id: '2', name: 'Santo Santiago', type: 'Barrio', cp: '99902', visits: 89, image: 'https://images.unsplash.com/photo-1580228498967-08f2a13ccad6?auto=format&fit=crop&w=400&q=80' },
  { id: '3', name: 'La Gloria', type: 'Fraccionamiento', cp: '99902', visits: 64, image: 'https://images.unsplash.com/photo-1579768297746-b6ce6948ca24?auto=format&fit=crop&w=400&q=80' },
];

export const colonias: Colonia[] = allColonias;

export const visits: Visit[] = [];

export const mockPlaces: Place[] = [
  {
    id: 'h1', name: 'Hotel Nochistlán', category: 'Hoteles', subtitle: 'Hotel • Centro', location: 'Centro, Nochistlán', address: 'Lic. José Minero Roque Pte. 56, Centro, 99900 Nochistlán de Mejía, Zac.', mapUrl: 'https://maps.google.com/?cid=7411780661619817323', images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'], logo: 'https://ui-avatars.com/api/?name=HN&background=0D8ABC&color=fff', rating: 4.5, reviewCount: 120, isOpen: true, cost: 2, distance: '0.2 km', goodToKnow: ['Ubicado en avenida principal', 'Fácil acceso'], hours: 'Abierto las 24 horas, todos los días'
  },
  {
    id: 'h2', name: 'La Bóveda Hotel', category: 'Hoteles', subtitle: 'Hotel • Centro', location: 'Centro, Nochistlán', address: 'Victoria 26, Centro, 99900 Nochistlán de Mejía, Zac.', mapUrl: 'https://maps.google.com/?cid=7667597087246000221', images: ['https://images.unsplash.com/photo-1551882547-ff40c0d5b9af?auto=format&fit=crop&w=800&q=80'], logo: 'https://ui-avatars.com/api/?name=LB&background=1D4ED8&color=fff', rating: 4.5, reviewCount: 95, isOpen: true, cost: 2, distance: '0.3 km', goodToKnow: ['Cerca de plaza principal', 'Arquitectura tradicional'], hours: 'Check-in estándar'
  },
  {
    id: 'h3', name: 'Dos Patios Hotel', category: 'Hoteles', subtitle: 'Hotel • Centro', location: 'Centro, Nochistlán', address: '5 de May. 1, Centro, 99900 Nochistlán de Mejía, Zac.', mapUrl: 'https://maps.google.com/?cid=10398884025939266258', images: ['https://images.unsplash.com/photo-1535827841776-24afc1e255ac?auto=format&fit=crop&w=800&q=80'], logo: 'https://ui-avatars.com/api/?name=DP&background=F59E0B&color=fff', rating: 4.9, reviewCount: 200, isOpen: true, cost: 3, distance: '0.4 km', goodToKnow: ['Estilo boutique', 'Patios interiores'], hours: 'Check-in estándar'
  },
  {
    id: 'h4', name: 'Hotel Nueva Galicia', category: 'Hoteles', subtitle: 'Hotel • Centro', location: 'Centro, Nochistlán', address: 'Cadena 31, Centro, 99900 Nochistlán de Mejía, Zac.', mapUrl: 'https://maps.google.com/?cid=6929784181311690256', images: ['https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80'], logo: 'https://ui-avatars.com/api/?name=NG&background=4B5563&color=fff', rating: 3.9, reviewCount: 75, isOpen: true, cost: 1, distance: '0.5 km', goodToKnow: ['Alojamiento céntrico', 'Tranquilidad local'], hours: 'Horario de recepción variable'
  },
  {
    id: 'h5', name: 'Hotel Villa Caxcana', category: 'Hoteles', subtitle: 'Hotel • Centro', location: 'Centro, Nochistlán', address: 'Corona 14, Centro, 99900 Nochistlán de Mejía, Zacatecas.', mapUrl: 'https://maps.google.com/?cid=2911336021501012898', images: ['https://images.unsplash.com/photo-1542314831-c6a4d14b8ba0?auto=format&fit=crop&w=800&q=80'], logo: 'https://ui-avatars.com/api/?name=VC&background=10B981&color=fff', rating: 3.9, reviewCount: 40, isOpen: true, cost: 1, distance: '0.6 km', goodToKnow: ['Comodidades básicas'], hours: 'Horario de recepción variable'
  },
  {
    id: 'r1', name: 'Restaurante la Palma', category: 'Restaurantes', subtitle: 'Mexican restaurant • Centro', location: 'Centro, Nochistlán', address: 'Ramón López Velarde 80, Centro, 99900 Nochistlán de Mejía, Zac.', mapUrl: 'https://maps.google.com/?cid=9383067641849104560', images: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80'], logo: 'https://ui-avatars.com/api/?name=LP&background=EF4444&color=fff', rating: 4.3, reviewCount: 312, isOpen: true, cost: 2, distance: '0.2 km', goodToKnow: ['Platillos tradicionales', 'Ambiente familiar'], hours: '9:00 AM – 6:30 PM'
  },
  {
    id: 's1', name: 'Mi Bodega Aurrera', category: 'Supermercados', subtitle: 'Grocery store • Centro', location: 'Centro, Nochistlán', address: '5 de May. 51, Centro, 99900 Nochistlán de Mejía, Zac.', mapUrl: 'https://maps.google.com/?cid=2444323105749118955', images: ['https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80'], logo: 'https://ui-avatars.com/api/?name=MB&background=10B981&color=fff', rating: 4.0, reviewCount: 450, isOpen: true, cost: 1, distance: '0.4 km', goodToKnow: ['Artículos para el hogar'], hours: '8:00 AM – 10:00 PM'
  },
  {
    id: 's2', name: 'Mercado Municipal Nochistlán', category: 'Supermercados', subtitle: 'Market • Centro', location: 'Centro, Nochistlán', address: 'Esperanza Quezada 3, Centro, 99900 Nochistlán de Mejía, Zac.', mapUrl: 'https://maps.google.com/?cid=12327638040975572868', images: ['https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=800&q=80'], logo: 'https://ui-avatars.com/api/?name=MM&background=F59E0B&color=fff', rating: 4.5, reviewCount: 680, isOpen: true, cost: 1, distance: '0.1 km', goodToKnow: ['Productos frescos', 'Carne'], hours: '6:00 AM – 5:00 PM'
  },
  {
    id: 's3', name: 'Farmacia Guadalajara', category: 'Supermercados', subtitle: 'Pharmacy • Centro', location: 'Centro, Nochistlán', address: 'Lic. José Minero Roque Pte. 2 F, Centro, 99900 Nochistlán de Mejía, Zac.', mapUrl: 'https://maps.google.com/?cid=5163812482290857820', images: ['https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=800&q=80'], logo: 'https://ui-avatars.com/api/?name=FG&background=10B981&color=fff', rating: 4.5, reviewCount: 150, isOpen: true, cost: 2, distance: '0.2 km', goodToKnow: ['Medicamentos', 'Cuidado personal'], hours: 'Horario extendido'
  },
  {
    id: 'b1', name: 'Banco BBVA', category: 'Bancos', subtitle: 'Bank • Centro', location: 'Centro, Nochistlán', address: 'José, Minero Roque 12-E, Centro, 99900 Nochistlán de Mejía, Zac.', mapUrl: 'https://maps.google.com/?cid=12543632790682077710', images: ['https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?auto=format&fit=crop&w=800&q=80'], logo: 'https://ui-avatars.com/api/?name=BBVA&background=1E3A8A&color=fff', rating: 3.9, reviewCount: 210, isOpen: true, cost: 1, distance: '0.3 km', goodToKnow: ['Cajeros automáticos', 'Banca comercial'], hours: '8:30 AM – 4:00 PM (L-V)'
  },
  {
    id: 'b2', name: 'BANORTE SUCURSAL NOCHISTLAN 870', category: 'Bancos', subtitle: 'Bank • Centro', location: 'Centro, Nochistlán', address: 'Josefa Ortiz de Domínguez 6, Centro, 99900 Nochistlán de Mejía, Zac.', mapUrl: 'https://maps.google.com/?cid=17158989067584640721', images: ['https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=800&q=80'], logo: 'https://ui-avatars.com/api/?name=BN&background=EF4444&color=fff', rating: 3.5, reviewCount: 85, isOpen: true, cost: 1, distance: '0.2 km', goodToKnow: ['Servicios financieros completos'], hours: '8:30 AM – 4:00 PM (L-V)'
  },
  {
    id: 'b3', name: 'Grupo Financiero Banorte Corresponsal', category: 'Bancos', subtitle: 'Bank • Centro', location: 'Centro, Nochistlán', address: 'Josefa Ortiz de Domínguez 61, Centro, 99900 Nochistlán de Mejía, Zac.', mapUrl: 'https://maps.google.com/?cid=7986229584042473539', images: ['https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80'], logo: 'https://ui-avatars.com/api/?name=BC&background=EF4444&color=fff', rating: 1.0, reviewCount: 5, isOpen: true, cost: 1, distance: '0.2 km', goodToKnow: ['Transacciones adicionales'], hours: 'Horarios comerciales estándar'
  },
  {
    id: 'b4', name: 'Cajero Banorte', category: 'Bancos', subtitle: 'ATM • Centro', location: 'Centro, Nochistlán', address: 'Josefa Ortiz de Domínguez 6, Centro, 99900 Nochistlán de Mejía, Zac.', mapUrl: 'https://maps.google.com/?cid=14660568937313982951', images: ['https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?auto=format&fit=crop&w=800&q=80'], logo: 'https://ui-avatars.com/api/?name=ATM&background=4B5563&color=fff', rating: 3.4, reviewCount: 12, isOpen: true, cost: 1, distance: '0.2 km', goodToKnow: ['Retiros rápidos'], hours: '8:30 AM – 4:00 PM (L-V)'
  },
];

export const mockGuides: Guide[] = [];
export const feedData: FeedItem[] = [];
DATA_EOF
bash update_data.sh
rm update_data.sh