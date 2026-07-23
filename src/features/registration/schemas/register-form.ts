import { z } from 'zod';

export const registerFormSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().min(1).optional(),
  accessibility: z.string().trim().min(1).optional(),
  dietary: z.string().trim().min(1).optional(),
  organization: z.string().trim().min(1).optional(),
  role: z.string().trim().min(1).optional(),
  networkingOptIn: z.boolean().default(false),
});

export type RegisterFormValues = z.infer<typeof registerFormSchema>;

const optional = (value: FormDataEntryValue | null): string | undefined => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > 0 ? text : undefined;
};

export const parseRegisterForm = (data: FormData) =>
  registerFormSchema.safeParse({
    name: String(data.get('name') ?? ''),
    email: String(data.get('email') ?? ''),
    phone: optional(data.get('phone')),
    organization: optional(data.get('organization')),
    role: optional(data.get('role')),
    networkingOptIn: data.get('networkingOptIn') === 'on',
    accessibility: optional(data.get('accessibility')),
    dietary: optional(data.get('dietary')),
  });
