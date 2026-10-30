export const generateId = () => Math.random().toString(36).substring(2, 9);

export const truncateString = (str: string, num: number) => {
  if (str.length <= num) return str;
  return str.slice(0, num) + '...';
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
