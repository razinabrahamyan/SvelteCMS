import widgets from '../components/widgets';
import type { Schema } from './types';

const schema: Schema = {
	// collection Name and Icon
	name: 'Image Editor',
	icon: 'bi:images',
	status: 'published',

	// collection fields from available widgets
	fields: [
		widgets.ImageEditorPage({
			db_fieldName: 'Image',
			fields: [
				widgets.ImageEditor({ db_fieldName: 'Multi Image Array', path: 'media/image_array' })
			]
		})
	]
};

export default schema;
