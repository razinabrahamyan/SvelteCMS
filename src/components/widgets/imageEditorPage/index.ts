import type { Display } from '../types';
export default ({
	db_fieldName,
	display,
	fields
}: {
	db_fieldName: string;
	display?: Display;
	fields: Array<any>;
}) => {
	const uploader = fields.find((x) => (x.upload = true));
	if (!display)
		display = async (data: any, field: any, entry: any) =>
			`<img class='max-w-[200px] inline-block' src="${uploader.path}/${entry['Name']}" />`;

	const field: any = { schema: {}, db_fieldName, upload: true, fields, display };
	field.schema[db_fieldName] = {
		originalname: 'string',
		encoding: 'string',
		mimetype: 'string',
		size: 'number',
		filename: 'string',
		alt: 'string'
	};
	field.widget = async () => {
		// @ts-ignore
		return (await import('./ImageEditorPage.svelte')).default;
	};
	return field;
};
