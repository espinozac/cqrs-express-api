import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const products = [
    { sku: "WIDGET-001", name: "Standard Widget", description: "A reliable widget.", price: 19.99, stock: 100 },
    { sku: "GADGET-100", name: "Pro Gadget", description: "A more capable gadget.", price: 49.5, stock: 40 },
    { sku: "GIZMO-777", name: "Deluxe Gizmo", description: "Top of the line.", price: 129.0, stock: 5 },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      create: product,
      update: {},
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded ${products.length} products.`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
