export const urlOkLocal = (v: string) => v.trim() === "" || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v.trim());
