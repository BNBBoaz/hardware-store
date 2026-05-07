const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  const user = await prisma.user.findFirst({ where: { email: 'jane@dashel.com' } });
  const branchId = user?.branchId;
  
  if (!branchId) {
    console.log('User has no branchId!');
    return;
  }
  
  console.log('Seeding inventory for branch:', branchId);
  
  const products = await prisma.product.findMany();
  console.log('Found', products.length, 'products');
  
  let created = 0;
  for (const p of products) {
    const existing = await prisma.inventory.findFirst({
      where: { productId: p.id, branchId: branchId }
    });
    
    if (!existing) {
      await prisma.inventory.create({
        data: {
          productId: p.id,
          branchId: branchId,
          quantity: p.initialStock || 100,
          reorderLevel: p.reorderLevel || 10,
        }
      });
      created++;
    }
  }
  
  console.log('Created', created, 'inventory records');
  await prisma['']();
}

seed().catch(console.error);