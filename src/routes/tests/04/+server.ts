import { json } from '@sveltejs/kit';
import superjson from 'superjson';

export async function POST({ request }) {
	await sleep(2, 3);
	const dataSuper = await request.text();
	const data = dataSuper ? superjson.parse(dataSuper) : {};
	console.log(data);

	return json(data);
}

function sleep(tMin: number, tMax?: number, inS: boolean = true) {
	tMin = tMin * (inS ? 1000 : 1);
	tMax = tMax ? tMax * (inS ? 1000 : 1) : undefined;
	const s = tMax !== undefined && tMax > tMin ? randInt(tMax, tMin) : tMin;
	return new Promise((resolve) => {
		setTimeout(resolve, s);
	});
}
function randInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
