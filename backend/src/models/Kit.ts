import mongoose, { Schema, Document } from 'mongoose';
import { Kit } from '../types/kit.js';

export interface IKitDocument extends Document {
  userId: string;
  kitData: Kit;
  createdAt: Date;
  updatedAt: Date;
}

const KitSchema = new Schema<IKitDocument>(
  {
    userId: { type: String, required: true, index: true },
    kitData: { type: Schema.Types.Mixed, required: true },
  },
  {
    timestamps: true,
  }
);

export const KitModel = mongoose.model<IKitDocument>('Kit', KitSchema);

export interface IUserDocument extends Document {
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const UserModel = mongoose.model<IUserDocument>('User', UserSchema);
