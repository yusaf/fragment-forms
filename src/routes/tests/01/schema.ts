import { z } from 'zod';
export default z.object({
	name: z.object({
		first: z.string().min(3),
		last: z.string().min(4)
	}),
	children: z.array(
		z.object({
			name: z.string().min(3)
		})
	),
	agree: z.boolean()
});
