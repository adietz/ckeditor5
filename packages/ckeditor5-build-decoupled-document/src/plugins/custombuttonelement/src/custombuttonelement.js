import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import CustomButtonElementEditing from './custombuttonelementediting';
import CustomButtonElementUI from './custombuttonelementui';

/**
 * The custom button plugin.
 *
 * This is a "glue" plugin that loads the
 * {@link module:link/custombuttonelementediting~CustomButtonElementEditing custom button editing feature}
 * and {@link module:link/custombuttonelementui~CustomButtonElementUI custom button UI feature}.
 *
 * @extends module:core/plugin~Plugin
 */
export default class CustomButtonElement extends Plugin {
	static get requires() {
		return [ CustomButtonElementEditing, CustomButtonElementUI ];
	}

	static get pluginName() {
		return 'CustomButtonElement';
	}
}
