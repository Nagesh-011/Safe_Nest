import { Capacitor } from '@capacitor/core';

const Plugin: any = (Capacitor as any).Plugins?.GoogleFit || (window as any).GoogleFit || null;

export const hasPermissions = async (): Promise<boolean> => {
  if (!Plugin) return false;
  const res = await Plugin.hasPermissions();
  return res?.hasPermissions === true;
};

export const requestPermissions = async (): Promise<boolean> => {
  if (!Plugin) return false;
  const res = await Plugin.requestPermissions();
  return res?.started === true;
};

export const ensureSubscriptions = async (): Promise<boolean> => {
  if (!Plugin) return false;
  try {
    await Plugin.ensureSubscriptions();
    return true;
  } catch (e) {
    return false;
  }
};

export const getVitals = async (): Promise<{steps: number; heartRate: number | null; calories: number; distanceMeters: number} | null> => {
  if (!Plugin) return null;
  try {
    const res = await Plugin.getVitals();
    return {
      steps: res.steps || 0,
      heartRate: (res.heartRate === null || res.heartRate === undefined) ? null : Number(res.heartRate),
      calories: res.calories ? Number(res.calories) : 0,
      distanceMeters: res.distanceMeters ? Number(res.distanceMeters) : 0
    };
  } catch (e) {
    return null;
  }
};

export default { hasPermissions, requestPermissions, ensureSubscriptions, getVitals };