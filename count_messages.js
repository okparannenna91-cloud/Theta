const { prismaShard1, prismaShard2, prismaShard3, prismaShard4 } = require("./lib/prisma");

async function run() {
  const shards = [prismaShard1, prismaShard2, prismaShard3, prismaShard4];
  for (let i = 0; i < shards.length; i++) {
    const s = shards[i];
    if (!s) continue;
    try {
        const count = await s.chatMessage.count();
        console.log(`Shard ${i+1} count: ${count}`);
        if (count > 0) {
          const sample = await s.chatMessage.findFirst();
          console.log(`Sample from Shard ${i+1}:`, JSON.stringify(sample, null, 2));
        }
    } catch (e) {
        console.error(`Error on shard ${i+1}: ${e.message}`);
    }
  }
  process.exit(0);
}
run();
