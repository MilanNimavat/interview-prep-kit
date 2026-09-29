import mongoose from 'mongoose';
import { KitModel, UserModel } from '../models/Kit.js';
import { Kit } from '../types/kit.js';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
}

export interface KitRecord {
  id: string;
  userId: string;
  kitData: Kit;
  createdAt: Date;
  updatedAt: Date;
}

let isMongoConnected = false;

// In-memory fallback storage maps
const inMemoryUsers = new Map<string, UserRecord>();
const inMemoryKits = new Map<string, KitRecord>();

/**
 * Connects to MongoDB if MONGODB_URI is set. If connection fails or URI is omitted,
 * gracefully falls back to the in-memory store.
 */
export async function initDatabase(): Promise<boolean> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.warn('[Database] MONGODB_URI not set. Using in-memory database store.');
    isMongoConnected = false;
    return false;
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2500,
    });
    isMongoConnected = true;
    console.log('[Database] Connected to MongoDB successfully.');
    return true;
  } catch (err: any) {
    console.warn(
      `[Database] MongoDB connection failed (${err.message}). Falling back to in-memory store.`
    );
    isMongoConnected = false;
    return false;
  }
}

export function getIsMongoConnected(): boolean {
  return isMongoConnected;
}

// User DAO methods
export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const lowerEmail = email.toLowerCase().trim();
  if (isMongoConnected) {
    const doc = await UserModel.findOne({ email: lowerEmail });
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      email: doc.email,
      passwordHash: doc.passwordHash,
      name: doc.name,
      createdAt: doc.createdAt,
    };
  } else {
    for (const u of inMemoryUsers.values()) {
      if (u.email === lowerEmail) return u;
    }
    return null;
  }
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  if (isMongoConnected) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await UserModel.findById(id);
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      email: doc.email,
      passwordHash: doc.passwordHash,
      name: doc.name,
      createdAt: doc.createdAt,
    };
  } else {
    return inMemoryUsers.get(id) || null;
  }
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  name: string;
}): Promise<UserRecord> {
  const email = data.email.toLowerCase().trim();
  if (isMongoConnected) {
    const doc = await UserModel.create({
      email,
      passwordHash: data.passwordHash,
      name: data.name,
    });
    return {
      id: doc._id.toString(),
      email: doc.email,
      passwordHash: doc.passwordHash,
      name: doc.name,
      createdAt: doc.createdAt,
    };
  } else {
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const record: UserRecord = {
      id,
      email,
      passwordHash: data.passwordHash,
      name: data.name,
      createdAt: new Date(),
    };
    inMemoryUsers.set(id, record);
    return record;
  }
}

// Kit DAO methods
export async function findKitsByUserId(userId: string): Promise<KitRecord[]> {
  if (isMongoConnected) {
    const docs = await KitModel.find({ userId }).sort({ createdAt: -1 });
    return docs.map((doc) => ({
      id: doc._id.toString(),
      userId: doc.userId,
      kitData: doc.kitData,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  } else {
    const userKits: KitRecord[] = [];
    for (const kit of inMemoryKits.values()) {
      if (kit.userId === userId) {
        userKits.push(kit);
      }
    }
    return userKits.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export async function findKitById(id: string): Promise<KitRecord | null> {
  if (isMongoConnected) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await KitModel.findById(id);
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      kitData: doc.kitData,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  } else {
    return inMemoryKits.get(id) || null;
  }
}

export async function saveKit(userId: string, kitData: Kit): Promise<KitRecord> {
  if (isMongoConnected) {
    const doc = await KitModel.create({
      userId,
      kitData,
    });
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      kitData: doc.kitData,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  } else {
    const id = `kit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date();
    const record: KitRecord = {
      id,
      userId,
      kitData,
      createdAt: now,
      updatedAt: now,
    };
    inMemoryKits.set(id, record);
    return record;
  }
}

export async function updateKit(
  id: string,
  userId: string,
  kitData: Kit
): Promise<KitRecord | null> {
  if (isMongoConnected) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await KitModel.findOneAndUpdate(
      { _id: id, userId },
      { kitData },
      { new: true }
    );
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      kitData: doc.kitData,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  } else {
    const existing = inMemoryKits.get(id);
    if (!existing || existing.userId !== userId) return null;
    const updated: KitRecord = {
      ...existing,
      kitData,
      updatedAt: new Date(),
    };
    inMemoryKits.set(id, updated);
    return updated;
  }
}

export async function deleteKit(id: string, userId: string): Promise<boolean> {
  if (isMongoConnected) {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const res = await KitModel.deleteOne({ _id: id, userId });
    return res.deletedCount > 0;
  } else {
    const existing = inMemoryKits.get(id);
    if (!existing || existing.userId !== userId) return false;
    return inMemoryKits.delete(id);
  }
}
