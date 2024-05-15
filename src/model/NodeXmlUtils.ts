import { JSDOM } from 'jsdom';

export const parseXml = (raw: string) => new (new JSDOM("")).window.DOMParser().parseFromString(raw, 'application/xml');
