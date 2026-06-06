import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  AlertTriangle,
  Battery,
  BatteryCharging,
  Bot,
  Camera,
  Car,
  Circle,
  Clock3,
  Command,
  Cpu,
  Download,
  ExternalLink,
  FileText,
  Gauge,
  Image,
  KeyRound,
  Layers,
  Link2,
  LocateFixed,
  Lock,
  LogOut,
  MapPinned,
  Monitor,
  Navigation,
  Power,
  RefreshCw,
  Route,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  Thermometer,
  TimerReset,
  Unlock,
  UserRound,
  Video,
  Wifi,
  WifiOff,
  Zap
} from 'lucide-react';
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import './styles.css';

const API_TIMEOUT_MS = 18000;
const DEFAULT_CENTER = [-20.812249, -49.375975];
const DEFAULT_POLLING_MS = 30000;
const APP_BASE_URL = import.meta.env.BASE_URL || '/';
const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

function assetUrl(path) {
  const base = APP_BASE_URL.endsWith('/') ? APP_BASE_URL : `${APP_BASE_URL}/`;
  return `${base}${String(path || '').replace(/^\/+/, '')}`;
}

function buildApiUrl(path) {
  const raw = String(path || '');
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${API_BASE_URL}${raw}`;
}

const CARS_V2_MAP_ICON_PATH = assetUrl('/vehicle-icons/carsv2-map');

const ICONS = {
  motorcycle: [`${CARS_V2_MAP_ICON_PATH}/motorcycle_base.png`, assetUrl('/vehicle-icons/topview/motorcycle.png')],
  scooter: [`${CARS_V2_MAP_ICON_PATH}/scooter_base.png`, assetUrl('/vehicle-icons/topview/motorcycle.png')],
  car: [`${CARS_V2_MAP_ICON_PATH}/carroPasseio_base.png`, assetUrl('/vehicle-icons/topview/car.png')],
  utility: [`${CARS_V2_MAP_ICON_PATH}/carroUtilitario_base.png`, assetUrl('/vehicle-icons/topview/van.png')],
  truck: [`${CARS_V2_MAP_ICON_PATH}/truckBau_base.png`, `${CARS_V2_MAP_ICON_PATH}/caminhaoBau_base.png`, assetUrl('/vehicle-icons/topview/truck.png')],
  truckHorse: [`${CARS_V2_MAP_ICON_PATH}/truckCavalo_base.png`, assetUrl('/vehicle-icons/topview/truck.png')],
  caminhao: [`${CARS_V2_MAP_ICON_PATH}/caminhaoBau_base.png`, assetUrl('/vehicle-icons/topview/truck.png')],
  bus: [`${CARS_V2_MAP_ICON_PATH}/bus_base.png`, assetUrl('/vehicle-icons/topview/bus.png')],
  van: [`${CARS_V2_MAP_ICON_PATH}/vanUtilitario_base.png`, assetUrl('/vehicle-icons/topview/van.png')],
  pickup: [`${CARS_V2_MAP_ICON_PATH}/carroUtilitario_base.png`, `${CARS_V2_MAP_ICON_PATH}/offroad_base.png`, assetUrl('/vehicle-icons/topview/pickup.png')],
  tractor: [`${CARS_V2_MAP_ICON_PATH}/tractor_base.png`, assetUrl('/vehicle-icons/topview/tractor.png')],
  bicycle: [`${CARS_V2_MAP_ICON_PATH}/bicycle_base.png`, assetUrl('/vehicle-icons/topview/default.png')],
  person: [`${CARS_V2_MAP_ICON_PATH}/person_base.png`, assetUrl('/vehicle-icons/topview/default.png')],
  animal: [`${CARS_V2_MAP_ICON_PATH}/pet_base.png`, assetUrl('/vehicle-icons/topview/default.png')],
  boat: [`${CARS_V2_MAP_ICON_PATH}/boat_base.png`, assetUrl('/vehicle-icons/topview/default.png')],
  ship: [`${CARS_V2_MAP_ICON_PATH}/ship_base.png`, assetUrl('/vehicle-icons/topview/default.png')],
  airplane: [`${CARS_V2_MAP_ICON_PATH}/plane_base.png`, assetUrl('/vehicle-icons/topview/default.png')],
  helicopter: [`${CARS_V2_MAP_ICON_PATH}/helicopter_base.png`, assetUrl('/vehicle-icons/topview/default.png')],
  crane: [`${CARS_V2_MAP_ICON_PATH}/crane_base.png`, assetUrl('/vehicle-icons/topview/default.png')],
  offroad: [`${CARS_V2_MAP_ICON_PATH}/offroad_base.png`, assetUrl('/vehicle-icons/topview/default.png')],
  default: [`${CARS_V2_MAP_ICON_PATH}/default_base.png`, assetUrl('/vehicle-icons/topview/default.png')]
};

const MAP_LAYERS = {
  osm: {
    label: 'OpenStreetMap',
    description: 'Mapa aberto de ruas',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap'
  },
  googleRoad: {
    label: 'Google Ruas',
    description: 'Google estradas',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google'
  },
  googleHybrid: {
    label: 'Google Híbrido',
    description: 'Satélite com ruas',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google'
  },
  googleSatellite: {
    label: 'Google Satélite',
    description: 'Satélite',
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; Google'
  },
  esriSatellite: {
    label: 'Esri Satélite',
    description: 'Satélite alternativo',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri'
  },
  cartoDark: {
    label: 'Escuro',
    description: 'Operacional escuro',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  }
};

const tabs = [
  ['dashboard', 'Dashboard', Activity],
  ['monitoramento', 'Monitoramento', Camera],
  ['assistente', 'Assistente IA', Bot],
  ['veiculos', 'Veículos', Car],
  ['eventos', 'Alertas', AlertTriangle],
  ['relatorios', 'Relatórios', Route],
  ['comandos', 'Comandos', Command],
  ['atributos', 'Atributos', Cpu],
  ['integracoes', 'Integracoes', Zap],
  ['usuario', 'Usuario', UserRound],
  ['config', 'Config', Settings]
];

function normalizeText(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || API_TIMEOUT_MS);
  try {
    const response = await fetch(buildApiUrl(path), {
      ...options,
      signal: controller.signal,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; }
    catch { payload = { raw: text }; }
    if (!response.ok) {
      const error = new Error(payload?.error || payload?.message || payload?.raw || `HTTP ${response.status}`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Tempo esgotado ao conectar com o servidor.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function registerMobileAppWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(assetUrl('/sw.js')).catch((error) => {
      console.warn('[pwa] Service worker nao registrado:', error?.message || error);
    });
  }, { once: true });
}

if (typeof window !== 'undefined') registerMobileAppWorker();

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('traccar-dev-theme') || 'dark');
  useEffect(() => {
    localStorage.setItem('traccar-dev-theme', theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty('--login-bg-desktop', `url("${assetUrl('/brand/login-bg-city-desktop.jpg')}")`);
    document.documentElement.style.setProperty('--login-bg-mobile', `url("${assetUrl('/brand/login-bg-city-mobile.jpg')}")`);
  }, [theme]);
  return { theme, setTheme };
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

const BLOCK_COMMAND_ALIASES = [
  'engineStop', 'engineLock', 'engineDisable', 'engineImmobilize',
  'bloqueio', 'bloquear', 'block', 'lock', 'relayOff', 'fuelCut', 'fuelCutOff', 'immobilize'
];

const UNBLOCK_COMMAND_ALIASES = [
  'engineResume', 'engineUnlock', 'engineEnable', 'engineMobilize',
  'desbloqueio', 'desbloquear', 'unblock', 'unlock', 'relayOn', 'fuelCutOn', 'mobilize'
];

function commandTypeValue(item = {}) {
  if (typeof item === 'string') return item;
  return String(item.type || item.name || item.command || '').trim();
}

function findBlockCommandType(types = [], blocked = false) {
  const candidates = (blocked ? UNBLOCK_COMMAND_ALIASES : BLOCK_COMMAND_ALIASES).map(normalizeText);
  const available = normalizeArray(types)
    .map((item) => {
      const raw = commandTypeValue(item);
      return raw ? { raw, normalized: normalizeText(raw) } : null;
    })
    .filter(Boolean);

  for (const candidate of candidates) {
    const exact = available.find((item) => item.normalized === candidate);
    if (exact) return exact.raw;
  }

  for (const candidate of candidates) {
    const partial = available.find((item) => item.normalized.includes(candidate));
    if (partial) return partial.raw;
  }

  return '';
}

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function knotsToKmh(value) {
  const n = numberOrNull(value);
  return n === null ? 0 : n * 1.852;
}

function kmh(value) {
  return Math.round(knotsToKmh(value));
}

function formatSpeed(value) {
  return `${kmh(value)} km/h`;
}

function formatKmh(value) {
  return formatSpeed(value);
}

function formatDistance(value) {
  const n = numberOrNull(value);
  if (n === null) return '-';
  if (n >= 1000) return `${(n / 1000).toFixed(1)} km`;
  return `${Math.round(n)} m`;
}

function formatBattery(value) {
  const n = numberOrNull(value);
  if (n === null) return '-';
  return `${Math.round(n)}%`;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
}

function formatTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function timeAgo(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s atrás`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}

function statusLabel(status) {
  const s = String(status || 'unknown').toLowerCase();
  if (s === 'online') return 'Online';
  if (s === 'offline') return 'Offline';
  return 'Indefinido';
}

function statusClass(status) {
  const s = String(status || 'unknown').toLowerCase();
  if (s === 'online') return 'good';
  if (s === 'offline') return 'bad';
  return 'warn';
}

function ignitionLabel(value) {
  if (value === true || value === 'true' || value === 1 || value === '1') return 'Ligada';
  if (value === false || value === 'false' || value === 0 || value === '0') return 'Desligada';
  return '-';
}

function yesNo(value) {
  if (value === true || value === 'true' || value === 1 || value === '1') return 'Sim';
  if (value === false || value === 'false' || value === 0 || value === '0') return 'Não';
  return '-';
}

function getPositionAttributes(position = {}) {
  return position?.attributes && typeof position.attributes === 'object' ? position.attributes : {};
}

function getDeviceAttributes(device = {}) {
  return device?.attributes && typeof device.attributes === 'object' ? device.attributes : {};
}

function getAttr(source = {}, names = [], fallback = undefined) {
  const direct = source && typeof source === 'object' ? source : {};
  const attrs = direct.attributes && typeof direct.attributes === 'object' ? direct.attributes : direct;
  for (const name of names) {
    if (attrs[name] !== undefined && attrs[name] !== null && attrs[name] !== '') return attrs[name];
  }
  return fallback;
}

function booleanValue(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  const raw = normalizeText(value);
  if (['true', '1', 'yes', 'sim', 'on', 'ligado', 'ligada', 'active', 'ativo', 'ativa'].includes(raw)) return true;
  if (['false', '0', 'no', 'nao', 'não', 'off', 'desligado', 'desligada', 'inactive', 'inativo', 'inativa'].includes(raw)) return false;
  return null;
}

function telemetryAttr(device = {}, position = {}, names = [], fallback = null) {
  const pos = position && typeof position === 'object' ? position : {};
  const dev = device && typeof device === 'object' ? device : {};
  const posAttrs = getPositionAttributes(pos);
  const devAttrs = getDeviceAttributes(dev);

  for (const name of names) {
    if (pos[name] !== undefined && pos[name] !== null && pos[name] !== '') return pos[name];
    if (posAttrs[name] !== undefined && posAttrs[name] !== null && posAttrs[name] !== '') return posAttrs[name];
    if (dev[name] !== undefined && dev[name] !== null && dev[name] !== '') return dev[name];
    if (devAttrs[name] !== undefined && devAttrs[name] !== null && devAttrs[name] !== '') return devAttrs[name];
  }

  return fallback;
}

function isIgnitionOn(device = {}, position = {}) {
  return booleanValue(telemetryAttr(device, position, ['ignition', 'ignicao', 'ignição', 'engine', 'engineOn', 'acc', 'ACC', 'io239'], false)) === true;
}

function isBlocked(device = {}, position = {}) {
  return booleanValue(telemetryAttr(device, position, ['blocked', 'bloqueado', 'block', 'locked', 'lock', 'engineBlocked', 'fuelCut', 'relay', 'io240'], false)) === true;
}

function isMoving(device = {}, position = {}) {
  const motion = booleanValue(telemetryAttr(device, position, ['motion', 'moving', 'move'], null));
  if (motion === true) return true;
  const speed = kmh(position?.speed);
  return speed >= 3;
}

