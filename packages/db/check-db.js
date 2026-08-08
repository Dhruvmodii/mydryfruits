const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.product
  .count()
  .then((c) => {
    console.log("count", c);
    return p.$disconnect();
  })
  .catch(async (e) => {
    console.error(e.message);
    await p.$disconnect();
    process.exit(1);
  });
