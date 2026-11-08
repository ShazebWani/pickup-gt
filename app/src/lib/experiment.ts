// Sprint 4 court label A/B test (see server/src/services/experiment.ts).
// The server assigns A or B from a hash of the uid. Moderators can override
// the variant and turn on session mode from Profile > Testing; both settings
// stay on the device only.
import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { auth } from './firebase';

export type LabelVariant = 'A' | 'B';
// off: real court data. reports / empty: fixed session screens (fresh and
// stale courts, or a gym with no reports) for moderated sessions.
export type SessionMode = 'off' | 'reports' | 'empty';

const OVERRIDE_KEY = 'pgt.labelVariantOverride';
const SESSION_KEY = 'pgt.sessionMode';

interface State {
  assigned: { uid: string; variant: LabelVariant } | null;
  override: LabelVariant | null;
  sessionMode: SessionMode;
}

let state: State = { assigned: null, override: null, sessionMode: 'off' };
const listeners = new Set<() => void>();
function update(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Same FNV-1a hash as the server, used only if the API can't be reached.
export function localVariantFor(uid: string): LabelVariant {
  let hash = 0x811c9dc5;
  for (let i = 0; i < uid.length; i++) {
    hash ^= uid.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % 2 === 0 ? 'A' : 'B';
}

let settingsLoaded = false;
let fetchingFor: string | null = null;
async function load() {
  if (!settingsLoaded) {
    settingsLoaded = true;
    try {
      const [o, s] = await Promise.all([AsyncStorage.getItem(OVERRIDE_KEY), AsyncStorage.getItem(SESSION_KEY)]);
      update({
        override: o === 'A' || o === 'B' ? o : null,
        sessionMode: s === 'reports' || s === 'empty' ? s : 'off',
      });
    } catch {
      // Storage is a convenience for moderators; defaults are fine.
    }
  }
  const uid = auth.currentUser?.uid;
  if (!uid || state.assigned?.uid === uid || fetchingFor === uid) return;
  fetchingFor = uid;
  try {
    const { variant } = await api.myVariant();
    update({ assigned: { uid, variant } });
  } catch {
    update({ assigned: { uid, variant: localVariantFor(uid) } });
  } finally {
    fetchingFor = null;
  }
}

export async function setVariantOverride(override: LabelVariant | null) {
  update({ override });
  try {
    if (override) await AsyncStorage.setItem(OVERRIDE_KEY, override);
    else await AsyncStorage.removeItem(OVERRIDE_KEY);
  } catch { /* in-memory value still applies */ }
}

export async function setSessionMode(sessionMode: SessionMode) {
  update({ sessionMode });
  try {
    await AsyncStorage.setItem(SESSION_KEY, sessionMode);
  } catch { /* in-memory value still applies */ }
}

export function useLabelExperiment() {
  const s = useSyncExternalStore(subscribe, () => state);
  const uid = auth.currentUser?.uid ?? null;
  useEffect(() => { void load(); }, [uid]);
  const assigned = s.assigned && s.assigned.uid === uid ? s.assigned.variant : uid ? localVariantFor(uid) : 'A';
  return {
    variant: (s.override ?? assigned) as LabelVariant,
    assigned,
    override: s.override,
    sessionMode: s.sessionMode,
  };
}
