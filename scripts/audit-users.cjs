const path = require("path");
const { PrismaClient } = require(path.join(__dirname, "../backend/node_modules/@prisma/client"));
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://ghms_user:ghms-local-dev@localhost:3306/ghms?connection_limit=20&pool_timeout=10",
    },
  },
});

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, status: true, department: true },
  });
  console.log("Total users in database:", users.length);
  const byStatus = {};
  const byRole = {};
  for (const u of users) {
    byStatus[u.status] = (byStatus[u.status] || 0) + 1;
    byRole[u.role] = (byRole[u.role] || 0) + 1;
  }
  console.log("User status breakdown:", byStatus);
  console.log("User role breakdown:", byRole);

  const nonActive = users.filter((u) => u.status !== "ACTIVE");
  console.log("Non-active users count:", nonActive.length);
  if (nonActive.length > 0) {
    console.log("Non-active users sample:", JSON.stringify(nonActive, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