function lastPositionDate(position = {}) {
  const raw = position?.deviceTime || position?.fixTime || position?.serverTime || position?.time;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function minutesSincePosition(position = {}) {
  const date = lastPositionDate(position);
  if (!date) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
}

function movementState(device = {}, position = {}) {
  if (!position || typeof position !== 'object') return 'no-position';
  if (isMoving(device, position)) return 'moving';
  const idleMinutes = minutesSincePosition(position);
  if (isIgnitionOn(device, position) && idleMinutes !== null && idleMinutes >= 3) return 'idle';
  return 'stopped';
}

function movementLabel(state) {
  if (state === 'moving') return 'Em movimento';
  if (state === 'idle') return 'Ocioso';
  if (state === 'stopped') return 'Parado';
  return 'Sem posição';
}

function movementTone(state) {
  if (state === 'moving') return 'good';
  if (state === 'idle') return 'info';
  if (state === 'stopped') return 'bad';
  return 'warn';
}

function formatVoltage(value) {
  const n = numberOrNull(value);
  if (n === null) return '-';
  const volts = n > 1000 ? n / 1000 : n;
  return `${volts.toFixed(volts >= 10 ? 1 : 2)} V`;
}

function batteryPercent(device = {}, position = {}) {
  return telemetryAttr(device, position, ['batteryLevel', 'battery', 'batteryPercent', 'batteryPercentage', 'power'], null);
}

function vehicleVoltage(device = {}, position = {}) {
  return telemetryAttr(device, position, ['power', 'externalPower', 'voltage', 'vehicleVoltage', 'batteryVoltage', 'inputVoltage', 'io66', 'io67'], null);
}

const TELEMETRY_FIELD_GROUPS = [
  {
    key: 'can',
    label: 'Rede CAN',
    icon: Cpu,
    fields: [
      ['rpm', 'RPM', ['rpm', 'engineRpm', 'canRpm', 'obdRpm', 'io85']],
      ['fuel', 'Combustivel', ['fuel', 'fuelLevel', 'canFuel', 'obdFuel', 'io89'], (value) => `${value}%`],
      ['odometer', 'Hodometro', ['odometer', 'totalDistance', 'canOdometer', 'obdOdometer'], formatDistance],
      ['engineLoad', 'Carga motor', ['engineLoad', 'canEngineLoad', 'obdEngineLoad'], (value) => `${value}%`],
      ['coolant', 'Temp. motor', ['coolantTemp', 'engineTemp', 'canEngineTemp', 'obdCoolantTemp'], (value) => `${value} C`],
      ['fuelUsed', 'Consumo', ['fuelUsed', 'fuelConsumption', 'canFuelUsed', 'obdFuelUsed']]
    ]
  },
  {
    key: 'temperature',
    label: 'Temperatura',
    icon: Thermometer,
    fields: [
      ['temperature', 'Temperatura', ['temperature', 'temp', 'sensorTemperature', 'io72'], (value) => `${value} C`],
      ['temperature1', 'Temp. 1', ['temperature1', 'temp1', 'io73'], (value) => `${value} C`],
      ['temperature2', 'Temp. 2', ['temperature2', 'temp2', 'io74'], (value) => `${value} C`],
      ['humidity', 'Umidade', ['humidity', 'hum'], (value) => `${value}%`]
    ]
  },
  {
    key: 'driver',
    label: 'Motorista',
    icon: UserRound,
    fields: [
      ['driver', 'Motorista', ['driverName', 'driver', 'driverUniqueId', 'driverId', 'rfid', 'ibutton']],
      ['driverPhone', 'Telefone', ['driverPhone', 'phone']],
      ['driverCard', 'Cartao', ['driverCard', 'card', 'ibutton']]
    ]
  },
  {
    key: 'power',
    label: 'Energia e IO',
    icon: BatteryCharging,
    fields: [
      ['ignition', 'Ignicao', ['ignition', 'ignicao', 'engine', 'acc', 'io239'], ignitionLabel],
      ['blocked', 'Bloqueio', ['blocked', 'bloqueado', 'engineBlocked', 'relay', 'io240'], yesNo],
      ['battery', 'Bateria', ['batteryLevel', 'battery', 'batteryPercent'], formatBattery],
      ['voltage', 'Tensao', ['power', 'externalPower', 'voltage', 'vehicleVoltage', 'batteryVoltage', 'inputVoltage'], formatVoltage],
      ['motion', 'Movimento', ['motion', 'moving'], yesNo]
    ]
  }
];

function formatTelemetryValue(value, formatter = null) {
  if (value === undefined || value === null || value === '') return '';
  if (formatter) return formatter(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function collectTelemetryGroups(device = {}, position = {}) {
  return TELEMETRY_FIELD_GROUPS
    .map((group) => {
      const values = group.fields
        .map(([key, label, names, formatter]) => {
          const raw = telemetryAttr(device, position, names, null);
          const value = formatTelemetryValue(raw, formatter);
          return value ? { key, label, value, raw } : null;
        })
        .filter(Boolean);
      return values.length ? { ...group, values } : null;
    })
    .filter(Boolean);
}

function firstTelemetryValue(device = {}, position = {}, groupKey) {
  const group = collectTelemetryGroups(device, position).find((item) => item.key === groupKey);
  return group?.values?.[0]?.value || '';
}

function safeCourse(value) {
  const n = numberOrNull(value);
  if (n === null) return 0;
  return Math.round(((n % 360) + 360) % 360);
}

function getVehicleName(device = {}) {
  return String(device.name || device.uniqueId || `Veículo ${device.id || ''}`).trim();
}

function getVehiclePlate(device = {}) {
  const attrs = getDeviceAttributes(device);
  return String(attrs.plate || attrs.placa || attrs.licensePlate || attrs.registration || '').trim();
}

function getVehicleUniqueId(device = {}) {
  return String(device.uniqueId || device.uniqueid || device.identifier || '').trim();
}

function detectVehicleCategory(device = {}, position = {}) {
  const attrs = { ...getDeviceAttributes(device), ...getPositionAttributes(position) };
  const raw = normalizeText([
    device.category,
    attrs.category,
    attrs.vehicleType,
    attrs.tipo,
    attrs.type,
    attrs.model,
    device.name
  ].filter(Boolean).join(' '));

  if (/moto|motorcycle|motocicleta/.test(raw)) return 'motorcycle';
  if (/scooter/.test(raw)) return 'scooter';
  if (/cavalo|carreta|truckhorse|truck horse/.test(raw)) return 'truckHorse';
  if (/caminhao|caminhão|truck|bau|baú/.test(raw)) return 'truck';
  if (/onibus|ônibus|bus/.test(raw)) return 'bus';
  if (/van|utilitario|utilitário|furgao|furgão/.test(raw)) return 'van';
  if (/pickup|pick-up|hilux|s10|ranger|amarok|frontier/.test(raw)) return 'pickup';
  if (/trator|tractor/.test(raw)) return 'tractor';
  if (/bike|bicycle|bicicleta/.test(raw)) return 'bicycle';
  if (/pessoa|person|humano/.test(raw)) return 'person';
  if (/pet|animal|cachorro|gato/.test(raw)) return 'animal';
  if (/barco|boat/.test(raw)) return 'boat';
  if (/navio|ship/.test(raw)) return 'ship';
  if (/aviao|avião|plane|airplane/.test(raw)) return 'airplane';
  if (/helicoptero|helicóptero|helicopter/.test(raw)) return 'helicopter';
  if (/guindaste|crane/.test(raw)) return 'crane';
  if (/offroad|off-road|quadriciclo/.test(raw)) return 'offroad';
  if (/util/.test(raw)) return 'utility';
  return 'car';
}

function vehicleMapLabel(category) {
  const labels = {
    motorcycle: 'Moto', scooter: 'Scooter', car: 'Carro', utility: 'Utilitário',
    truck: 'Caminhão', truckHorse: 'Cavalo mecânico', caminhao: 'Caminhão', bus: 'Ônibus',
    van: 'Van', pickup: 'Pickup', tractor: 'Trator', bicycle: 'Bicicleta', person: 'Pessoa',
    animal: 'Pet', boat: 'Barco', ship: 'Navio', airplane: 'Avião', helicopter: 'Helicóptero',
    crane: 'Guindaste', offroad: 'Off-road', default: 'Veículo'
  };
  return labels[category] || labels.default;
}

function vehicleLabel(category) {
  return vehicleMapLabel(category);
}

function vehicleImage(categoryOrDevice, position = {}) {
  const category = typeof categoryOrDevice === 'string' ? categoryOrDevice : detectVehicleCategory(categoryOrDevice, position);
  return ICONS[category]?.[0] || ICONS.default[0];
}

function getVehicleImage(device = {}, position = {}) {
  return vehicleImage(detectVehicleCategory(device, position));
}

function hasVehicleImage(device = {}, position = {}) {
  return Boolean(getVehicleImage(device, position));
}

function getVehiclePhoto(device = {}, position = {}) {
  const attrs = getDeviceAttributes(device);
  return attrs.photo || attrs.image || attrs.icon || getVehicleImage(device, position);
}

function isValidPosition(position = {}) {
  if (!position || typeof position !== 'object') return false;

  const lat = numberOrNull(position.latitude);
  const lon = numberOrNull(position.longitude);

  if (lat === null || lon === null) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;

  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function getLatLng(position = {}) {
  if (!isValidPosition(position)) return null;
  return [Number(position.latitude), Number(position.longitude)];
}

function getDevicePosition(device = {}, positions = []) {
  const positionId = numberOrNull(device.positionId);
  if (positionId !== null) {
    const byId = positions.find((position) => Number(position.id) === positionId);
    if (byId) return byId;
  }
  return positions.find((position) => Number(position.deviceId) === Number(device.id)) || null;
}

function eventTime(event = {}) {
  return event.eventTime || event.serverTime || event.deviceTime || event.fixTime || event.time || null;
}

function eventDeviceId(event = {}) {
  return Number(event.deviceId || event.deviceID || 0);
}

function alertText(event = {}, position = {}) {
  const attrs = event?.attributes && typeof event.attributes === 'object' ? event.attributes : {};
  const type = String(event?.type || getAttr(position, ['alarm', 'event'], '') || '').trim();
  const alarm = attrs.alarm || getAttr(position, ['alarm'], '');
  const map = {
    alarm: `Alarme${alarm ? `: ${alarm}` : ''}`,
    deviceOnline: 'Dispositivo online',
    deviceOffline: 'Dispositivo offline',
    deviceUnknown: 'Dispositivo sem comunicação',
    geofenceEnter: 'Entrada em cerca',
    geofenceExit: 'Saída de cerca',
    ignitionOn: 'Ignição ligada',
    ignitionOff: 'Ignição desligada',
    deviceMoving: 'Veículo em movimento',
    deviceStopped: 'Veículo parado',
    overspeed: 'Excesso de velocidade',
    commandResult: 'Resultado de comando',
    maintenance: 'Manutenção',
    textMessage: 'Mensagem'
  };
  return map[type] || (type ? type : 'Sem alerta');
}

function eventText(event = {}, position = {}) {
  return alertText(event, position);
}

function alertSeverity(event = {}) {
  const text = normalizeText(alertText(event));
  if (/offline|alarme|overspeed|velocidade|sos|panic|falha|violacao|violação/.test(text)) return 'bad';
  if (/unknown|sem comunicacao|sem comunicação|manutencao|manutenção/.test(text)) return 'warn';
  return 'good';
}

function alertClass(event = {}) {
  return alertSeverity(event);
}

function alertIcon(event = {}) {
  const severity = alertSeverity(event);
  if (severity === 'bad') return AlertTriangle;
  if (severity === 'warn') return ShieldCheck;
  return Activity;
}

function latestAlertForDevice(device = {}, events = []) {
  const did = Number(device.id);
  return normalizeArray(events)
    .filter((event) => eventDeviceId(event) === did)
    .sort((a, b) => new Date(eventTime(b) || 0) - new Date(eventTime(a) || 0))[0] || null;
}

function vehicleSvgBody(category) {
  const body = {
    motorcycle: `
      <path class="vehicle-svg-shadow" d="M22 38h26" />
      <path class="vehicle-svg-stroke" d="M25 39l7-11h9l6 11M31 28l4-8 6 8" />
      <circle class="vehicle-svg-wheel" cx="24" cy="42" r="5" />
      <circle class="vehicle-svg-wheel" cx="48" cy="42" r="5" />
      <path class="vehicle-svg-fill" d="M34 20h9l4 8h-17z" />
    `,
    truck: `
      <path class="vehicle-svg-fill" d="M18 24h30v26H18zM48 32h10l6 8v10H48z" />
      <path class="vehicle-svg-window" d="M51 35h6l3 5h-9z" />
      <circle class="vehicle-svg-wheel" cx="27" cy="52" r="4" />
      <circle class="vehicle-svg-wheel" cx="54" cy="52" r="4" />
    `,
    bus: `
      <rect class="vehicle-svg-fill" x="15" y="22" width="40" height="29" rx="7" />
      <path class="vehicle-svg-window" d="M20 27h30v10H20z" />
      <circle class="vehicle-svg-wheel" cx="25" cy="52" r="4" />
      <circle class="vehicle-svg-wheel" cx="47" cy="52" r="4" />
    `,
    van: `
      <path class="vehicle-svg-fill" d="M17 27h30l9 9v14H17z" />
      <path class="vehicle-svg-window" d="M23 31h20l6 6H23z" />
      <circle class="vehicle-svg-wheel" cx="27" cy="51" r="4" />
      <circle class="vehicle-svg-wheel" cx="48" cy="51" r="4" />
    `,
    pickup: `
      <path class="vehicle-svg-fill" d="M17 31h22l5-8h12v27H17z" />
      <path class="vehicle-svg-window" d="M42 27h9v9H37z" />
      <path class="vehicle-svg-bed" d="M19 34h17v10H19z" />
      <circle class="vehicle-svg-wheel" cx="27" cy="51" r="4" />
      <circle class="vehicle-svg-wheel" cx="50" cy="51" r="4" />
    `,
    tractor: `
      <circle class="vehicle-svg-wheel" cx="24" cy="46" r="9" />
      <circle class="vehicle-svg-wheel" cx="50" cy="48" r="5" />
      <path class="vehicle-svg-fill" d="M28 33h18l4 11H26zM35 22h10v11H35z" />
    `,
    person: `
      <circle class="vehicle-svg-fill" cx="35" cy="23" r="8" />
      <path class="vehicle-svg-stroke" d="M35 31v20M24 39h22M29 62l6-11 6 11" />
    `,
    animal: `
      <path class="vehicle-svg-fill" d="M23 39c0-9 7-15 16-15 8 0 15 5 15 13 0 10-8 17-17 17-8 0-14-6-14-15z" />
      <circle class="vehicle-svg-eye" cx="42" cy="35" r="2" />
      <path class="vehicle-svg-stroke" d="M27 27l-6-7M47 27l7-7M27 52l-5 8M47 52l5 8" />
    `,
    default: `
      <path class="vehicle-svg-fill" d="M20 29l8-10h14l8 10 5 21H15z" />
      <path class="vehicle-svg-window" d="M29 23h12l5 8H24z" />
      <circle class="vehicle-svg-wheel" cx="25" cy="51" r="4" />
      <circle class="vehicle-svg-wheel" cx="45" cy="51" r="4" />
    `
  };

  if (['motorcycle', 'scooter', 'bicycle'].includes(category)) return body.motorcycle;
  if (['truck', 'truckHorse', 'caminhao', 'crane'].includes(category)) return body.truck;
  if (['bus'].includes(category)) return body.bus;
  if (['van'].includes(category)) return body.van;
  if (['pickup', 'utility', 'offroad'].includes(category)) return body.pickup;
  if (['tractor'].includes(category)) return body.tractor;
  if (['person'].includes(category)) return body.person;
  if (['animal'].includes(category)) return body.animal;
  return body.default;
}

function markerSizeForZoom(zoom = 14) {
  const value = numberOrNull(zoom);
  if (value === null || value < 11) return 24;
  if (value < 13) return 30;
  if (value < 15) return 36;
  if (value < 17) return 44;
  if (value < 19) return 52;
  return 58;
}

function vehicleSvgMarkup(category, state, status, course, title, label, size = 74, blocked = false) {
  const markerClass = size < 62 ? 'marker-compact' : 'marker-detailed';
  const image = vehicleImage(category);
  return `
    <div class="vehicle-svg-marker movement-${escapeHtml(state)} status-${escapeHtml(status)} ${escapeHtml(markerClass)} ${blocked ? 'is-blocked' : 'is-free'}" title="${escapeHtml(title)}" style="--marker-size:${size}px">
      <div class="vehicle-svg-pulse"></div>
      <div class="vehicle-image-core" role="img" aria-label="${escapeHtml(title)}" style="transform: rotate(${safeCourse(course)}deg)">
        <img class="vehicle-image-img" src="${escapeHtml(image)}" alt="" loading="eager" decoding="async" />
      </div>
      <span class="vehicle-svg-status"></span>
      <span class="vehicle-svg-label">${escapeHtml(label)}</span>
    </div>
  `;
}

function createVehicleIcon(device = {}, position = {}, zoom = 14) {
  const safePosition = position && typeof position === 'object' ? position : {};
  const category = detectVehicleCategory(device, safePosition);
  const course = safeCourse(safePosition.course);
  const state = movementState(device, safePosition);
  const status = String(device.status || 'unknown').toLowerCase();
  const title = `${getVehicleName(device)} - ${movementLabel(state)} - ${formatSpeed(safePosition.speed)} - direção ${course}°`;
  const label = vehicleMapLabel(category);
  const size = markerSizeForZoom(zoom);
  const anchor = Math.round(size / 2);

  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [anchor, anchor],
    popupAnchor: [0, -Math.round(size * 0.56)],
    html: vehicleSvgMarkup(category, state, status, course, title, label, size, isBlocked(device, safePosition))
  });
}


function enrichDevices(devices, positions, events) {
  const validEvents = normalizeArray(events);
  return normalizeArray(devices).map((device) => {
    const position = getDevicePosition(device, positions);
    const event = latestAlertForDevice(device, validEvents);
    const category = detectVehicleCategory(device, position || {});
    return { device, position, event, category };
  });
}

function usePolling(callback, delayMs, enabled = true) {
  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback; }, [callback]);
  useEffect(() => {
    if (!enabled || !delayMs) return undefined;
    const timer = setInterval(() => callbackRef.current(), delayMs);
    return () => clearInterval(timer);
  }, [delayMs, enabled]);
}

