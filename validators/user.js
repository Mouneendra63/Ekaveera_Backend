import { z } from 'zod';

 const userValid = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  age: z.string().min(1, 'Age must be a non-negative number'),
  email: z.string().email('Invalid email format'),
  phno: z.string().min(10, 'Phone number must be at least 10 digits'),
  address: z.string().min(5, 'Address is too short'),
  sex: z.enum(['Male', 'Female', 'Other'], {
    errorMap: () => ({ message: 'Sex must be Male, Female, or Other' }),
  }),
  medicalConcern: z.array(z.string()).optional(),
});

export default userValid;