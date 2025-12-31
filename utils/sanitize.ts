export const sanitizeForLog = (input: any): string => {
  if (typeof input !== 'string') {
    input = String(input);
  }
  return input.replace(/[\r\n\t\x00-\x1f\x7f-\x9f]/g, '');
};

export const sanitizeForHTML = (input: string): string => {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  return url.startsWith('data:image/') || (url.startsWith('https://') && !url.includes('javascript:'));
};