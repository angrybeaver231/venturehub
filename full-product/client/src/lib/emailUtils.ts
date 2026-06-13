export function isEmailContentEmpty(content: string): boolean {
  if (!content || content.trim().length === 0) {
    return true;
  }
  
  const textOnly = content
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, '')
    .trim();
  
  return textOnly.length === 0;
}
