// Definición de Tipos (Schema)
const typeDefs = `
  type Location {
    coordinates: [[[Float]]]
  }

  type PointLocation {
    coordinates: [Float]
  }

  type TimeSlot {
    startTime: String
    endTime: String
  }

  type OpeningTime {
    day: String
    times: [TimeSlot]
  }

  type RestaurantPreview {
    _id: String
    name: String
    image: String
    logo: String
    slug: String
    shopType: String
    minimumOrder: Float
    deliveryTime: Int
    location: PointLocation
    reviewAverage: Float
    cuisines: [String]
    openingTimes: [OpeningTime]
    isAvailable: Boolean
    isActive: Boolean
  }

  type RestaurantCarouselPreview {
    _id: String
    name: String
    image: String
    logo: String
    slug: String
    shopType: String
    minimumOrder: Float
    deliveryTime: Int
    location: PointLocation
    reviewAverage: Float
    cuisines: [String]
    openingTimes: [OpeningTime]
    isAvailable: Boolean
    isActive: Boolean
  }

  type NearByRestaurantsResponse {
    restaurants: [RestaurantPreview]
  }

  type Configuration {
    _id: String
    currency: String
    currencySymbol: String
    deliveryRate: Float
    twilioEnabled: Boolean
    webClientID: String
    googleMapsApiKey: String
    webAmplitudeApiKey: String
    googleMapLibraries: String
    googleColor: String
    webSentryUrl: String
    publishableKey: String
    clientId: String
    skipEmailVerification: Boolean
    skipMobileVerification: Boolean
    costType: String
    firebaseKey: String
    authDomain: String
    projectId: String
    storageBucket: String
    msgSenderId: String
    appId: String
  }

  type Zone {
    _id: String
    title: String
    description: String
    location: Location
    isActive: Boolean
  }

  type SubCategory {
    _id: String
    title: String
    parentCategoryId: String
  }

  type Query {
    configuration: Configuration
    zones: [Zone]
    subCategories: [SubCategory]
    nearByRestaurantsPreview(latitude: Float, longitude: Float, page: Int, limit: Int, shopType: String): NearByRestaurantsResponse
    recentOrderRestaurantsPreview(latitude: Float, longitude: Float): [RestaurantCarouselPreview]
    mostOrderedRestaurantsPreview(latitude: Float, longitude: Float, page: Int, limit: Int, shopType: String): [RestaurantCarouselPreview]
    restaurantAdminDashboard(restaurantId: String!): Configuration
  }
`;

// Resolvers
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['error'] });

// Función de utilidad para proteger resolvers en GraphQL
const checkRestaurantOwnership = async (context, restaurantId) => {
  if (!context.user) throw new Error("Acceso Denegado: Usuario no autenticado.");
  
  const dbUser = await prisma.user.findUnique({ where: { email: context.user.email } });
  
  if (!dbUser || dbUser.role === 'CLIENT') {
    throw new Error("403 Forbidden: Los clientes no pueden consultar datos administrativos.");
  }
  
  if (dbUser.role === 'RESTAURANT_OWNER') {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant || restaurant.ownerId !== dbUser.id) {
      throw new Error("403 Forbidden: No eres el dueño de este restaurante.");
    }
  }
  // Si es ADMIN, tiene acceso total
  return dbUser;
};

const resolvers = {
  Query: {
    // Ejemplo de resolver protegido estrictamente
    restaurantAdminDashboard: async (_, { restaurantId }, context) => {
      await checkRestaurantOwnership(context, restaurantId);
      // Retornar datos privados...
      return { status: "Acceso Permitido", restaurantId };
    },
    configuration: () => ({
      _id: "config-1",
      currency: "USD",
      currencySymbol: "$",
      deliveryRate: 2.5,
      twilioEnabled: false,
      skipEmailVerification: true,
      skipMobileVerification: true,
      costType: "fixed"
    }),
    zones: () => ([
      {
        _id: "zone-1",
        title: "Zona Global",
        description: "Cubrimos todo el mundo",
        location: {
          // Un polígono gigante para que cualquier dirección (como Algeciras) caiga dentro.
          coordinates: [ [ [ -180, -90 ], [ 180, -90 ], [ 180, 90 ], [ -180, 90 ], [ -180, -90 ] ] ]
        },
        isActive: true
      }
    ]),
    subCategories: () => ([]),
    recentOrderRestaurantsPreview: async (_, args, context) => {
      // Reutilizamos la misma consulta para mantenerlo simple por ahora
      const res = await resolvers.Query.nearByRestaurantsPreview(_, args, context);
      return res.restaurants;
    },
    mostOrderedRestaurantsPreview: async (_, args, context) => {
      // Reutilizamos la misma consulta para mantenerlo simple por ahora
      const res = await resolvers.Query.nearByRestaurantsPreview(_, args, context);
      return res.restaurants;
    },
    nearByRestaurantsPreview: async (_, args, context) => {
      // Extraemos los restaurantes reales de PostgreSQL!
      try {
        const resultado = await context.db.query('SELECT * FROM restaurantes ORDER BY id ASC');
        
        // Mapear los datos de PostgreSQL a lo que espera GraphQL de Enatega
        const restaurantsFormated = resultado.rows.map(row => ({
          _id: row.id.toString(), // GraphQL suele pedir string o ID
          name: row.nombre,
          image: row.imagen_url,
          logo: row.imagen_url, // Asumimos misma imagen para logo
          slug: row.nombre.toLowerCase().replace(/ /g, '-'),
          shopType: "restaurant",
          minimumOrder: 10,
          deliveryTime: 30,
          location: { coordinates: [0, 0] },
          reviewAverage: 4.5,
          cuisines: ["General", "Delicioso"],
          openingTimes: [],
          isAvailable: true,
          isActive: true
        }));

        return {
          restaurants: restaurantsFormated
        };
      } catch (error) {
        console.error("Error obteniendo restaurantes:", error);
        return { restaurants: [] };
      }
    }
  }
};

module.exports = { typeDefs, resolvers };
