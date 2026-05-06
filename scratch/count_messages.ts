import { prismaShard1, prismaShard2, prismaShard3, prismaShard4 } from "./lib/prisma";

async function run() {
  const shards = [prismaShard1, prismaShard2, prismaShard3, prismaShard4];
  for (const [i, s] of shards.entries()) {
    if (!s) continue;
    try {
        const count = await (s as any).chatMessage.count();
        console.log(`Shard ${i+1} count: ${count}`);
        if (count > 0) {
          const sample = await (s as any).chatMessage.findFirst();
          console.log(`Sample from Shard ${i+1}:`, JSON.stringify(sample, null, 2));
        }
    } catch (e: any) {
        console.error(`Error on shard ${i+1}: ${e.message}`);
    }
  }
  process.exit(0);
}
run();
