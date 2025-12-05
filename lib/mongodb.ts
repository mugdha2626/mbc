import { MongoClient, ServerApiVersion, Db } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your MongoDB URI to .env.local");
}

const uri = process.env.MONGODB_URI;
const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false, // Changed to false to avoid strict mode issues
    deprecationErrors: false, // Changed to false to avoid deprecation errors
  },
  connectTimeoutMS: 10000, // 10 second connection timeout
  socketTimeoutMS: 45000, // 45 second socket timeout
  serverSelectionTimeoutMS: 10000, // 10 second server selection timeout
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 1, // Maintain at least 1 socket connection
  retryWrites: true,
  retryReads: true,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // In development, use a global variable to preserve the client across hot reloads
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect().catch((error) => {
      // Clear the promise on error so we can retry
      globalWithMongo._mongoClientPromise = undefined;
      console.error("MongoDB connection error:", error);
      throw error;
    });
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production, create a new client
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

// Helper to get the database
export async function getDb(): Promise<Db> {
  try {
    const client = await clientPromise;
    return client.db("tmap");
  } catch (error) {
    console.error("MongoDB getDb error:", error);
    throw error;
  }
}
