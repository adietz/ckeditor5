import Command from '@ckeditor/ckeditor5-core/src/command';

export default class InsertCustomButtonElementCommand extends Command {
	execute( buttonText, buttonLink, buttonWidth, buttonAlignment, buttonTarget, buttonAdditionalClasses ) {
		this.editor.model.change( writer => {
			this.editor.model.insertContent( this.createCustomButtonElement( writer, buttonText, buttonLink, buttonWidth, buttonAlignment, buttonTarget, buttonAdditionalClasses ) ); //eslint-disable-line
		} );
	}

	refresh() {
		const model = this.editor.model;

		/* Get actual selection (selected range, or cursor position) */
		const selection = model.document.selection;

		/* Get allowed parent, defined in the editing class */
		const allowedIn = model.schema.findAllowedParent( selection.getFirstPosition(), 'ButtonFrame' );

		/* Set enabled state */
		this.isEnabled = allowedIn !== null;
	}

	createCustomButtonElement( writer, buttonText, buttonLink, buttonWidth, buttonAlignment, buttonTarget, buttonAdditionalClasses ) {
		const ButtonFrame = writer.createElement( 'ButtonFrame', {
			href: buttonLink,
			width: buttonWidth,
			target: buttonTarget,
			alignment: buttonAlignment,
			class: `custom-button ${ buttonAdditionalClasses }`
		} );

		// append text to the button
		writer.append( buttonText, ButtonFrame );

		return ButtonFrame;
	}
}
