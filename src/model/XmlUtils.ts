export const parseXml = (raw: string) => new DOMParser().parseFromString(raw, 'application/xml');