const MEDIA_MODE_OPTIONS = [
  { key: 'image', label: 'Imagem', icon: Image },
  { key: 'webrtc', label: 'WebRTC', icon: Video },
  { key: 'hls', label: 'HLS', icon: Monitor }
];

function normalizeMediaBase(value) {
  return String(value || 'http://mtx.getautoflow.com.br').trim().replace(/\/+$/, '');
}

function cleanMediaPath(value) {
  return String(value || '').trim().replace(/^\/+/, '');
}

function appendCacheBuster(url, cacheKey) {
  if (!url || !cacheKey) return url;
  return `${url}${url.includes('?') ? '&' : '?'}t=${encodeURIComponent(cacheKey)}`;
}

function buildMediaMtxUrl(baseUrl, streamPath, { mode = 'image', snapshotPath = '', cacheKey = 0 } = {}) {
  const base = normalizeMediaBase(baseUrl);
  const rawPath = mode === 'image' ? (snapshotPath || streamPath) : streamPath;
  const pathValue = cleanMediaPath(rawPath);
  if (!pathValue) return '';
  let url = /^https?:\/\//i.test(pathValue) ? pathValue : `${base}/${pathValue}`;
  if (mode === 'hls' && !/\.m3u8(?:$|\?)/i.test(url)) url = `${url.replace(/\/+$/, '')}/index.m3u8`;
  if (mode === 'webrtc' && !url.endsWith('/')) url = `${url}/`;
  return mode === 'image' ? appendCacheBuster(url, cacheKey) : url;
}

function buildMediaProxyImageUrl(streamPath, { snapshotPath = '', url = '', cacheKey = 0 } = {}) {
  const params = new URLSearchParams();
  if (url) params.set('url', url);
  else {
    const pathValue = cleanMediaPath(snapshotPath || streamPath);
    if (!pathValue) return '';
    params.set('path', pathValue);
  }
  if (cacheKey) params.set('t', String(cacheKey));
  const query = params.toString();
  return query ? buildApiUrl(`/api/monitoring/media/image?${query}`) : '';
}

