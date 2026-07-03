export function serializePrisma<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(serializePrisma) as T;
  }
  
  // Handle Date
  if (obj instanceof Date) {
    return obj.toISOString() as T;
  }
  
  // Handle Decimal (has s, e, d properties usually, or toString)
  if ('d' in obj && 'e' in obj && 's' in obj && typeof (obj as any).toString === 'function') {
    return (obj as any).toNumber ? (obj as any).toNumber() : Number(String(obj)) as T;
  }

  // Handle BigInt
  if (typeof obj === 'bigint') {
    return String(obj) as T;
  }
  
  const res: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      res[key] = serializePrisma((obj as any)[key]);
    }
  }
  return res as T;
}
