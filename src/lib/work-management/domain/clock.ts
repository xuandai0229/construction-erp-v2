export interface Clock { now(): Date; }
export const systemClock: Clock = { now: () => new Date() };
export const fixedClock = (now: Date): Clock => ({ now: () => new Date(now.getTime()) });
