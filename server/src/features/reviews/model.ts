import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/** One review per completed booking. */
const reviewSchema = new Schema(
  {
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    provider: { type: Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
    client: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    serviceName: { type: String },
    proReply: {
      text: String,
      repliedAt: Date,
    },
  },
  { timestamps: true },
);

export type Review = InferSchemaType<typeof reviewSchema>;
export type ReviewDoc = HydratedDocument<Review>;
export const ReviewModel = model('Review', reviewSchema);

/** Cached AI summary, regenerated only when new reviews arrive. */
const reviewSummarySchema = new Schema(
  {
    provider: { type: Schema.Types.ObjectId, ref: 'Provider', required: true, unique: true },
    summary: { type: Schema.Types.Mixed, required: true },
    reviewsCount: { type: Number, required: true },
    lastReviewAt: { type: Date },
  },
  { timestamps: true },
);

export const ReviewSummaryModel = model('ReviewSummary', reviewSummarySchema);
