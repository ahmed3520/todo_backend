import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type QueryWithHelpers,
  Types,
} from 'mongoose';

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = ['waiting', 'inprogress', 'finished'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  userId: Types.ObjectId;
  image?: string;
  title: string;
  desc?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export type TaskDocument = HydratedDocument<Task>;

export interface TaskQueryHelpers {
  notDeleted(this: QueryWithHelpers<TaskDocument[], TaskDocument, TaskQueryHelpers>): QueryWithHelpers<TaskDocument[], TaskDocument, TaskQueryHelpers>;
}

export type TaskModelType = Model<Task, TaskQueryHelpers>;

type TaskTransform = Task & {
  _id: Types.ObjectId;
  id?: string;
  __v?: number;
};

export type TaskResponse = Omit<TaskTransform, '_id' | '__v'>;

const TaskSchema = new Schema<Task, TaskModelType, {}, TaskQueryHelpers>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    image: {
      type: String,
      trim: true,
      maxlength: 500,
      validate: {
        validator: (value: string) => !value || /^https?:\/\/.+/.test(value),
        message: 'Image must be a valid URL',
      },
    },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    desc: { type: String, trim: true },
    priority: { type: String, enum: TASK_PRIORITIES, default: 'low' },
    status: { type: String, enum: TASK_STATUSES, default: 'waiting' },
    dueDate: { type: Date },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
    versionKey: '__v',
    toJSON: {
      virtuals: true,
      transform: (_doc: TaskDocument, ret: TaskTransform): TaskResponse => {
        const { _id: _omit, __v: _version, ...rest } = ret;
        return rest;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc: TaskDocument, ret: TaskTransform): TaskResponse => {
        const { _id: _omit, __v: _version, ...rest } = ret;
        return rest;
      },
    },
  }
);

TaskSchema.virtual('id').get(function (this: TaskDocument) {
  return this._id.toString();
});

TaskSchema.virtual('isOverdue').get(function (this: TaskDocument) {
  return this.dueDate ? new Date() > this.dueDate && this.status !== 'finished' : false;
});

TaskSchema.query.notDeleted = function (this: QueryWithHelpers<TaskDocument[], TaskDocument, TaskQueryHelpers>) {
  return this.where({ deletedAt: null });
};

TaskSchema.index({ userId: 1, createdAt: -1 });
TaskSchema.index({ userId: 1, deletedAt: 1, createdAt: -1 });
export const TaskModel = model<Task, TaskModelType>('Task', TaskSchema);
