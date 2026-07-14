const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testOrder() {
  // Get the first real restaurant
  const rest = await prisma.restaurant.findFirst({ where: { status: 'APPROVED' } });
  if (!rest) return console.log("No restaurant");
  
  // Get its owner to use as a client (since we need a user id)
  const user = await prisma.user.findFirst();
  
  // Get a product
  const product = await prisma.product.findFirst({ where: { restaurantId: rest.id } });
  if (!product) return console.log("No product");

  console.log("Creating order for rest:", rest.id, "product:", product.id);

  try {
    const order = await prisma.order.create({
      data: {
        orderType: 'DELIVERY',
        status: 'PENDING',
        clientId: user.id,
        restaurantId: rest.id,
        paymentMethod: 'CASH',
        deliveryAddress: "Calle de prueba",
        totalAmount: 15.00,
        items: {
          create: [
            {
              productId: product.id,
              quantity: 1,
              price: 15.00
            }
          ]
        }
      }
    });
    console.log("Order created!", order.id);
  } catch (err) {
    console.error("Failed to create order:", err.message);
  }
}

testOrder().finally(() => prisma.$disconnect());
