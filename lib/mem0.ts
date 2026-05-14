import { MemoryClient } from 'mem0ai';

const mem0ApiKey = process.env.MEM0_API_KEY;

export const mem0 = new MemoryClient({
    apiKey: mem0ApiKey
});
