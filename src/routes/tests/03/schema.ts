import { z } from 'zod';

const requiredString = z.string().nonempty('Required');

export default z
	.object({
		id: requiredString,
		username: requiredString.min(3),
		password: requiredString.min(6),
		confirm_password: requiredString.min(6),
		user: z.object({
			name: z.object({
				first: requiredString.min(4),
				last: requiredString.min(4)
			}),
			sex: z.enum(['male', 'female']),
			dob: z.date(),
			interests: z.array(z.string()).min(1),
			contact: z.array(z.enum(['sms', 'email', 'letter'])).min(1),
			consent: z.boolean()
		}),
		secrets: z.array(requiredString.min(2)),
		do: z.object({
			you: z.object({
				agree: z.boolean()
			})
		})
	})
	.refine((data) => data.password !== data.confirm_password, {
		message: 'Passwords do not match',
		path: ['confirm_password']
	});
