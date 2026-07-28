// Gerege Template Platform V3.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Аппын жижиг төлөвийг (цонхны байрлал, сонгосон сервер) userData/state.json-д
// хадгална. Гуравдагч сан ашиглахгүй — бүтэц нь энгийн JSON.

import { app } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { DesktopState } from './config';

let cache: DesktopState | null = null;

function statePath(): string {
  return path.join(app.getPath('userData'), 'state.json');
}

export function readState(): DesktopState {
  if (cache) return cache;
  try {
    const raw = readFileSync(statePath(), 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    cache = parsed && typeof parsed === 'object' ? (parsed as DesktopState) : {};
  } catch {
    // Анхны ажиллагаа эсвэл эвдэрсэн файл — хоосноос эхэлнэ.
    cache = {};
  }
  return cache;
}

export function writeState(patch: Partial<DesktopState>): void {
  const next: DesktopState = { ...readState(), ...patch };
  cache = next;
  try {
    writeFileSync(statePath(), JSON.stringify(next, null, 2), 'utf8');
  } catch {
    // Диск бичигдэхгүй байх нь аппыг унагаах шалтгаан биш — чимээгүй алгасна.
  }
}
