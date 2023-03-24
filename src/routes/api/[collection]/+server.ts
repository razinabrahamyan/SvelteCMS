import type { RequestHandler } from './$types';
import { collections } from '$src/lib/utils/db';
import { parse, saveFiles } from '$src/lib/utils/utils';
import { createCanvas, Image } from 'canvas';
import sharp from 'sharp';
import { Buffer } from 'node:buffer';

export const GET: RequestHandler = async ({ params, url }) => {
	const page = parseInt(url.searchParams.get('page') as string) || 1;
	const collection = collections[params.collection];
	const length = parseInt(url.searchParams.get('length') as string) || Infinity;
	const skip = (page - 1) * length;

	return new Response(
		JSON.stringify({
			entryList: await collection.find().skip(skip).limit(length).sort({ updatedAt: 'desc' }),
			totalCount: await collection.countDocuments()
		})
	);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const collection = collections[params.collection];
	const data = await request.formData();
	let formData: any = {};
	for (const key of data.keys()) {
		try {
			formData[key] = JSON.parse(data.get(key) as string);
		} catch (e) {
			formData[key] = data.get(key) as string;
		}
	}
	const _id = data.get('_id');
	formData = parse(formData);
	const files = saveFiles(data, params.collection);

	return new Response(
		JSON.stringify(await collection.updateOne({ _id }, { ...formData, ...files }, { upsert: true }))
	);
};

export const POST: RequestHandler = async ({ params, request }) => {
	const collection = collections[params.collection];
	const data = await request.formData();
	const body: any = {};
	body['files'] = [];
	for (const key of data.keys()) {
		console.log(key, 'key');
		try {
			body[key] = JSON.parse(data.get(key) as string);
		} catch (e) {
			body[key] = data.get(key) as string;
			if (data.get(key)?.name) body.files.push(data.get(key));
		}
	}

	if (body.crop_left) {
		const canvas = createCanvas(+body.width, +body.height);
		const ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, body.width, body.height);
		const _files = request.files || [];
		for (const file of _files) {
			const { buffer, fieldname, ...meta } = file;

			const blur_areas: any = [];
			for (const el of body.blur_areas) {
				let top = Math.floor(
					Math.sin(+body.rotate * (Math.PI / 180)) *
						((body.width * body.rotateScale - body.width) / 2) +
						Math.cos(+body.rotate * (Math.PI / 180)) *
							((body.height * body.rotateScale - body.height) / 2) -
						+el.top
				);
				let left = Math.floor(
					Math.cos(+body.rotate * (Math.PI / 180)) *
						((body.width * body.rotateScale - body.width) / 2) +
						Math.sin(+body.rotate * (Math.PI / 180)) *
							((body.height * body.rotateScale - body.height) / 2) -
						+el.left
				);
				top = Math.abs(top);
				left = Math.abs(left);
				if (+body.rotate >= 270) {
					left = Math.abs(body.width - left - el.width);
				} else if (+body.rotate >= 180) {
					top = Math.abs(body.height - top - el.height);
					left = Math.abs(body.width - left - el.width);
				} else if (+body.rotate >= 90) {
					top = Math.abs(body.height - top - el.height);
				}
				if (top + +el.height > +body.height) {
					top -= top + +el.height - body.height;
				}
				if (left + +el.width > +body.width) {
					left -= left + +el.width - body.width;
				}
				const blurArea = await sharp(buffer)
					.extract({ left: left, top: top, width: +el.width, height: +el.height })
					.blur(10)
					.toBuffer();
				blur_areas.push({
					image: blurArea,
					left: left,
					top: top,
					width: +el.width,
					height: +el.height
				});
			}
			const mainImage = new Image();

			mainImage.onload = function () {
				ctx.drawImage(mainImage, 0, 0, +body.width, +body.height);
			};

			mainImage.src = buffer;

			for (const el of blur_areas) {
				const image = new Image();
				image.onload = function () {
					ctx.drawImage(image, +el.left, +el.top, +el.width, +el.height);
				};
				image.src = el.image;
			}

			await sharp(canvas.toBuffer())
				.extract({
					left: +body.crop_left,
					top: +body.crop_top,
					width: body.width - body.crop_right - body.crop_left,
					height: body.height - body.crop_bottom - body.crop_top
				})
				.rotate(+body.rotate)
				.toFile('media/image_array/' + body.name + '.webp');
		}

		const collection = collections[params.collection];
		if (!collection) return 'collection not found!!';
		return new Response(
			JSON.stringify(
				await collection.insertMany({
					Name: body.name,
					'Multi Image Array': {
						originalname: body.name + '.webp',
						mimetype: 'image/webp'
					}
				})
			)
		);
	}

	if (!collection) return new Response('collection not found!!');

	const files = saveFiles(request, params.collection);

	return new Response(JSON.stringify(await collection.insertMany({ ...body, ...files })));
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	const collection = collections[params.collection];
	const data = await request.formData();

	let ids = data.get('ids') as string;
	ids = JSON.parse(ids);
	//.log(ids);
	// console.log(typeof ids);

	return new Response(
		JSON.stringify(
			await collection.deleteMany({
				_id: {
					$in: ids
				}
			})
		)
	);
};
