export const withRetry = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimit = error?.message?.includes('Rate limit') || 
                         error?.response?.status === 429;
      
      if (isRateLimit && i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
};

export const staggeredApiCalls = async (calls, delayBetween = 100) => {
  const results = [];
  for (const call of calls) {
    results.push(await call());
    if (delayBetween > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBetween));
    }
  }
  return results;
};