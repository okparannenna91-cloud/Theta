import { MemoryClient } from 'mem0ai';

let _mem0: MemoryClient | null = null;

function createMem0Client(): MemoryClient | null {
    const apiKey = process.env.MEM0_API_KEY;
    if (!apiKey) return null;
    return new MemoryClient({ apiKey });
}

export const mem0 = new Proxy({} as MemoryClient, {
    get(_, prop) {
        if (!_mem0) {
            _mem0 = createMem0Client();
        }
        if (!_mem0) {
            const noop = async () => {};
            if (prop === 'add') return noop;
            return noop;
        }
        return Reflect.get(_mem0, prop, _mem0);
    }
});