function cameraForDevice(cameras = [], deviceId) {
  const id = Number(deviceId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const camera = normalizeArray(cameras).find((item) => Number(item.deviceId) === id && item.enabled !== false);
  return camera || null;
}

function defaultCameraPath(device = {}) {
  const unique = getVehicleUniqueId(device) || device.id || '';
  return unique ? `veiculo-${String(unique).replace(/[^a-zA-Z0-9_-]+/g, '-')}` : '';
}

function cameraPayloadForEvidence(camera = {}, item = {}, mediaMtxUrl = '', note = '') {
  const device = item?.device || {};
  const imageUrl = buildMediaMtxUrl(mediaMtxUrl, camera.streamPath, {
    mode: 'image',
    snapshotPath: camera.snapshotPath,
    cacheKey: Date.now()
  });
  return {
    deviceId: Number(device.id || camera.deviceId || 0) || null,
    deviceName: getVehicleName(device) || camera.deviceName || '',
    title: `${getVehicleName(device) || camera.label || 'Camera'} - ${formatDate(new Date().toISOString())}`,
    note,
    streamPath: camera.streamPath || camera.snapshotPath || '',
    imageUrl,
    capturedAt: new Date().toISOString()
  };
}

function CameraLiveView({ camera, mediaMtxUrl, cacheKey = 0, compact = false }) {
  const mode = camera?.mode || 'image';
  const liveUrl = mode === 'image'
    ? buildMediaProxyImageUrl(camera?.streamPath, { snapshotPath: camera?.snapshotPath, cacheKey })
    : buildMediaMtxUrl(mediaMtxUrl, camera?.streamPath, { mode, snapshotPath: camera?.snapshotPath, cacheKey });
  const openUrl = buildMediaMtxUrl(mediaMtxUrl, camera?.streamPath, { mode, snapshotPath: camera?.snapshotPath });

  if (!camera?.enabled || !liveUrl) {
    return (
      <div className={`camera-live-empty ${compact ? 'compact' : ''}`}>
        <Camera size={28} />
        <span>Camera sem caminho MediaMTX configurado.</span>
      </div>
    );
  }

  return (
    <div className={`camera-live-frame ${compact ? 'compact' : ''}`}>
      {mode === 'image' && <img src={liveUrl} alt={camera.label || 'Camera em tempo real'} />}
      {mode === 'webrtc' && <iframe title={camera.label || 'Camera WebRTC'} src={liveUrl} allow="autoplay; fullscreen; microphone; camera" />}
      {mode === 'hls' && <video src={liveUrl} controls autoPlay muted playsInline />}
      <a className="camera-open-link" href={openUrl} target="_blank" rel="noreferrer">
        <ExternalLink size={14} /> Abrir midia
      </a>
    </div>
  );
}

function CameraDock({ item, camera, mediaMtxUrl, onClose }) {
  const [cacheKey, setCacheKey] = useState(() => Date.now());
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const device = item?.device || {};

  useEffect(() => {
    if (camera?.mode !== 'image') return undefined;
    const timer = window.setInterval(() => setCacheKey(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, [camera?.mode, camera?.streamPath, camera?.snapshotPath]);

  const saveEvidence = async () => {
    setBusy(true);
    setMessage('');
    try {
      const body = cameraPayloadForEvidence(camera, item, mediaMtxUrl, 'Evidencia salva automaticamente a partir da janela do mapa.');
      const endpoint = body.imageUrl ? '/api/monitoring/evidence/snapshot' : '/api/monitoring/evidence';
      await request(endpoint, { method: 'POST', body: JSON.stringify(body) });
      setMessage('Evidencia salva.');
      setCacheKey(Date.now());
    } catch (error) {
      setMessage(`Falha ao salvar evidencia: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="camera-map-dock" aria-label="Camera do veiculo">
      <div className="camera-dock-header">
        <div>
          <small>Camera integrada</small>
          <b>{camera?.label || getVehicleName(device)}</b>
          <span>{getVehicleName(device)} - {camera?.streamPath || camera?.snapshotPath}</span>
        </div>
        <button className="icon-only-btn" type="button" title="Fechar camera" onClick={onClose}>x</button>
      </div>
      <CameraLiveView camera={camera} mediaMtxUrl={mediaMtxUrl} cacheKey={cacheKey} compact />
      <div className="camera-dock-actions">
        <button className="ghost-btn" type="button" onClick={() => setCacheKey(Date.now())}>
          <RefreshCw size={16} /> Atualizar
        </button>
        <button className="primary-btn" type="button" onClick={saveEvidence} disabled={busy}>
          <ShieldCheck size={16} /> {busy ? 'Salvando...' : 'Salvar evidencia'}
        </button>
      </div>
      {message && <small className={message.startsWith('Falha') ? 'camera-message bad' : 'camera-message good'}>{message}</small>}
    </section>
  );
}

function PopupMetric({ icon, label, value }) {
  return (
    <div className="popup-mini-line">
      {icon}
      <small><b>{label}:</b> {value}</small>
    </div>
  );
}

function TelemetryTile({ icon, label, value, tone = 'info' }) {
  return (
    <div className={`telemetry-tile ${tone}`}>
      <span className="telemetry-icon">{icon}</span>
      <span>
        <small>{label}</small>
        <b>{value ?? '-'}</b>
      </span>
    </div>
  );
}

function Speedometer({ speed }) {
  return (
    <div className="speedometer">
      <Gauge size={20} />
      <strong>{speed}</strong>
      <small>km/h</small>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="row">
      <small>{label}</small>
      <b>{value ?? '-'}</b>
    </div>
  );
}

function StatCard({ icon, label, value, hint }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <small>{label}</small>
        {icon}
      </div>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}

function Badge({ tone = 'info', children }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function MapAutoFit({ positions, enabled = true, singleZoom = 18, maxZoom = 18, padding = [64, 64], requestKey = 0 }) {
  const map = useMap();
  useEffect(() => {
    if (!enabled || !Array.isArray(positions) || positions.length === 0) return;
    const points = positions.map(getLatLng).filter(Boolean);
    if (!points.length) return;
    if (points.length === 1) {
      map.flyTo(points[0], singleZoom, { animate: true, duration: 0.75 });
      return;
    }
    map.fitBounds(points, { padding, maxZoom });
    const timer = setTimeout(() => {
      if (map.getZoom() < 15) map.setZoom(15, { animate: true });
    }, 360);
    return () => clearTimeout(timer);
  }, [enabled, map, positions, singleZoom, maxZoom, padding, requestKey]);
  return null;
}

function useMapZoom() {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useEffect(() => {
    const syncZoom = () => setZoom(map.getZoom());
    syncZoom();
    map.on('zoomend', syncZoom);
    return () => map.off('zoomend', syncZoom);
  }, [map]);
  return zoom;
}

function MapFocusTarget({ item, zoom = 18 }) {
  const map = useMap();
  useEffect(() => {
    const latLng = getLatLng(item?.position);
    if (!latLng) return;
    map.flyTo(latLng, zoom, { animate: true, duration: 0.78 });
  }, [item, map, zoom]);
  return null;
}


const VehicleMarker = memo(function VehicleMarker({ item, onFocus, focused = false }) {
  const { device, position, event, category } = item;
  const map = useMap();
  const zoom = useMapZoom();
  const markerRef = useRef(null);
  const [commandBusy, setCommandBusy] = useState(false);
  const [commandMessage, setCommandMessage] = useState(null);
  const latLng = getLatLng(position);
  const latKey = latLng ? `${latLng[0]},${latLng[1]}` : '';
  const centerOnPopup = useCallback((targetZoom = 18) => {
    if (!latLng) return;
    const nextZoom = Math.max(map.getZoom(), targetZoom);
    map.flyTo(latLng, nextZoom, { animate: true, duration: 0.68 });
  }, [latKey, map]);
  useEffect(() => {
    if (!focused || !latLng) return undefined;
    const timer = window.setTimeout(() => {
      centerOnPopup(18);
      markerRef.current?.openPopup?.();
    }, 240);
    return () => window.clearTimeout(timer);
  }, [centerOnPopup, focused, latKey]);
  if (!latLng) return null;

  const attrs = getPositionAttributes(position);
  const state = movementState(device, position);
  const speed = kmh(position.speed);
  const blocked = isBlocked(device, position);
  const ignition = isIgnitionOn(device, position);
  const battery = batteryPercent(device, position);
  const voltage = vehicleVoltage(device, position);
  const last = position.deviceTime || position.fixTime || position.serverTime;
  const idleMinutes = minutesSincePosition(position);
  const plate = getVehiclePlate(device) || getVehicleUniqueId(device) || vehicleMapLabel(category);
  const lat = numberOrNull(position.latitude);
  const lon = numberOrNull(position.longitude);
  const locationText = position.address || (lat !== null && lon !== null ? `${lat.toFixed(5)}, ${lon.toFixed(5)}` : '-');

  const sendBlockCommand = async () => {
    const action = blocked ? 'desbloquear' : 'bloquear';
    const confirmed = window.confirm(`Enviar comando para ${action} ${getVehicleName(device)}?`);
    if (!confirmed) return;

    setCommandBusy(true);
    setCommandMessage(null);
    try {
      const types = await request(`/api/command-types?deviceId=${device.id}`);
      const selectedType = findBlockCommandType(types, blocked);
      if (!selectedType) {
        throw new Error(`Nenhum comando cadastrado para ${action}. Cadastre engineStop/engineResume ou equivalente no Traccar.`);
      }
      const result = await request('/api/send-command', {
        method: 'POST',
        body: JSON.stringify({ deviceId: Number(device.id), type: selectedType, attributes: {} })
      });
      setCommandMessage({
        tone: result?.ok === false ? 'warn' : 'good',
        text: `Comando ${selectedType} enviado para ${action}.`
      });
    } catch (error) {
      setCommandMessage({ tone: 'bad', text: `Falha ao enviar comando: ${error.message}` });
    } finally {
      setCommandBusy(false);
    }
  };

  return (
    <Marker
      ref={markerRef}
      position={latLng}
      icon={createVehicleIcon(device, position, zoom)}
      eventHandlers={{
        click: () => {
          onFocus?.(device.id);
          centerOnPopup(18);
        },
        popupopen: () => {
          window.setTimeout(() => centerOnPopup(17), 80);
        }
      }}
    >
      <Popup className="vehicle-leaflet-popup" autoPan={false} keepInView={false} minWidth={260} maxWidth={318}>
        <div className="vehicle-popup">
          <div className="vehicle-popup-header">
            <div>
              <b>{getVehicleName(device)}</b>
              <small>{plate}</small>
            </div>
            <Badge tone={movementTone(state)}>{movementLabel(state)}</Badge>
          </div>

          <div className="popup-speed-row">
            <Speedometer speed={speed} />
            <div className="popup-status-stack">
              <TelemetryTile icon={blocked ? <Lock size={15} /> : <Unlock size={15} />} label="Bloqueio" value={blocked ? 'Bloqueado' : 'Liberado'} tone={blocked ? 'bad' : 'good'} />
              <TelemetryTile icon={<KeyRound size={15} />} label="Ignição" value={ignition ? 'Ligada' : 'Desligada'} tone={ignition ? 'good' : 'bad'} />
            </div>
          </div>

          <div className="telemetry-grid">
            <TelemetryTile icon={<BatteryCharging size={15} />} label="Bateria" value={formatBattery(battery)} tone="info" />
            <TelemetryTile icon={<Zap size={15} />} label="Voltagem" value={formatVoltage(voltage)} tone="info" />
            <TelemetryTile icon={<Navigation size={15} />} label="Curso" value={`${safeCourse(position.course)}°`} tone="info" />
            <TelemetryTile icon={<Clock3 size={15} />} label="Atualização" value={timeAgo(last)} tone="warn" />
          </div>

          <div className="popup-location-line">
            <MapPinned size={15} />
            <span>{locationText}</span>
          </div>

          <div className="popup-action-row">
            <button
              type="button"
              className={`popup-command-btn ${blocked ? 'unlock' : 'lock'}`}
              onClick={sendBlockCommand}
              disabled={commandBusy}
            >
              {blocked ? <Unlock size={16} /> : <Lock size={16} />}
              <span>{commandBusy ? 'Enviando...' : blocked ? 'Liberar bloqueio' : 'Bloquear veiculo'}</span>
            </button>
          </div>
          {commandMessage && <div className={`popup-command-message ${commandMessage.tone}`}>{commandMessage.text}</div>}

          {state === 'idle' && (
            <div className="idle-alert">
              <TimerReset size={16} />
              Veículo ligado e parado há pelo menos {idleMinutes || 3} min.
            </div>
          )}

          <div className="popup-footer">
            <PopupMetric icon={<Power size={14} />} label="Status Traccar" value={statusLabel(device.status)} />
            <PopupMetric icon={<AlertTriangle size={14} />} label="Alerta" value={alertText(event, position)} />
            {attrs.sat || attrs.satellites ? <PopupMetric icon={<LocateFixed size={14} />} label="Satélites" value={attrs.sat || attrs.satellites} /> : null}
          </div>
        </div>
      </Popup>
    </Marker>
  );
});

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('[React ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="error-box" style={{ margin: 20 }}>
          <b>Erro ao carregar o frontend.</b>
          <p>{this.state.error.message}</p>
          <button className="primary-btn" onClick={() => window.location.reload()}>Recarregar</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Dashboard({ items, stats, layerKey, setLayerKey, fitMap, setFitMap, search, setSearch, statusFilter, setStatusFilter, fleetPanelHidden, setFleetPanelHidden, focusedVehicleId, setFocusedVehicleId, monitoringCameras = [], mediaMtxUrl = '' }) {
  const validPositions = items.map((item) => item?.position).filter(isValidPosition);
  const layer = MAP_LAYERS[layerKey] || MAP_LAYERS.osm;
  const moving = items.filter(({ device, position }) => movementState(device, position) === 'moving').length;
  const idle = items.filter(({ device, position }) => movementState(device, position) === 'idle').length;
  const stopped = items.filter(({ device, position }) => movementState(device, position) === 'stopped').length;
  const focusedItem = items.find(({ device, position }) => Number(device.id) === Number(focusedVehicleId) && isValidPosition(position)) || null;
  const focusedCamera = focusedItem ? cameraForDevice(monitoringCameras, focusedItem.device.id) : null;
  const [fitRequestId, setFitRequestId] = useState(0);
  const [cameraDockClosedFor, setCameraDockClosedFor] = useState(null);
  const focusVehicle = useCallback((vehicleId) => {
    setFocusedVehicleId(Number(vehicleId));
    setFitMap(false);
  }, [setFitMap, setFocusedVehicleId]);
  const fitAllVehicles = useCallback(() => {
    setFocusedVehicleId(null);
    setFitMap(true);
    setFitRequestId((value) => value + 1);
  }, [setFitMap, setFocusedVehicleId]);
  useEffect(() => {
    setFocusedVehicleId(null);
    setFitMap(true);
    setFitRequestId((value) => value + 1);
  }, [setFitMap, setFocusedVehicleId]);
  useEffect(() => { setCameraDockClosedFor(null); }, [focusedVehicleId]);

  return (
    <div className="dashboard-screen">
      <div className="card-grid modern-card-grid dashboard-compact-grid">
        <StatCard icon={<Car size={22} />} label="Veículos" value={stats.total} hint="Total carregado do Traccar" />
        <StatCard icon={<Navigation size={22} />} label="Movimento" value={moving} hint="Carro verde no mapa" />
        <StatCard icon={<TimerReset size={22} />} label="Ociosos" value={idle} hint="Ligado e parado +3 min" />
        <StatCard icon={<Power size={22} />} label="Parados" value={stopped} hint="Carro vermelho no mapa" />
      </div>

      <div className="layout map-dashboard-layout">
        <section className="panel map-stage-panel">
          <div className="map-toolbar">
            <div className="actions">
              <select value={layerKey} onChange={(event) => setLayerKey(event.target.value)} aria-label="Camada do mapa">
                {Object.entries(MAP_LAYERS).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
              </select>
              <button className="ghost-btn" onClick={fitAllVehicles} title="Centralizar frota no mapa">
                <MapPinned size={17} /> {fitMap ? 'Frota centralizada' : 'Centralizar frota'}
              </button>
              <button className="ghost-btn" onClick={() => setFleetPanelHidden((value) => !value)} title={fleetPanelHidden ? 'Mostrar lista lateral da frota' : 'Esconder lista lateral da frota'}>
                <Car size={17} /> {fleetPanelHidden ? 'Mostrar frota' : 'Esconder frota'}
              </button>
            </div>
            <Badge tone="info"><Layers size={14} /> {layer.description}</Badge>
          </div>

          <div className="map-wrap full-background-map">
            <MapContainer center={getLatLng(validPositions[0]) || DEFAULT_CENTER} zoom={12} scrollWheelZoom>
              <TileLayer attribution={layer.attribution} url={layer.url} maxZoom={20} />
              <MapAutoFit positions={validPositions} enabled={fitMap} singleZoom={17} maxZoom={17} padding={[72, 72]} requestKey={fitRequestId} />
              <MapFocusTarget item={focusedItem} zoom={18} />
              {items.map((item) => <VehicleMarker key={item.device.id} item={item} onFocus={focusVehicle} focused={Number(item.device.id) === Number(focusedVehicleId)} />)}
            </MapContainer>
          </div>

          {fleetPanelHidden && (
            <div className="map-side-icon-column" aria-label="Painel de frota recolhido">
              <button type="button" title="Mostrar frota" aria-label="Mostrar frota" onClick={() => setFleetPanelHidden(false)}>
                <Car size={19} />
              </button>
              <button type="button" title="Centralizar veículos" aria-label="Centralizar veículos" onClick={fitAllVehicles}>
                <MapPinned size={19} />
              </button>
            </div>
          )}

          <section className={`panel fleet-overlay-panel ${fleetPanelHidden ? 'is-hidden' : ''}`}>
            <div className="fleet-overlay-header">
              <h3>Frota em tempo real</h3>
              <button className="icon-only-btn" type="button" title="Esconder frota" onClick={() => setFleetPanelHidden(true)}>
                ×
              </button>
            </div>
            <div className="actions fleet-search-actions">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <Search size={16} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar veículo, placa ou ID" style={{ width: '100%' }} />
              </div>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">Todos</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="unknown">Indefinido</option>
              </select>
            </div>
            <div className="movement-legend">
              <span><i className="legend-dot moving"></i> Movimento</span>
              <span><i className="legend-dot stopped"></i> Parado</span>
              <span><i className="legend-dot idle"></i> Ocioso</span>
            </div>
            <VehicleList items={items} selectedDeviceId={focusedVehicleId} onSelect={({ device }) => focusVehicle(device.id)} />
          </section>

          {focusedItem && focusedCamera?.autoOpen !== false && cameraDockClosedFor !== Number(focusedVehicleId) && (
            <CameraDock
              item={focusedItem}
              camera={focusedCamera}
              mediaMtxUrl={mediaMtxUrl}
              onClose={() => setCameraDockClosedFor(Number(focusedVehicleId))}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function VehicleList({ items, compact = false, selectedDeviceId = null, onSelect }) {
  if (!items.length) return <div className="warn-box">Nenhum veículo encontrado com os filtros atuais.</div>;
  return (
    <div className="list">
      {items.map(({ device, position, event, category }) => {
        const last = position?.deviceTime || position?.fixTime || position?.serverTime;
        const blocked = isBlocked(device, position || {});
        const selected = Number(device.id) === Number(selectedDeviceId);
        return (
          <button type="button" className={`row vehicle-list-row ${selected ? 'is-selected' : ''}`} key={device.id} onClick={() => onSelect?.({ device, position, event, category })}>
            <div className="row-head">
              <div>
                <b>{getVehicleName(device)}</b>
                <br />
                <small>{vehicleLabel(category)} · {getVehiclePlate(device) || getVehicleUniqueId(device) || 'sem placa/ID'}</small>
              </div>
              <span className="vehicle-row-badges">
                <Badge tone={statusClass(device.status)}>{statusLabel(device.status)}</Badge>
                <Badge tone={blocked ? 'bad' : 'good'}>{blocked ? 'Bloqueado' : 'Liberado'}</Badge>
              </span>
            </div>
            <small>{position ? `${movementLabel(movementState(device, position))} · ${formatSpeed(position.speed)} · ${timeAgo(last)} · ${formatDate(last)}` : 'Sem posição recente'}</small>
            {!compact && <small>{alertText(event, position || {})}</small>}
          </button>
        );
      })}
    </div>
  );
}

function VehiclesPage({ items }) {
  const showCan = items.some(({ device, position }) => collectTelemetryGroups(device, position || {}).some((group) => group.key === 'can'));
  const showTemperature = items.some(({ device, position }) => collectTelemetryGroups(device, position || {}).some((group) => group.key === 'temperature'));
  const showDriver = items.some(({ device, position }) => collectTelemetryGroups(device, position || {}).some((group) => group.key === 'driver'));

  return (
    <section className="panel">
      <h3>Veículos</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Status</th>
              <th>Tipo</th>
              <th>Velocidade</th>
              <th>Ignição</th>
              <th>Bateria</th>
              {showCan && <th>Rede CAN</th>}
              {showTemperature && <th>Temperatura</th>}
              {showDriver && <th>Motorista</th>}
              <th>Última posição</th>
            </tr>
          </thead>
          <tbody>
            {items.map(({ device, position, category }) => {
              const attrs = getPositionAttributes(position || {});
              const last = position?.deviceTime || position?.fixTime || position?.serverTime;
              return (
                <tr key={device.id}>
                  <td><b>{getVehicleName(device)}</b><br /><small>{getVehiclePlate(device) || getVehicleUniqueId(device) || '-'}</small></td>
                  <td><Badge tone={statusClass(device.status)}>{statusLabel(device.status)}</Badge></td>
                  <td>{vehicleLabel(category)}</td>
                  <td>{position ? formatKmh(position.speed) : '-'}</td>
                  <td>{ignitionLabel(attrs.ignition)}</td>
                  <td>{formatBattery(getAttr(position || {}, ['batteryLevel', 'battery'], null))}</td>
                  {showCan && <td>{firstTelemetryValue(device, position || {}, 'can') || '-'}</td>}
                  {showTemperature && <td>{firstTelemetryValue(device, position || {}, 'temperature') || '-'}</td>}
                  {showDriver && <td>{firstTelemetryValue(device, position || {}, 'driver') || '-'}</td>}
                  <td>{formatDate(last)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EventsPage({ events, devicesById }) {
  const sorted = useMemo(() => normalizeArray(events).slice().sort((a, b) => new Date(eventTime(b) || 0) - new Date(eventTime(a) || 0)), [events]);
  if (!sorted.length) return <div className="warn-box">Nenhum alerta/evento retornado nas últimas 24 horas.</div>;
  return (
    <section className="panel">
      <h3>Alertas e eventos</h3>
      <div className="list" style={{ maxHeight: 'none' }}>
        {sorted.map((event, index) => {
          const Icon = alertIcon(event);
          const device = devicesById.get(eventDeviceId(event));
          return (
            <div className="row" key={`${event.id || eventTime(event) || index}-${index}`}>
              <div className="row-head">
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Icon size={18} />
                  <b>{eventText(event)}</b>
                </div>
                <Badge tone={alertClass(event)}>{formatTime(eventTime(event))}</Badge>
              </div>
              <small>{device ? getVehicleName(device) : `Dispositivo ${eventDeviceId(event) || '-'}`} · {formatDate(eventTime(event))}</small>
              {event.attributes?.result && <small>Resultado: {String(event.attributes.result)}</small>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CommandsPage({ items }) {
  const [deviceId, setDeviceId] = useState('');
  const [types, setTypes] = useState([]);
  const [type, setType] = useState('');
  const [customData, setCustomData] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const selectedDeviceId = Number(deviceId || items[0]?.device?.id || 0);

  useEffect(() => {
    if (!selectedDeviceId) return;
    let cancelled = false;
    request(`/api/command-types?deviceId=${selectedDeviceId}`)
      .then((payload) => {
        if (cancelled) return;
        const list = normalizeArray(payload);
        setTypes(list);
        if (!type && list[0]?.type) setType(list[0].type);
      })
      .catch((error) => {
        if (!cancelled) setMessage(`Não foi possível carregar tipos de comando: ${error.message}`);
      });
    return () => { cancelled = true; };
  }, [selectedDeviceId, type]);

  const sendCommand = async () => {
    setBusy(true);
    setMessage('');
    try {
      const payload = {
        deviceId: selectedDeviceId,
        type: type || 'custom',
        attributes: customData ? { data: customData } : {}
      };
      const result = await request('/api/send-command', { method: 'POST', body: JSON.stringify(payload) });
      setMessage(result.ok ? 'Comando enviado ao Traccar.' : 'Comando enviado, mas o retorno não confirmou sucesso.');
    } catch (error) {
      setMessage(`Falha ao enviar comando: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel">
      <h3>Comandos seguros</h3>
      <div className="warn-box">Comandos passam pelo proxy Node. Nenhuma credencial do Traccar fica exposta no navegador.</div>
      {message && <div className={message.startsWith('Falha') || message.startsWith('Não') ? 'error-box' : 'success-box'}>{message}</div>}
      <div className="form-grid">
        <label>
          <small>Veículo</small>
          <select value={deviceId || String(selectedDeviceId)} onChange={(event) => setDeviceId(event.target.value)} style={{ width: '100%', marginTop: 6 }}>
            {items.map(({ device }) => <option key={device.id} value={device.id}>{getVehicleName(device)}</option>)}
          </select>
        </label>
        <label>
          <small>Tipo de comando</small>
          <select value={type} onChange={(event) => setType(event.target.value)} style={{ width: '100%', marginTop: 6 }}>
            {types.map((item) => <option key={item.type || item} value={item.type || item}>{item.type || item}</option>)}
            <option value="custom">custom</option>
          </select>
        </label>
        <label className="full">
          <small>Dados personalizados opcional</small>
          <textarea value={customData} onChange={(event) => setCustomData(event.target.value)} placeholder="Exemplo: comando raw para rastreador quando o tipo for custom" />
        </label>
        <div className="full">
          <button className="primary-btn" onClick={sendCommand} disabled={busy || !selectedDeviceId}>
            <Send size={17} /> {busy ? 'Enviando...' : 'Enviar comando'}
          </button>
        </div>
      </div>
    </section>
  );
}

function TelemetryHighlights({ device = {}, position = {} }) {
  const groups = collectTelemetryGroups(device, position);
  if (!groups.length) return <div className="warn-box">Este equipamento ainda nao enviou CAN, temperatura, motorista ou outros sensores relevantes no ultimo pacote.</div>;
  return (
    <div className="telemetry-highlight-grid">
      {groups.map((group) => {
        const Icon = group.icon || Cpu;
        return (
          <div className="telemetry-highlight-card" key={group.key}>
            <div className="telemetry-highlight-title">
              <Icon size={18} />
              <b>{group.label}</b>
            </div>
            <div className="telemetry-highlight-values">
              {group.values.map((entry) => (
                <div className="kv" key={entry.key}>
                  <span>{entry.label}</span>
                  <b>{entry.value}</b>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AttributesPage({ items }) {
  const firstDeviceId = items[0]?.device?.id ? String(items[0].device.id) : '';
  const [deviceId, setDeviceId] = useState(firstDeviceId);
  useEffect(() => {
    if (!deviceId && firstDeviceId) setDeviceId(firstDeviceId);
  }, [deviceId, firstDeviceId]);
  const selected = items.find(({ device }) => String(device.id) === String(deviceId)) || items[0] || {};
  const deviceAttrs = getDeviceAttributes(selected.device || {});
  const positionAttrs = getPositionAttributes(selected.position || {});
  return (
    <section className="panel">
      <h3>Atributos e sensores</h3>
      <div className="reports-controls attributes-controls">
        <label>
          <small>Veiculo</small>
          <select value={deviceId} onChange={(event) => setDeviceId(event.target.value)}>
            {items.map(({ device }) => <option key={device.id} value={device.id}>{getVehicleName(device)}</option>)}
          </select>
        </label>
      </div>
      <div className="mini-grid" style={{ marginBottom: 12 }}>
        <Info label="GPS valido" value={yesNo(selected.position?.valid)} />
        <Info label="Distância" value={formatDistance(positionAttrs.distance)} />
        <Info label="Total distance" value={formatDistance(positionAttrs.totalDistance)} />
        <Info label="Satélites" value={positionAttrs.sat || positionAttrs.satellites || '-'} />
      </div>
      <TelemetryHighlights device={selected.device || {}} position={selected.position || {}} />
      <div className="layout">
        <div>
          <h3>Atributos do dispositivo</h3>
          <KeyValueTable data={deviceAttrs} />
        </div>
        <div>
          <h3>Atributos da posição</h3>
          <KeyValueTable data={positionAttrs} />
        </div>
      </div>
    </section>
  );
}

function isSensitiveKey(key = '') {
  return /token|password|senha|secret|cookie|authorization|credential|session/i.test(String(key));
}

function KeyValueTable({ data }) {
  const entries = Object.entries(data || {})
    .filter(([key]) => !isSensitiveKey(key))
    .sort(([a], [b]) => a.localeCompare(b));
  if (!entries.length) return <div className="warn-box">Sem atributos para exibir.</div>;
  return (
    <div className="table-wrap">
      <table>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key}>
              <th>{key}</th>
              <td>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


function datetimeLocalValue(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeHoursAgo(hours = 6) {
  return datetimeLocalValue(new Date(Date.now() - hours * 60 * 60 * 1000));
}

function datetimeStartOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return datetimeLocalValue(date);
}

function isoFromLocalInput(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function normalizeReportRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.positions)) return payload.positions;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const output = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${output.replaceAll('"', '""')}"`;
}

function flattenCsvRow(row = {}) {
  const attrs = row.attributes && typeof row.attributes === 'object' ? row.attributes : {};
  return {
    id: row.id ?? '',
    deviceId: row.deviceId ?? '',
    deviceTime: row.deviceTime || row.fixTime || row.serverTime || row.startTime || row.endTime || '',
    startTime: row.startTime || '',
    endTime: row.endTime || '',
    latitude: row.latitude ?? '',
    longitude: row.longitude ?? '',
    speedKmh: row.speed !== undefined ? kmh(row.speed) : '',
    maxSpeedKmh: row.maxSpeed !== undefined ? kmh(row.maxSpeed) : '',
    averageSpeedKmh: row.averageSpeed !== undefined ? kmh(row.averageSpeed) : '',
    course: safeCourse(row.course),
    altitude: row.altitude ?? '',
    distance: row.distance ?? row.totalDistance ?? '',
    duration: row.duration ?? '',
    address: row.address || row.startAddress || row.endAddress || '',
    startAddress: row.startAddress || '',
    endAddress: row.endAddress || '',
    type: row.type || '',
    ignition: attrs.ignition ?? '',
    motion: attrs.motion ?? '',
    battery: attrs.batteryLevel ?? attrs.battery ?? '',
    voltage: attrs.power ?? attrs.voltage ?? attrs.externalPower ?? ''
  };
}

function downloadCsv(filename, rows = []) {
  const normalized = normalizeArray(rows).map(flattenCsvRow);
  if (!normalized.length) return false;
  const headers = Object.keys(normalized[0]);
  const csv = [
    headers.join(','),
    ...normalized.map((row) => headers.map((key) => csvEscape(row[key])).join(','))
  ].join('\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}

function downloadText(filename, content = '') {
  if (!String(content || '').trim()) return false;
  const blob = new Blob([String(content)], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}

const REPORT_TYPES = [
  { value: 'route', label: 'Rota / playback', keywords: ['rota', 'trajeto', 'playback', 'percurso', 'caminho'] },
  { value: 'stops', label: 'Paradas', keywords: ['parada', 'paradas', 'parou', 'ficou parado'] },
  { value: 'trips', label: 'Viagens', keywords: ['viagem', 'viagens', 'deslocamento'] },
  { value: 'events', label: 'Eventos', keywords: ['evento', 'eventos', 'alerta', 'alertas', 'alarme'] },
  { value: 'summary', label: 'Resumo', keywords: ['resumo', 'km', 'quilometragem', 'distancia', 'horas'] }
];

function reportTypeLabel(type) {
  return REPORT_TYPES.find((item) => item.value === type)?.label || type;
}

function detectReportType(text = '') {
  const normalized = normalizeText(text);
  return REPORT_TYPES.find((type) => type.keywords.some((keyword) => normalized.includes(normalizeText(keyword))))?.value || 'summary';
}

function detectPeriodFromText(text = '') {
  const normalized = normalizeText(text);
  const now = new Date();
  const from = new Date(now);
  const to = new Date(now);

  if (/ontem/.test(normalized)) {
    from.setDate(from.getDate() - 1);
    from.setHours(0, 0, 0, 0);
    to.setDate(to.getDate() - 1);
    to.setHours(23, 59, 59, 999);
  } else if (/semana|7 dias/.test(normalized)) {
    from.setDate(from.getDate() - 7);
  } else if (/mes|30 dias/.test(normalized)) {
    from.setDate(from.getDate() - 30);
  } else if (/24h|24 horas|ultimo dia|ultima 24|ultimas 24|ultimos 24/.test(normalized)) {
    from.setHours(from.getHours() - 24);
  } else if (/6h|6 horas/.test(normalized)) {
    from.setHours(from.getHours() - 6);
  } else {
    from.setHours(0, 0, 0, 0);
  }

  return { from: datetimeLocalValue(from), to: datetimeLocalValue(to) };
}

function findVehicleFromText(text = '', items = []) {
  const normalized = normalizeText(text);
  if (!normalized) return items[0] || null;
  return items.find(({ device }) => {
    const candidates = [getVehicleName(device), getVehiclePlate(device), getVehicleUniqueId(device), device.id]
      .filter(Boolean)
      .map(normalizeText);
    return candidates.some((candidate) => candidate && normalized.includes(candidate));
  }) || items[0] || null;
}

function assistantFleetSummary(items = [], events = []) {
  const total = items.length;
  const online = items.filter(({ device }) => String(device.status).toLowerCase() === 'online').length;
  const moving = items.filter(({ device, position }) => position && isMoving(device, position)).length;
  const blocked = items.filter(({ device, position }) => isBlocked(device, position || {})).length;
  const stale = items.filter(({ position }) => {
    const minutes = minutesSincePosition(position || {});
    return minutes !== null && minutes >= 60;
  }).length;
  const recentAlerts = normalizeArray(events).slice(0, 8).map((event) => `- ${formatDate(eventTime(event))}: ${alertText(event)}`).join('\n');

  return [
    `Frota visivel neste login: ${total} veiculos.`,
    `Online: ${online}. Em movimento: ${moving}. Bloqueados: ${blocked}. Sem posicao ha mais de 1h: ${stale}.`,
    recentAlerts ? `\nAlertas recentes:\n${recentAlerts}` : '\nSem alertas recentes retornados para este usuario.',
    '\nTodas as informacoes acima vieram apenas dos veiculos liberados para este login.'
  ].join('\n');
}

function assistantVehicleDetails(item = null) {
  if (!item?.device) return 'Nao encontrei veiculo liberado para este usuario.';
  const { device, position, event, category } = item;
  const groups = collectTelemetryGroups(device, position || {});
  const telemetry = groups.length
    ? groups.map((group) => `${group.label}: ${group.values.map((entry) => `${entry.label} ${entry.value}`).join(', ')}`).join('\n')
    : 'Nenhuma telemetria extra enviada no ultimo pacote.';
  return [
    `${getVehicleName(device)} (${vehicleLabel(category)})`,
    `Status: ${statusLabel(device.status)}. Movimento: ${position ? movementLabel(movementState(device, position)) : 'sem posicao'}.`,
    `Velocidade: ${position ? formatSpeed(position.speed) : '-'}. Ultima posicao: ${formatDate(position?.deviceTime || position?.fixTime || position?.serverTime)}.`,
    `Placa/ID: ${getVehiclePlate(device) || getVehicleUniqueId(device) || '-'}. Bloqueio: ${isBlocked(device, position || {}) ? 'bloqueado' : 'liberado'}.`,
    `Alerta atual: ${alertText(event, position || {})}.`,
    `\n${telemetry}`
  ].join('\n');
}

function assistantCustomReport(items = [], events = []) {
  const rows = items.map(({ device, position, category }) => {
    const groups = collectTelemetryGroups(device, position || {});
    const extras = groups.map((group) => `${group.label}: ${group.values.map((entry) => `${entry.label} ${entry.value}`).join(', ')}`).join(' | ');
    return `- ${getVehicleName(device)} | ${vehicleLabel(category)} | ${statusLabel(device.status)} | ${position ? formatSpeed(position.speed) : '-'} | ${formatDate(position?.deviceTime || position?.fixTime || position?.serverTime)}${extras ? ` | ${extras}` : ''}`;
  });
  return [
    'Relatorio personalizado da frota visivel',
    `Gerado em: ${formatDate(new Date())}`,
    `Veiculos: ${items.length}`,
    `Eventos recentes: ${normalizeArray(events).length}`,
    '',
    ...rows
  ].join('\n');
}

function reportPointIcon(label = 'P', tone = 'info', course = 0) {
  const safeLabel = String(label || 'P');
  const direction = safeCourse(course);
  const content = safeLabel === '➤'
    ? `<span class="report-point-arrow" style="transform: rotate(${direction}deg)">➤</span>`
    : `<span>${escapeHtml(safeLabel)}</span>`;

  return L.divIcon({
    className: '',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -18],
    html: `<div class="report-point-icon ${escapeHtml(tone)}">${content}</div>`
  });
}


function ReportsPage({ items, layerKey }) {
  const firstDeviceId = items[0]?.device?.id ? String(items[0].device.id) : '';
  const [deviceId, setDeviceId] = useState(firstDeviceId);
  const [from, setFrom] = useState(() => datetimeStartOfToday());
  const [to, setTo] = useState(() => datetimeLocalValue());
  const [reportType, setReportType] = useState('route');
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!deviceId && firstDeviceId) setDeviceId(firstDeviceId);
  }, [deviceId, firstDeviceId]);

  const selectedDevice = items.find(({ device }) => String(device.id) === String(deviceId))?.device || null;
  const layer = MAP_LAYERS[layerKey] || MAP_LAYERS.googleRoad || MAP_LAYERS.osm;
  const validRouteRows = rows.filter(isValidPosition);
  const routePoints = validRouteRows.map(getLatLng).filter(Boolean);
  const directionStep = Math.max(1, Math.ceil(validRouteRows.length / 18));
  const directionRows = validRouteRows.filter((_, index) => (
    routePoints.length > 2 &&
    index > 0 &&
    index < validRouteRows.length - 1 &&
    index % directionStep === 0
  ));
  const canQuery = Boolean(deviceId && from && to);

  const queryReport = async ({ nextReportType = reportType, nextFrom = from, nextTo = to, nextDeviceId = deviceId } = {}) => {
    if (!nextDeviceId || !nextFrom || !nextTo) {
      setMessage('Selecione veículo e período para consultar.');
      return;
    }

    setBusy(true);
    setMessage('');
    setRows([]);
    setReportType(nextReportType);
    setFrom(nextFrom);
    setTo(nextTo);
    setDeviceId(String(nextDeviceId));

    try {
      const query = new URLSearchParams({
        deviceId: String(nextDeviceId),
        from: isoFromLocalInput(nextFrom),
        to: isoFromLocalInput(nextTo)
      });
      const payload = await request(`/api/traccar/reports/${nextReportType}?${query.toString()}`);
      const nextRows = normalizeReportRows(payload);
      setRows(nextRows);
      setMessage(nextRows.length ? `${nextRows.length} registros encontrados.` : 'Nenhum registro encontrado no período.');
    } catch (error) {
      setMessage(`Falha ao consultar relatório: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const runReport = () => queryReport();

  const runTodayRoute = () => {
    queryReport({
      nextReportType: 'route',
      nextFrom: datetimeStartOfToday(),
      nextTo: datetimeLocalValue(),
      nextDeviceId: deviceId || firstDeviceId
    });
  };

  const exportRows = () => {
    const ok = downloadCsv(`rafacar-${reportType}-${deviceId || 'veiculo'}-${Date.now()}.csv`, rows);
    if (!ok) setMessage('Não há dados para exportar.');
  };

  return (
    <section className="panel reports-panel">
      <div className="reports-header">
        <div>
          <h3>Relatórios, playback e trajeto do dia</h3>
          <p>Consulte rota/playback, visualize o trajeto percorrido no mapa e exporte CSV.</p>
        </div>
        <Badge tone={routePoints.length ? 'good' : 'info'}>{routePoints.length} pontos no mapa</Badge>
      </div>

      <div className="reports-controls">
        <label>
          <small>Veículo</small>
          <select value={deviceId} onChange={(event) => setDeviceId(event.target.value)}>
            <option value="">Selecione</option>
            {items.map(({ device }) => (
              <option key={device.id} value={device.id}>{getVehicleName(device)}</option>
            ))}
          </select>
        </label>
        <label>
          <small>Tipo</small>
          <select value={reportType} onChange={(event) => setReportType(event.target.value)}>
            <option value="route">Playback / rota</option>
            <option value="trips">Viagens</option>
            <option value="stops">Paradas</option>
            <option value="events">Eventos</option>
            <option value="summary">Resumo</option>
          </select>
        </label>
        <label>
          <small>De</small>
          <input type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label>
          <small>Até</small>
          <input type="datetime-local" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
        <div className="reports-actions">
          <button className="primary-btn" onClick={runTodayRoute} disabled={busy || !(deviceId || firstDeviceId)}>
            <Route size={17} /> Trajeto de hoje
          </button>
          <button className="primary-btn" onClick={runReport} disabled={busy || !canQuery}>
            <Search size={17} /> {busy ? 'Consultando...' : 'Consultar'}
          </button>
          <button className="ghost-btn" onClick={exportRows} disabled={!rows.length}>
            <Send size={17} /> Exportar CSV
          </button>
        </div>
      </div>

      {message && <div className={message.startsWith('Falha') || message.startsWith('Não há') ? 'error-box' : 'success-box'}>{message}</div>}

      <div className="reports-grid">
        <div className="report-map-wrap">
          <MapContainer center={routePoints[0] || DEFAULT_CENTER} zoom={routePoints.length ? 17 : 12} scrollWheelZoom>
            <TileLayer attribution={layer.attribution} url={layer.url} maxZoom={20} />
            <MapAutoFit positions={validRouteRows} enabled={Boolean(routePoints.length)} singleZoom={18} maxZoom={18} padding={[54, 54]} />
            {routePoints.length > 1 && <Polyline positions={routePoints} weight={6} opacity={0.84} className="report-route-line" />}
            {directionRows.map((row, index) => (
              <Marker key={`dir-${row.id || row.deviceTime || index}`} position={getLatLng(row)} icon={reportPointIcon('➤', 'info', row.course)}>
                <Popup>
                  Direção do trajeto<br />
                  {formatDate(row.deviceTime || row.fixTime || row.serverTime)}<br />
                  {formatSpeed(row.speed)}
                </Popup>
              </Marker>
            ))}
            {routePoints[0] && (
              <Marker position={routePoints[0]} icon={reportPointIcon('I', 'good')}>
                <Popup>Início<br />{formatDate(validRouteRows[0]?.deviceTime || validRouteRows[0]?.fixTime || validRouteRows[0]?.serverTime)}</Popup>
              </Marker>
            )}
            {routePoints.length > 1 && (
              <Marker position={routePoints[routePoints.length - 1]} icon={reportPointIcon('F', 'bad')}>
                <Popup>Fim<br />{formatDate(validRouteRows[validRouteRows.length - 1]?.deviceTime || validRouteRows[validRouteRows.length - 1]?.fixTime || validRouteRows[validRouteRows.length - 1]?.serverTime)}</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        <div className="reports-results">
          <div className="kv"><span>Veículo</span><b>{selectedDevice ? getVehicleName(selectedDevice) : '-'}</b></div>
          <div className="kv"><span>Período</span><b>{from} até {to}</b></div>
          <div className="kv"><span>Trajeto</span><b>{routePoints.length} pontos válidos</b></div>
          <div className="table-wrap report-table">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Vel.</th>
                  <th>Endereço</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 140).map((row, index) => (
                  <tr key={`${row.id || row.deviceTime || index}-${index}`}>
                    <td>{formatDate(row.deviceTime || row.fixTime || row.serverTime || row.startTime || row.endTime)}</td>
                    <td>{row.speed !== undefined ? formatSpeed(row.speed) : '-'}</td>
                    <td>{row.address || row.startAddress || row.endAddress || `${row.latitude ?? '-'}, ${row.longitude ?? '-'}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 140 && <small className="muted">Mostrando 140 primeiros registros. A exportação CSV inclui todos os registros carregados.</small>}
        </div>
      </div>
    </section>
  );
}

function AssistantReportTable({ rows = [] }) {
  if (!rows.length) return null;
  return (
    <div className="table-wrap report-table assistant-report-table">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Vel.</th>
            <th>Dist.</th>
            <th>Endereco / detalhe</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 80).map((row, index) => (
            <tr key={`${row.id || row.deviceTime || row.startTime || index}-${index}`}>
              <td>{formatDate(row.deviceTime || row.fixTime || row.serverTime || row.startTime || row.endTime)}</td>
              <td>{row.speed !== undefined ? formatSpeed(row.speed) : '-'}</td>
              <td>{formatDistance(row.distance ?? row.totalDistance)}</td>
              <td>{row.address || row.startAddress || row.endAddress || row.type || `${row.latitude ?? '-'}, ${row.longitude ?? '-'}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 80 && <small className="muted">Mostrando 80 primeiros registros. A exportacao inclui todos os dados carregados.</small>}
    </div>
  );
}

function AIAssistantPage({ items, events }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(() => assistantFleetSummary(items, events));
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    if (!question && !rows.length) setAnswer(assistantFleetSummary(items, events));
  }, [items, events, question, rows.length]);

  const runFormalReport = async (prompt) => {
    const item = findVehicleFromText(prompt, items);
    if (!item?.device?.id) {
      setAnswer('Nao encontrei veiculo liberado neste login para gerar o relatorio.');
      return;
    }
    const type = detectReportType(prompt);
    const period = detectPeriodFromText(prompt);
    const query = new URLSearchParams({
      deviceId: String(item.device.id),
      from: isoFromLocalInput(period.from),
      to: isoFromLocalInput(period.to)
    });
    const payload = await request(`/api/traccar/reports/${type}?${query.toString()}`, { timeoutMs: 30000 });
    const nextRows = normalizeReportRows(payload);
    setRows(nextRows);
    setMeta({ type, device: item.device, from: period.from, to: period.to });
    setAnswer([
      `Relatorio ${reportTypeLabel(type)} gerado para ${getVehicleName(item.device)}.`,
      `Periodo: ${period.from} ate ${period.to}.`,
      `Registros encontrados: ${nextRows.length}.`,
      nextRows.length ? 'Use Exportar CSV para baixar os dados.' : 'Nao houve dados para este periodo.'
    ].join('\n'));
  };

  const submitPrompt = async (prompt = question) => {
    const text = String(prompt || '').trim();
    setQuestion(text);
    setMessage('');
    setRows([]);
    setBusy(true);
    try {
      const normalized = normalizeText(text);
      if (!text) {
        setAnswer(assistantFleetSummary(items, events));
      } else if (/relatorio|rota|trajeto|playback|parada|viagem|evento|resumo|km|quilometragem/.test(normalized) && !/personalizado|geral da frota|frota/.test(normalized)) {
        await runFormalReport(text);
      } else if (/personalizado|geral da frota|frota|todos|situacao|situacao geral|status/.test(normalized)) {
        setMeta({ type: 'custom', device: null, from: datetimeLocalValue(), to: datetimeLocalValue() });
        setAnswer(assistantCustomReport(items, events));
      } else {
        const item = findVehicleFromText(text, items);
        setMeta({ type: 'vehicle', device: item?.device || null, from: datetimeLocalValue(), to: datetimeLocalValue() });
        setAnswer(assistantVehicleDetails(item));
      }
    } catch (error) {
      setMessage(`Falha no assistente: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const exportAnswer = () => {
    const ok = downloadText(`rafacar-assistente-${Date.now()}.txt`, answer);
    if (!ok) setMessage('Nao ha resposta para exportar.');
  };

  const exportReport = () => {
    const ok = downloadCsv(`rafacar-${meta?.type || 'relatorio'}-${meta?.device?.id || 'frota'}-${Date.now()}.csv`, rows);
    if (!ok) setMessage('Nao ha dados de relatorio para exportar.');
  };

  const examples = [
    'Resumo geral da frota',
    'Relatorio de rota hoje',
    'Paradas de hoje',
    'Viagens nas ultimas 24 horas',
    'Eventos de hoje',
    'Informacoes CAN e temperatura'
  ];

  return (
    <section className="panel assistant-panel">
      <div className="assistant-header">
        <div>
          <h3>Assistente IA operacional</h3>
          <p className="muted">Consulta apenas os veiculos e eventos liberados para o login atual. Relatorios formais passam pelo proxy autenticado do Traccar.</p>
        </div>
        <Badge tone="good"><ShieldCheck size={14} /> Escopo do usuario</Badge>
      </div>

      <div className="assistant-grid">
        <div className="assistant-composer">
          <label>
            <small>Digite sua duvida ou pedido de relatorio</small>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ex.: gerar rota de hoje do veiculo ABC1234, paradas de ontem, status da frota, temperatura do veiculo..."
            />
          </label>
          <div className="assistant-actions">
            <button className="primary-btn" type="button" onClick={() => submitPrompt()} disabled={busy}>
              <Bot size={17} /> {busy ? 'Analisando...' : 'Perguntar'}
            </button>
            <button className="ghost-btn" type="button" onClick={exportAnswer} disabled={!answer}>
              <Download size={17} /> Exportar TXT
            </button>
            <button className="ghost-btn" type="button" onClick={exportReport} disabled={!rows.length}>
              <FileText size={17} /> Exportar CSV
            </button>
          </div>
          <div className="assistant-suggestions">
            {examples.map((example) => (
              <button key={example} type="button" onClick={() => submitPrompt(example)} disabled={busy}>{example}</button>
            ))}
          </div>
          {message && <div className="error-box">{message}</div>}
        </div>

        <div className="assistant-answer">
          <div className="assistant-answer-head">
            <b>Resposta</b>
            <small>{meta?.device ? getVehicleName(meta.device) : `${items.length} veiculos visiveis`}</small>
          </div>
          <pre>{answer}</pre>
          <AssistantReportTable rows={rows} />
        </div>
      </div>
    </section>
  );
}

function MonitoringPage({ items, config, cameras, setCameras }) {
  const mediaMtxUrl = config?.mediaMtxUrl || config?.monitoring?.mediaMtxUrl || 'http://mtx.getautoflow.com.br';
  const [selectedDeviceId, setSelectedDeviceId] = useState(() => String(items[0]?.device?.id || ''));
  const [form, setForm] = useState({ label: 'Camera principal', streamPath: '', snapshotPath: '', mode: 'image', enabled: true, autoOpen: true });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [evidence, setEvidence] = useState([]);
  const [evidenceBusy, setEvidenceBusy] = useState(false);
  const [evidenceNote, setEvidenceNote] = useState('');
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [cacheKey, setCacheKey] = useState(() => Date.now());

  useEffect(() => {
    if (!selectedDeviceId && items[0]?.device?.id) setSelectedDeviceId(String(items[0].device.id));
  }, [items, selectedDeviceId]);

  const selectedItem = useMemo(() => items.find(({ device }) => Number(device.id) === Number(selectedDeviceId)) || items[0] || null, [items, selectedDeviceId]);
  const configuredCamera = useMemo(() => normalizeArray(cameras).find((camera) => Number(camera.deviceId) === Number(selectedItem?.device?.id)) || null, [cameras, selectedItem]);
  const configuredCount = normalizeArray(cameras).filter((camera) => camera.enabled !== false).length;

  useEffect(() => {
    if (!selectedItem?.device) return;
    const next = configuredCamera || {};
    const fallbackPath = defaultCameraPath(selectedItem.device);
    setForm({
      label: next.label || 'Camera principal',
      streamPath: next.streamPath || fallbackPath,
      snapshotPath: next.snapshotPath || (fallbackPath ? `${fallbackPath}/snapshot.jpg` : ''),
      mode: next.mode || 'image',
      enabled: next.enabled !== false,
      autoOpen: next.autoOpen !== false
    });
    setMessage('');
  }, [configuredCamera, selectedItem]);

  const loadEvidence = useCallback(async () => {
    try {
      const payload = await request('/api/monitoring/evidence');
      setEvidence(normalizeArray(payload.evidence));
    } catch (error) {
      setMessage(`Falha ao carregar evidencias: ${error.message}`);
    }
  }, []);

  useEffect(() => { loadEvidence(); }, [loadEvidence]);

  useEffect(() => {
    if (form.mode !== 'image') return undefined;
    const timer = window.setInterval(() => setCacheKey(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, [form.mode, form.streamPath, form.snapshotPath]);

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const saveCamera = async (event) => {
    event.preventDefault();
    if (!selectedItem?.device?.id) return;
    setBusy(true);
    setMessage('');
    try {
      const payload = await request('/api/monitoring/cameras', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          deviceId: Number(selectedItem.device.id),
          deviceName: getVehicleName(selectedItem.device)
        })
      });
      setCameras(normalizeArray(payload.cameras));
      setMessage('Camera vinculada ao veiculo.');
    } catch (error) {
      setMessage(`Falha ao salvar camera: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const removeCamera = async () => {
    if (!selectedItem?.device?.id) return;
    const confirmed = window.confirm(`Remover camera vinculada a ${getVehicleName(selectedItem.device)}?`);
    if (!confirmed) return;
    setBusy(true);
    setMessage('');
    try {
      const payload = await request(`/api/monitoring/cameras/${selectedItem.device.id}`, { method: 'DELETE' });
      setCameras(normalizeArray(payload.cameras));
      setMessage('Camera removida do veiculo.');
    } catch (error) {
      setMessage(`Falha ao remover camera: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const previewCamera = {
    ...form,
    deviceId: Number(selectedItem?.device?.id || 0),
    deviceName: selectedItem?.device ? getVehicleName(selectedItem.device) : '',
    enabled: form.enabled
  };

  const saveSnapshotEvidence = async () => {
    if (!selectedItem?.device?.id) return;
    setEvidenceBusy(true);
    setMessage('');
    try {
      const body = cameraPayloadForEvidence(previewCamera, selectedItem, mediaMtxUrl, evidenceNote);
      const payload = await request('/api/monitoring/evidence/snapshot', { method: 'POST', body: JSON.stringify(body) });
      setEvidence((current) => [payload.evidence, ...current.filter((item) => item.id !== payload.evidence?.id)]);
      setEvidenceNote('');
      setCacheKey(Date.now());
      setMessage('Evidencia capturada e salva.');
    } catch (error) {
      setMessage(`Falha ao capturar evidencia: ${error.message}`);
    } finally {
      setEvidenceBusy(false);
    }
  };

  const saveManualEvidence = async () => {
    if (!selectedItem?.device?.id) return;
    setEvidenceBusy(true);
    setMessage('');
    try {
      const body = {
        ...cameraPayloadForEvidence(previewCamera, selectedItem, mediaMtxUrl, evidenceNote),
        imageUrl: manualImageUrl || buildMediaMtxUrl(mediaMtxUrl, form.streamPath, { mode: 'image', snapshotPath: form.snapshotPath, cacheKey: Date.now() })
      };
      const payload = await request('/api/monitoring/evidence', { method: 'POST', body: JSON.stringify(body) });
      setEvidence((current) => [payload.evidence, ...current.filter((item) => item.id !== payload.evidence?.id)]);
      setEvidenceNote('');
      setManualImageUrl('');
      setMessage('Registro de evidencia salvo.');
    } catch (error) {
      setMessage(`Falha ao registrar evidencia: ${error.message}`);
    } finally {
      setEvidenceBusy(false);
    }
  };

  const deleteEvidence = async (id) => {
    const confirmed = window.confirm('Remover esta evidencia?');
    if (!confirmed) return;
    try {
      await request(`/api/monitoring/evidence/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setEvidence((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      setMessage(`Falha ao remover evidencia: ${error.message}`);
    }
  };

  if (!items.length) return <div className="warn-box">Nenhum veiculo retornado pelo Traccar.</div>;

  return (
    <section className="panel monitoring-panel">
      <div className="monitoring-title-row">
        <div>
          <h3>Monitoramento e evidencias</h3>
          <p className="muted">MediaMTX: {mediaMtxUrl}</p>
        </div>
        <Badge tone={configuredCount ? 'good' : 'warn'}><Camera size={14} /> {configuredCount} camera(s)</Badge>
      </div>

      {message && <div className={message.startsWith('Falha') ? 'error-box' : 'success-box'}>{message}</div>}

      <div className="monitoring-layout">
        <form className="monitoring-config-panel" onSubmit={saveCamera}>
          <div className="assistant-header">
            <div>
              <h3>Camera por veiculo</h3>
              <p className="muted">{selectedItem?.device ? getVehicleName(selectedItem.device) : '-'}</p>
            </div>
            <Badge tone={form.enabled ? 'good' : 'warn'}>{form.enabled ? 'Ativa' : 'Pausada'}</Badge>
          </div>

          <label>
            <small>Veiculo Traccar</small>
            <select value={String(selectedItem?.device?.id || selectedDeviceId)} onChange={(event) => setSelectedDeviceId(event.target.value)}>
              {items.map(({ device }) => (
                <option key={device.id} value={device.id}>{getVehicleName(device)} - {getVehiclePlate(device) || getVehicleUniqueId(device) || device.id}</option>
              ))}
            </select>
          </label>

          <label>
            <small>Nome da camera</small>
            <input value={form.label} onChange={(event) => updateForm('label', event.target.value)} placeholder="Camera principal" />
          </label>

          <label>
            <small>Caminho de streaming</small>
            <input value={form.streamPath} onChange={(event) => updateForm('streamPath', event.target.value)} placeholder="cliente/veiculo/cam1" />
          </label>

          <label>
            <small>Caminho snapshot/imagem</small>
            <input value={form.snapshotPath} onChange={(event) => updateForm('snapshotPath', event.target.value)} placeholder="cliente/veiculo/cam1/snapshot.jpg" />
          </label>

          <div className="monitoring-mode-row" role="tablist" aria-label="Modo da camera">
            {MEDIA_MODE_OPTIONS.map(({ key, label, icon: Icon }) => (
              <button key={key} type="button" className={form.mode === key ? 'active' : ''} onClick={() => updateForm('mode', key)}>
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>

          <div className="monitoring-toggle-row">
            <label><input type="checkbox" checked={form.enabled} onChange={(event) => updateForm('enabled', event.target.checked)} /> Ativa</label>
            <label><input type="checkbox" checked={form.autoOpen} onChange={(event) => updateForm('autoOpen', event.target.checked)} /> Abrir no mapa</label>
          </div>

          <div className="actions">
            <button className="primary-btn" type="submit" disabled={busy}>
              <Link2 size={16} /> {busy ? 'Salvando...' : 'Vincular camera'}
            </button>
            {configuredCamera && (
              <button className="danger-btn" type="button" onClick={removeCamera} disabled={busy}>
                <Trash2 size={16} /> Remover
              </button>
            )}
          </div>
        </form>

        <div className="monitoring-preview-panel">
          <div className="assistant-header">
            <div>
              <h3>Imagem em tempo real</h3>
              <p className="muted">{form.streamPath || form.snapshotPath || 'sem caminho'}</p>
            </div>
            <button className="ghost-btn" type="button" onClick={() => setCacheKey(Date.now())}>
              <RefreshCw size={16} /> Atualizar
            </button>
          </div>
          <CameraLiveView camera={previewCamera} mediaMtxUrl={mediaMtxUrl} cacheKey={cacheKey} />
          <div className="evidence-capture-grid">
            <label>
              <small>Observacao</small>
              <input value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} placeholder="Resumo da ocorrencia" />
            </label>
            <label>
              <small>URL imagem opcional</small>
              <input value={manualImageUrl} onChange={(event) => setManualImageUrl(event.target.value)} placeholder={buildMediaMtxUrl(mediaMtxUrl, form.streamPath, { mode: 'image', snapshotPath: form.snapshotPath })} />
            </label>
          </div>
          <div className="actions evidence-actions">
            <button className="primary-btn" type="button" onClick={saveSnapshotEvidence} disabled={evidenceBusy || !form.enabled}>
              <ShieldCheck size={16} /> {evidenceBusy ? 'Salvando...' : 'Capturar evidencia'}
            </button>
            <button className="ghost-btn" type="button" onClick={saveManualEvidence} disabled={evidenceBusy || !form.enabled}>
              <FileText size={16} /> Registrar link
            </button>
          </div>
        </div>
      </div>

      <div className="monitoring-camera-strip">
        {normalizeArray(cameras).map((camera) => {
          const item = items.find(({ device }) => Number(device.id) === Number(camera.deviceId));
          return (
            <button type="button" key={camera.deviceId} className="monitoring-camera-chip" onClick={() => setSelectedDeviceId(String(camera.deviceId))}>
              <Camera size={16} />
              <span>
                <b>{camera.label || 'Camera'}</b>
                <small>{item?.device ? getVehicleName(item.device) : camera.deviceName || `Device ${camera.deviceId}`}</small>
              </span>
              <Badge tone={camera.enabled === false ? 'warn' : 'good'}>{camera.enabled === false ? 'Pausada' : camera.mode || 'image'}</Badge>
            </button>
          );
        })}
      </div>

      <div className="evidence-title-row">
        <h3>Evidencias salvas</h3>
        <button className="ghost-btn" type="button" onClick={loadEvidence}><RefreshCw size={16} /> Recarregar</button>
      </div>
      {evidence.length ? (
        <div className="evidence-grid">
          {evidence.map((item) => (
            <article className="evidence-card" key={item.id}>
              <div className="evidence-media">
                {item.imageUrl ? <img src={item.imageUrl} alt={item.title || 'Evidencia'} /> : <FileText size={34} />}
              </div>
              <div className="evidence-body">
                <div className="row-head">
                  <b>{item.title || 'Evidencia'}</b>
                  <button className="icon-only-btn" type="button" title="Remover evidencia" onClick={() => deleteEvidence(item.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
                <small>{item.deviceName || `Device ${item.deviceId || '-'}`} - {formatDate(item.capturedAt || item.createdAt)}</small>
                {item.note && <small>{item.note}</small>}
                {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Origem</a>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="warn-box">Nenhuma evidencia salva ainda.</div>
      )}
    </section>
  );
}


function IntegrationsPage({ config }) {
  const integrations = normalizeArray(config?.integrations || config?.customIntegrations || config?.customerIntegrations);
  const ideas = ['WhatsApp', 'ERP', 'Financeiro', 'CRM', 'Webhooks', 'Aplicativo WebView', 'Alertas personalizados', 'API de terceiros'];
  const notifications = config?.notifications || {};
  const mobile = config?.mobile || {};
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installMessage, setInstallMessage] = useState('');
  const [pushoverMessage, setPushoverMessage] = useState('');
  const [pushoverBusy, setPushoverBusy] = useState(false);

  useEffect(() => {
    const handlePrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setInstallMessage('Pronto para instalar como app no celular.');
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  const installMobileApp = async () => {
    if (!installPrompt) {
      setInstallMessage('No celular, use o menu do navegador e escolha "Adicionar a tela inicial".');
      return;
    }
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    setInstallPrompt(null);
    setInstallMessage(result?.outcome === 'accepted' ? 'App instalado ou instalacao iniciada.' : 'Instalacao cancelada.');
  };

  const testPushover = async () => {
    setPushoverBusy(true);
    setPushoverMessage('');
    try {
      await request('/api/mobile/pushover/test', { method: 'POST', body: JSON.stringify({}) });
      setPushoverMessage('Notificacao Pushover enviada com sucesso.');
    } catch (error) {
      setPushoverMessage(error.message || 'Falha ao enviar teste Pushover.');
    } finally {
      setPushoverBusy(false);
    }
  };

  return (
    <section className="panel integrations-panel">
      <div className="integration-title-row">
        <div>
          <h3>Integracoes e personalizacoes</h3>
          <p className="muted">Modulo reservado para adaptar o painel conforme cada cliente pedir.</p>
        </div>
        <Badge tone={integrations.length ? 'good' : 'warn'}><Zap size={14} /> {integrations.length ? `${integrations.length} ativa(s)` : 'Pronto para crescer'}</Badge>
      </div>

      <div className="mobile-app-grid">
        <div className="integration-item mobile-app-card">
          <b>App para celular</b>
          <small>Instalavel como PWA/WebView, usando o mesmo painel seguro da Railway.</small>
          <div className="actions">
            <button className="primary-btn" type="button" onClick={installMobileApp}>
              <Zap size={16} /> Instalar app
            </button>
          </div>
          <small className="muted">{installMessage || (mobile.serviceWorker ? 'Service worker ativo para instalacao e cache basico.' : 'Service worker pendente.')}</small>
        </div>

        <div className="integration-item mobile-app-card">
          <b>Notificacoes Pushover</b>
          <small>Status: {notifications.pushover?.enabled ? 'Configurado' : 'Aguardando token/user key na Railway'}.</small>
          <div className="integration-status-row">
            <Badge tone={notifications.pushover?.enabled ? 'good' : 'warn'}>{notifications.pushover?.enabled ? 'Pushover OK' : 'Configurar'}</Badge>
            <Badge tone={notifications.pushover?.webhookReady ? 'good' : 'warn'}>{notifications.pushover?.webhookReady ? 'Webhook OK' : 'Webhook pendente'}</Badge>
          </div>
          <div className="actions">
            <button className="ghost-btn" type="button" onClick={testPushover} disabled={pushoverBusy || !notifications.pushover?.enabled}>
              <Send size={16} /> {pushoverBusy ? 'Enviando...' : 'Testar Pushover'}
            </button>
          </div>
          {pushoverMessage && <small className="muted">{pushoverMessage}</small>}
        </div>

        <div className="integration-item mobile-app-card">
          <b>Firebase/FCM</b>
          <small>Preparado para receber a configuracao Web/Firebase sem salvar segredo no repositorio.</small>
          <div className="integration-status-row">
            <Badge tone={notifications.firebase?.webConfigConfigured ? 'good' : 'warn'}>Config Web</Badge>
            <Badge tone={notifications.firebase?.vapidKeyConfigured ? 'good' : 'warn'}>VAPID</Badge>
          </div>
        </div>
      </div>

      {integrations.length ? (
        <div className="integration-grid">
          {integrations.map((item, index) => (
            <div className="integration-item" key={item.id || item.name || index}>
              <b>{item.name || item.label || `Integracao ${index + 1}`}</b>
              <small>{item.description || item.type || 'Personalizacao ativa para este cliente.'}</small>
              <Badge tone={item.enabled === false ? 'warn' : 'good'}>{item.enabled === false ? 'Pausada' : 'Ativa'}</Badge>
            </div>
          ))}
        </div>
      ) : (
        <div className="integration-empty-state">
          <div className="integration-empty-icon"><Zap size={30} /></div>
          <h4>Nenhuma integracao ativa ainda.</h4>
          <p>Este espaco fica preparado para vender e ativar novas conexoes quando o cliente precisar automatizar processos, receber alertas ou conectar o rastreamento com outros sistemas.</p>
          <div className="integration-pill-grid">
            {ideas.map((idea) => <span key={idea}>{idea}</span>)}
          </div>
        </div>
      )}
    </section>
  );
}

function ConfigPage({ config, health, refreshHealth, authUser, onLogout }) {
  return (
    <section className="panel">
      <h3>Configuração e segurança</h3>
      <div className="success-box">Frontend revisado com proxy seguro, rate limit, CSP, timeout, cache control e credenciais fora do React.</div>
      <div className="kv"><span>Servidor Traccar</span><b>{config?.traccarUrl || '-'}</b></div>
      <div className="kv"><span>Servidor MediaMTX</span><b>{config?.mediaMtxUrl || config?.monitoring?.mediaMtxUrl || '-'}</b></div>
      <div className="kv"><span>Cameras cadastradas</span><b>{config?.monitoring?.camerasConfigured ?? '-'}</b></div>
      <div className="kv"><span>Evidencias salvas</span><b>{config?.monitoring?.evidenceCount ?? '-'}</b></div>
      <div className="kv"><span>Modo de autenticação</span><b>{config?.authMode || 'traccar-user-session'}</b></div>
      <div className="kv"><span>Usuário logado</span><b>{authUser?.name || authUser?.email || '-'}</b></div>
      <div className="kv"><span>Perfil admin</span><b>{yesNo(authUser?.administrator)}</b></div>
      <div className="kv"><span>Polling</span><b>{config?.pollingMs || DEFAULT_POLLING_MS} ms</b></div>
      <div className="kv"><span>Autenticado</span><b>{yesNo(config?.authenticated || health?.authenticated)}</b></div>
      <div className="kv"><span>Health</span><b>{health?.ok ? 'OK' : '-'}</b></div>
      <div className="actions" style={{ marginTop: 14 }}>
        <button className="ghost-btn" onClick={refreshHealth}><ShieldCheck size={17} /> Testar health</button>
        <button className="danger-btn" onClick={onLogout}><LogOut size={17} /> Sair</button>
      </div>
    </section>
  );
}

function UserProfilePage({ authUser, onProfileUpdated }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: authUser?.name || '', email: authUser?.email || '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    request('/api/user/profile')
      .then((payload) => {
        if (cancelled) return;
        const user = payload.user || authUser || {};
        setProfile(user);
        setForm({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
      })
      .catch((error) => {
        if (cancelled) return;
        setProfile(authUser || {});
        setForm({ name: authUser?.name || '', email: authUser?.email || '', phone: authUser?.phone || '' });
        setMessage(`Nao foi possivel carregar dados completos do usuario: ${error.message}`);
      })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [authUser]);

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const saveProfile = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const payload = await request('/api/user/profile', { method: 'PUT', body: JSON.stringify(form) });
      const user = payload.user || {};
      setProfile(user);
      setForm({ name: user.name || form.name, email: user.email || form.email, phone: user.phone || form.phone || '' });
      onProfileUpdated?.(user);
      setMessage('Dados do usuario atualizados pelo backend Traccar.');
    } catch (error) {
      setMessage(`Falha ao atualizar usuario: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const attrs = profile?.attributes && typeof profile.attributes === 'object' ? profile.attributes : {};

  return (
    <section className="panel user-profile-panel">
      <div className="assistant-header">
        <div>
          <h3>Usuario logado</h3>
          <p className="muted">Edicao limitada ao proprio usuario autenticado. Permissoes continuam sendo validadas pelo Traccar.</p>
        </div>
        <Badge tone={profile?.administrator ? 'good' : 'info'}>{profile?.administrator ? 'Administrador' : 'Usuario'}</Badge>
      </div>

      {message && <div className={message.startsWith('Falha') || message.startsWith('Nao') ? 'error-box' : 'success-box'}>{message}</div>}

      <form className="form-grid" onSubmit={saveProfile}>
        <label>
          <small>Nome</small>
          <input value={form.name} onChange={(event) => updateField('name', event.target.value)} />
        </label>
        <label>
          <small>E-mail/login</small>
          <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
        </label>
        <label>
          <small>Telefone</small>
          <input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
        </label>
        <div className="full user-permission-grid">
          <Info label="Somente leitura" value={yesNo(profile?.readonly)} />
          <Info label="Dispositivos leitura" value={yesNo(profile?.deviceReadonly)} />
          <Info label="Desativado" value={yesNo(profile?.disabled)} />
          <Info label="ID Traccar" value={profile?.id || authUser?.id || '-'} />
        </div>
        <div className="full">
          <button className="primary-btn" type="submit" disabled={busy}>
            <ShieldCheck size={17} /> {busy ? 'Salvando...' : 'Salvar dados do usuario'}
          </button>
        </div>
      </form>

      <div className="layout user-profile-extra">
        <div>
          <h3>Atributos do usuario</h3>
          <KeyValueTable data={attrs} />
        </div>
        <div>
          <h3>Seguranca</h3>
          <div className="warn-box">Senha e permissoes administrativas nao sao editadas neste painel. Qualquer bloqueio de permissao vem do backend Traccar.</div>
        </div>
      </div>
    </section>
  );
}

function applyFilters(items, search, statusFilter) {
  const term = normalizeText(search);
  return items.filter(({ device, position, category }) => {
    const status = String(device.status || 'unknown').toLowerCase();
    if (statusFilter !== 'all' && status !== statusFilter) return false;
    if (!term) return true;
    const text = normalizeText([
      getVehicleName(device), getVehiclePlate(device), getVehicleUniqueId(device), vehicleLabel(category), position?.address
    ].filter(Boolean).join(' '));
    return text.includes(term);
  });
}



const WHATSAPP_SUPPORT_NUMBER = '17-99609-8315';
const WHATSAPP_SUPPORT_URL = 'https://wa.me/5517996098315';

function WhatsAppIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="whatsapp-svg-icon">
      <path fill="currentColor" d="M16.04 3C9.02 3 3.32 8.58 3.32 15.45c0 2.2.6 4.35 1.73 6.22L3 29l7.55-1.93a12.96 12.96 0 0 0 5.49 1.22c7.02 0 12.73-5.58 12.73-12.45S23.06 3 16.04 3Zm0 22.97c-1.8 0-3.55-.46-5.1-1.34l-.37-.21-4.48 1.15 1.2-4.25-.25-.39a10.04 10.04 0 0 1-1.56-5.48c0-5.59 4.74-10.14 10.56-10.14 5.83 0 10.57 4.55 10.57 10.14 0 5.98-4.74 10.52-10.57 10.52Zm5.78-7.57c-.32-.16-1.88-.91-2.17-1.01-.3-.11-.51-.16-.72.16-.21.31-.82 1.01-1 1.22-.18.21-.37.24-.69.08-.32-.16-1.35-.49-2.58-1.55-.95-.84-1.6-1.87-1.79-2.18-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.55-.08-.16-.72-1.7-.98-2.33-.26-.61-.52-.53-.72-.54h-.61c-.21 0-.55.08-.84.4-.29.32-1.1 1.06-1.1 2.58s1.13 2.99 1.29 3.2c.16.21 2.23 3.34 5.4 4.68.75.32 1.34.51 1.8.65.76.24 1.45.21 1.99.13.61-.09 1.88-.75 2.14-1.48.26-.73.26-1.36.18-1.49-.08-.13-.29-.21-.61-.37Z"/>
    </svg>
  );
}

function BrandLogo({ compact = false }) {
  return (
    <div className={`brand-logo-block ${compact ? 'compact' : ''}`}>
      <span className="brand-logo-mark" aria-label="RAFACAR RASTREADORES">
        <img className="brand-logo-img logo-light-only" src={assetUrl('/brand/rafacar-logo-light-remastered.png')} alt="RAFACAR RASTREADORES" />
        <img className="brand-logo-img logo-dark-only" src={assetUrl('/brand/rafacar-logo-dark-remastered.png')} alt="RAFACAR RASTREADORES" />
      </span>
    </div>
  );
}

function SupportWhatsapp({ compact = false }) {
  return (
    <a className={`whatsapp-support ${compact ? 'compact' : ''}`} href={WHATSAPP_SUPPORT_URL} target="_blank" rel="noreferrer" title="Suporte 24 horas via WhatsApp">
      <WhatsAppIcon size={compact ? 17 : 20} />
      <span>
        <b>Suporte 24 Horas</b>
        <small>WhatsApp {WHATSAPP_SUPPORT_NUMBER}</small>
      </span>
    </a>
  );
}


function LoginPage({ onLogin }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const payload = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: login.trim(), password }) });
      onLogin(payload.user || null, payload.config || null);
    } catch (err) { setError(err.message || 'Falha ao entrar com as credenciais do Traccar.'); }
    finally { setBusy(false); }
  };
  return (
    <div className="login-shell"><div className="login-card">
      <div className="login-brand"><BrandLogo /><p className="login-brand-subtitle">Entre usando as credenciais do Traccar</p></div>
      <form onSubmit={submit} className="login-form">
        <label><small>Usuário ou e-mail Traccar</small><input value={login} onChange={(event) => setLogin(event.target.value)} autoComplete="username" placeholder="usuario@empresa.com ou login" required /></label>
        <label><small>Senha Traccar</small><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Digite sua senha" required /></label>
        {error && <div className="error-box"><b>Login não autorizado:</b> {error}</div>}
        <button className="primary-btn login-submit" disabled={busy} type="submit"><KeyRound size={18} /> {busy ? 'Validando no Traccar...' : 'Entrar no painel'}</button>
      </form>
      <div className="login-support-row"><SupportWhatsapp /></div>
      <div className="login-security"><ShieldCheck size={16} /><span>Sua senha é enviada somente ao backend seguro do RAFACAR, que autentica no Traccar e guarda a sessão em cookie HttpOnly.</span></div>
    </div></div>
  );
}
function AuthLoading() {
  return <div className="login-shell"><div className="login-card compact"><div className="login-brand"><BrandLogo /><p className="login-brand-subtitle">Verificando sessão segura...</p></div></div></div>;
}

function App() {
  const { theme, setTheme } = useTheme();
  const [auth, setAuth] = useState({ loading: true, authenticated: false, user: null });
  const [activeTab, setActiveTab] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('tab');
    return tabs.some(([key]) => key === requested) ? requested : 'dashboard';
  });
  const [devices, setDevices] = useState([]);
  const [positions, setPositions] = useState([]);
  const [events, setEvents] = useState([]);
  const [serverInfo, setServerInfo] = useState(null);
  const [config, setConfig] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fitMap, setFitMap] = useState(true);
  const [focusedVehicleId, setFocusedVehicleId] = useState(null);
  const [layerKey, setLayerKey] = useState(() => localStorage.getItem('traccar-dev-map-layer') || 'googleHybrid');
  const [sidebarHidden, setSidebarHidden] = useState(() => {
    const saved = localStorage.getItem('rafacar-sidebar-hidden');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(max-width: 980px)').matches;
  });
  const [fleetPanelHidden, setFleetPanelHidden] = useState(() => localStorage.getItem('rafacar-fleet-panel-hidden') === 'true');
  const [monitoringCameras, setMonitoringCameras] = useState([]);

  useEffect(() => { localStorage.setItem('traccar-dev-map-layer', layerKey); }, [layerKey]);
  useEffect(() => { localStorage.setItem('rafacar-sidebar-hidden', String(sidebarHidden)); }, [sidebarHidden]);
  useEffect(() => { localStorage.setItem('rafacar-fleet-panel-hidden', String(fleetPanelHidden)); }, [fleetPanelHidden]);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 980px)');
    const syncSidebar = () => { if (query.matches) setSidebarHidden(true); };
    syncSidebar();
    query.addEventListener('change', syncSidebar);
    return () => query.removeEventListener('change', syncSidebar);
  }, []);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    setError('');
    if (!silent) setLoading(true);
    if (silent) setRefreshing(true);
    try {
      const payload = await request(silent ? '/api/snapshot' : '/api/bootstrap');
      setDevices(normalizeArray(payload.devices));
      setPositions(normalizeArray(payload.positions));
      setEvents(normalizeArray(payload.events));
      setServerInfo(payload.server || null);
      setConfig(payload.config || null);
      setLastUpdate(new Date());
      if (payload.errors?.length) setError(payload.errors.join(' | '));
    } catch (err) {
      if (err.status === 401) { setAuth({ loading: false, authenticated: false, user: null }); setError(''); return; }
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refreshHealth = useCallback(async () => {
    try {
      const payload = await request('/api/health');
      setHealth(payload);
    } catch (err) {
      setHealth({ ok: false, error: err.message });
    }
  }, []);

  const loadMonitoringCameras = useCallback(async () => {
    try {
      const payload = await request('/api/monitoring/cameras');
      setMonitoringCameras(normalizeArray(payload.cameras));
    } catch {
      setMonitoringCameras([]);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try { const payload = await request('/api/auth/me'); setAuth({ loading: false, authenticated: true, user: payload.user || null }); setConfig(payload.config || null); }
    catch { setAuth({ loading: false, authenticated: false, user: null }); }
  }, []);
  const handleLogin = useCallback((user, nextConfig) => { setAuth({ loading: false, authenticated: true, user }); setConfig(nextConfig || null); setLoading(true); }, []);
  const handleProfileUpdated = useCallback((user) => {
    setAuth((current) => ({ ...current, user: { ...(current.user || {}), ...(user || {}) } }));
  }, []);
  const handleLogout = useCallback(async () => {
    try { await request('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) }); } catch { /* ignore */ }
    setAuth({ loading: false, authenticated: false, user: null }); setDevices([]); setPositions([]); setEvents([]); setServerInfo(null); setHealth(null); setMonitoringCameras([]); setError(''); setLoading(false);
  }, []);
  useEffect(() => { checkAuth(); }, [checkAuth]);
  useEffect(() => { if (auth.authenticated) { loadData(); refreshHealth(); loadMonitoringCameras(); } }, [auth.authenticated, loadData, refreshHealth, loadMonitoringCameras]);

  usePolling(() => loadData({ silent: true }), Number(config?.pollingMs || DEFAULT_POLLING_MS), auth.authenticated);

  const items = useMemo(() => enrichDevices(devices, positions, events), [devices, positions, events]);
  const filteredItems = useMemo(() => applyFilters(items, search, statusFilter), [items, search, statusFilter]);
  const devicesById = useMemo(() => new Map(devices.map((device) => [Number(device.id), device])), [devices]);

  const stats = useMemo(() => {
    const total = devices.length;
    const online = devices.filter((device) => String(device.status).toLowerCase() === 'online').length;
    const offline = devices.filter((device) => String(device.status).toLowerCase() === 'offline').length;
    const unknown = Math.max(0, total - online - offline);
    return { total, online, offline, unknown, events: events.length };
  }, [devices, events]);

  const title = tabs.find(([key]) => key === activeTab)?.[1] || 'Dashboard';
  const subtitle = serverInfo?.attributes?.title || serverInfo?.attributes?.description || 'Rastreamento em tempo real via Traccar';

  if (auth.loading) return <AuthLoading />;
  if (!auth.authenticated) return <LoginPage onLogin={handleLogin} />;

  return (
    <div className={`app-shell ${activeTab === 'dashboard' ? 'map-app-shell' : 'workspace-shell'} ${sidebarHidden ? 'sidebar-hidden' : ''}`}>
      {!sidebarHidden && (
      <aside className="sidebar">
        <div className="brand brand-company">
          <BrandLogo compact />
          <div className="sidebar-user-row">
            <span className="brand-user">{auth.user?.name || auth.user?.email || 'Usuario Traccar'}</span>
            <button className="sidebar-logout-mini" type="button" onClick={handleLogout} title="Sair">
              <LogOut size={14} />
              <span>Sair</span>
            </button>
          </div>
        </div>
        <nav className="nav">
          {tabs.map(([key, label, Icon]) => (
            <button key={key} className={activeTab === key ? 'active' : ''} onClick={() => setActiveTab(key)}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-status-stack">
          <Badge tone={health?.ok ? 'good' : 'warn'}><ShieldCheck size={14} /> Proxy {health?.ok ? 'OK' : 'verificando'}</Badge>
          <Badge tone="info"><Activity size={14} /> {lastUpdate ? `Atualizado ${formatTime(lastUpdate)}` : 'Sem atualização'}</Badge>
        </div>
        <div className="sidebar-support-row"><SupportWhatsapp compact /></div>
        <div className="sidebar-toolbox">
          <button className="ghost-btn sidebar-control-btn" onClick={() => setSidebarHidden(true)} title="Recolher menu lateral">
            <Layers size={17} /> Recolher
          </button>
          <button className="ghost-btn theme-toggle-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}>
            <Settings size={17} /> {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          </button>
          <button className="primary-btn" onClick={() => loadData({ silent: true })} disabled={refreshing}>
            <RefreshCw size={17} /> {refreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </aside>
      )}

      {sidebarHidden && (
        <div className="floating-icon-rail" aria-label="Menu recolhido">
          <button className="rail-toggle" type="button" title="Mostrar menu lateral" onClick={() => setSidebarHidden(false)}>
            ☰
          </button>
          {tabs.map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              title={label}
              aria-label={label}
              className={activeTab === key ? 'active' : ''}
              onClick={() => setActiveTab(key)}
            >
              <Icon size={19} />
            </button>
          ))}
          <button type="button" title="Atualizar" aria-label="Atualizar" onClick={() => loadData({ silent: true })} disabled={refreshing}>
            <RefreshCw size={19} />
          </button>
          <button type="button" title="Sair" aria-label="Sair" className="danger" onClick={handleLogout}>
            <LogOut size={19} />
          </button>
        </div>
      )}

      <main className={`main ${activeTab === 'dashboard' ? 'map-app-main' : 'workspace-main'}`}>
        <div className="topbar">
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <div className="actions">
            <button className="ghost-btn sidebar-control-btn" onClick={() => setSidebarHidden((value) => !value)} title={sidebarHidden ? 'Mostrar menu lateral' : 'Esconder menu lateral'}>
              <Layers size={17} /> {sidebarHidden ? 'Mostrar menu' : 'Esconder menu'}
            </button>
            <button className="ghost-btn theme-toggle-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}>
              <Settings size={17} /> {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            </button>
            <SupportWhatsapp compact />
            <button className="primary-btn" onClick={() => loadData({ silent: true })} disabled={refreshing}>
              <RefreshCw size={17} /> {refreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
            <button className="danger-btn" onClick={handleLogout}><LogOut size={17} /> Sair</button>
          </div>
        </div>

        {loading && <div className="warn-box">Carregando dados do Traccar...</div>}
        {error && <div className="error-box"><b>Aviso:</b> {error}</div>}

        {activeTab === 'dashboard' && (
          <Dashboard
            items={filteredItems}
            stats={stats}
            layerKey={layerKey}
            setLayerKey={setLayerKey}
            fitMap={fitMap}
            setFitMap={setFitMap}
            search={search}
            setSearch={setSearch}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            fleetPanelHidden={fleetPanelHidden}
            setFleetPanelHidden={setFleetPanelHidden}
            focusedVehicleId={focusedVehicleId}
            setFocusedVehicleId={setFocusedVehicleId}
            monitoringCameras={monitoringCameras}
            mediaMtxUrl={config?.mediaMtxUrl || config?.monitoring?.mediaMtxUrl}
          />
        )}
        {activeTab === 'monitoramento' && <MonitoringPage items={items} config={config} cameras={monitoringCameras} setCameras={setMonitoringCameras} />}
        {activeTab === 'assistente' && <AIAssistantPage items={items} events={events} />}
        {activeTab === 'veiculos' && <VehiclesPage items={filteredItems} />}
        {activeTab === 'eventos' && <EventsPage events={events} devicesById={devicesById} />}
        {activeTab === 'relatorios' && <ReportsPage items={items} layerKey={layerKey} />}
        {activeTab === 'comandos' && <CommandsPage items={items} />}
        {activeTab === 'atributos' && <AttributesPage items={filteredItems} />}
        {activeTab === 'integracoes' && <IntegrationsPage config={config} />}
        {activeTab === 'usuario' && <UserProfilePage authUser={auth.user} onProfileUpdated={handleProfileUpdated} />}
        {activeTab === 'config' && <ConfigPage config={config} health={health} refreshHealth={refreshHealth} authUser={auth.user} onLogout={handleLogout} />}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
