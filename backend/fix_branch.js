const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const user = await prisma.user.findFirst({ where: { email: 'jane@dashel.com' } });
  console.log('User branchId:', user?.branchId);
  
  const branches = await prisma.branch.findMany();
  console.log('Branches:', branches.map(b => ({ id: b.id, name: b.name })));
  
  if (branches.length > 0 && user?.branchId !== branches[0].id) {
    await prisma.user.update({
      where: { id: user.id },
      data: { branchId: branches[0].id }
    });
    console.log('Fixed user branchId to:', branches[0].id);
  }
  
  const invCount = await prisma.inventory.count();
  console.log('Inventory records:', invCount);
  
  await prisma.();
}

fix().catch(console.error);
