import bcrypt from 'bcrypt';
import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  Types,
} from 'mongoose';

export const LEVELS = ['fresh', 'junior', 'midLevel', 'senior'] as const;
export type UserLevel = (typeof LEVELS)[number];

export interface User {
  phone: string;
  password: string;
  displayName: string;
  experienceYears: number;
  address?: string;
  level: UserLevel;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export type UserModel = Model<User, {}, UserMethods>;

export type UserDocument = HydratedDocument<User, UserMethods>;

type UserTransform = Omit<User, 'password'> & {
  password?: string;
  _id: Types.ObjectId;
  id?: string;
  __v?: number;  
};
export type UserResponse = Omit<UserTransform, '_id' | 'password' | '__v'>;

const phoneValidator = {
  validator: (value: string) => /^\+?[1-9]\d{9,14}$/.test(value),
  message: 'Phone must be 10-15 digits, optionally starting with +',
};

const UserSchema = new Schema<User, UserModel, UserMethods>(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      validate: phoneValidator,
    },
    password: { type: String, required: true, select: false, minlength: 8, maxlength: 100 },
    displayName: { type: String, required: true, trim: true, maxlength: 100 },
    experienceYears: { type: Number, default: 0, min: 0 },
    address: { type: String, trim: true },
    level: { type: String, enum: LEVELS, default: 'fresh' },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
    versionKey: '__v',
    toJSON: {
      virtuals: true,
      transform: (_doc: UserDocument, ret: UserTransform): UserResponse => {
        const { _id: _omit, password: _pw, __v: _version, ...rest } = ret;
        return rest;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc: UserDocument, ret: UserTransform): UserResponse => {
        const { _id: _omit, password: _pw, __v: _version, ...rest } = ret;
        return rest;
      },
    },
  }
);

UserSchema.virtual('id').get(function (this: UserDocument) {
  return this._id.toString();
});

UserSchema.pre('save', async function (this: UserDocument, next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = function (this: UserDocument, candidatePassword: string) {
  if (!this.password) {
    return Promise.resolve(false);
  }

  return bcrypt.compare(candidatePassword, this.password);
};

export const UserModel = model<User, UserModel>('User', UserSchema);
