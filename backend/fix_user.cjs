const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const user = await prisma.user.findFirst({ where: { email: 'jane@dashel.com' } });
  console.log('User ID:', user?.id);
  console.log('Current branchId:', user?.branchId);
  
  const branches = await prisma.branch.findMany();
  console.log('Available branches:', branches.map(b => ({ id: b.id, name: b.name })));
  
  if (branches.length > 0 && !user?.branchId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { branchId: branches[0].id }
    });
    console.log('Assigned branch:', branches[0].id);
  }
  
  await prisma.();
}

fix().catch(console.error);
