/**
 * Creates MongoDB indexes for optimal query performance.
 * Run with: npx tsx scripts/create-indexes.ts
 */

import { MongoClient, ServerApiVersion } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function createIndexes() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI not found in environment");
  }

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("tmap");
    const restaurants = db.collection("restaurants");

    // Compound index on latitude and longitude for fast bounding box queries
    // This index dramatically speeds up the nearby-count API
    const result = await restaurants.createIndex(
      { latitude: 1, longitude: 1 },
      { name: "geo_lat_lng", background: true }
    );
    console.log(`Created index: ${result}`);

    // List all indexes to verify
    const indexes = await restaurants.indexes();
    console.log("\nCurrent indexes on restaurants collection:");
    indexes.forEach((idx) => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log("\nIndex creation complete!");
  } finally {
    await client.close();
  }
}

createIndexes().catch(console.error);
