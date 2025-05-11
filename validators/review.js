import { z } from 'zod';

const reviewValid = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email format'),
  rating: z.number().min(1).max(5),
  comment: z.string().min(5, 'Comment must be at least 5 characters long'),
});

export default reviewValid;