const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findFirst({ where: { email: 'jane@dashel.com' } });
  const branchId = user?.branchId;
  console.log('Your branch ID:', branchId);
  
  const products = await prisma.product.findMany();
  const inventory = await prisma.inventory.findMany({ where: { branchId } });
  
  console.log('Products:', products.length);
  console.log('Inventory records for your branch:', inventory.length);
  console.log('Missing:', products.length - inventory.length);
  
  await prisma['']();
}

check().catch(console.error);
