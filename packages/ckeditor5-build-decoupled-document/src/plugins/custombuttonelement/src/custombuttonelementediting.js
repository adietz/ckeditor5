import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import Widget from '@ckeditor/ckeditor5-widget/src/widget';
import InsertCustomButtonElementCommand from './custombuttonelementcommand';
import ContextualBalloon from '@ckeditor/ckeditor5-ui/src/panel/balloon/contextualballoon';
import { toWidget } from '@ckeditor/ckeditor5-widget/src/utils';

export default class CustomButtonElementEditing extends Plugin {
	static get requires() {
		return [
			Widget, ContextualBalloon
		];
	}

	init() {
		/* Define the schema structure */
		this._defineSchema();

		/* Define the converters for the schema */
		this._defineConverters();

		/* Register insertion command */
		this.editor.commands.add( 'insertCustomButtonElement', new InsertCustomButtonElementCommand( this.editor ) );
	}

	_defineSchema() {
		const schema = this.editor.model.schema;
		schema.register( 'ButtonFrame', {
			isObject: true,
			allowIn: '$root',
			allowContentOf: '$block',
			allowAttributes: [ 'href', 'width', 'style', 'target', 'buttonAlignment', 'additionalClasses' ],
			isBlock: true
		} );
	}

	_defineConverters() {
		const conversion = this.editor.conversion;

		/* Containing wrapper */
		// upcast: translates view when button is already in editor html
		conversion.for( 'upcast' ).elementToElement( {
			view: 'button',
			model: ( viewElement, modelWriter ) => {
				if ( viewElement.hasClass( 'custom-button' ) ) {
					const classes = viewElement.getAttribute( 'class' ).split( ' ' );
					const additionalClasses = classes.filter( a => !a.startsWith( 'custom-button' ) ).join( ' ' );

					let alignment = '';
					classes.forEach( a => {
						if ( a.startsWith( 'custom-button-align-' ) ) {
							alignment = a.replace( 'custom-button-align-', '' );
						}
					} );

					const element = modelWriter.writer.createElement( 'ButtonFrame', {
						href: viewElement.getAttribute( 'href' ),
						width: viewElement.getAttribute( 'width' ),
						target: viewElement.getAttribute( 'target' ),
						additionalClasses,
						buttonAlignment: alignment
					} );

					return element;
				}
			}
		} );

		// // Adds a conversion dispatcher for the data downcast pipeline only.
		// conversion.for( 'dataDowncast' ).elementToElement( {
		// 	model: 'ButtonFrame',
		// 	view: ( modelElement, viewWriter ) => {
		// 		if ( modelElement.name == 'ButtonFrame' ) {
		// 			const href = modelElement.getAttribute( 'href' );
		// 			const target = modelElement.getAttribute( 'target' );
		// 			const additionalClasses = modelElement.getAttribute( 'additionalClasses' );
		// 			const frame = viewWriter.writer.createContainerElement( 'button', {
		// 				class: 'button' + ' ' + additionalClasses,
		// 				href,
		// 				target
		// 			} );
		// 			return frame;
		// 		}
		// 	}
		// } );

		// Adds a conversion dispatcher for the editing downcast pipeline only.
		// conversion.for( 'editingDowncast' ).elementToElement( {
		conversion.for( 'downcast' ).elementToElement( {
			model: 'ButtonFrame',
			view: ( modelElement, viewWriter ) => {
				const href = modelElement.getAttribute( 'href' );
				const target = modelElement.getAttribute( 'target' );
				const width = modelElement.getAttribute( 'width' );
				const alignment = modelElement.getAttribute( 'buttonAlignment' );
				const additionalClasses = modelElement.getAttribute( 'additionalClasses' );
				const frame = viewWriter.writer.createContainerElement( 'button', {
					class: `custom-button custom-button-align-${ alignment } ${ additionalClasses }`,
					href,
					target,
					style: `width: ${ width || 50 }%;`
				} );

				return toWidget( frame, viewWriter.writer, {
					label: 'Custom Button Element Widget'
				} );
			}

		} );
	}
}
