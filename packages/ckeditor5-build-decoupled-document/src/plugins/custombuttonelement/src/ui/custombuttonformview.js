import View from '@ckeditor/ckeditor5-ui/src/view';
import ViewCollection from '@ckeditor/ckeditor5-ui/src/viewcollection';

import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';
import LabeledFieldView from '@ckeditor/ckeditor5-ui/src/labeledfield/labeledfieldview';
import { createLabeledDropdown, createLabeledInputText } from '@ckeditor/ckeditor5-ui/src/labeledfield/utils';
import submitHandler from '@ckeditor/ckeditor5-ui/src/bindings/submithandler';
import FocusTracker from '@ckeditor/ckeditor5-utils/src/focustracker';
import FocusCycler from '@ckeditor/ckeditor5-ui/src/focuscycler';
import KeystrokeHandler from '@ckeditor/ckeditor5-utils/src/keystrokehandler';

import checkIcon from '@ckeditor/ckeditor5-core/theme/icons/check.svg';
import cancelIcon from '@ckeditor/ckeditor5-core/theme/icons/cancel.svg';

/**
 * The custom button actions view class. This view allows to add a custom button.
 *
 * @extends module:ui/view~View
 */
export default class CustomButtonFormView extends View {
	/**
	 * @inheritDoc
	 */
	constructor( locale ) {
		super( locale );

		const t = locale.t;

		/**
		 * Tracks information about DOM focus in the actions.
		 *
		 * @readonly
		 * @member {module:utils/focustracker~FocusTracker}
		 */
		this.focusTracker = new FocusTracker();

		/**
		 * An instance of the {@link module:utils/keystrokehandler~KeystrokeHandler}.
		 *
		 * @readonly
		 * @member {module:utils/keystrokehandler~KeystrokeHandler}
		 */
		this.keystrokes = new KeystrokeHandler();

		/**
		 * The unlink button view.
		 *
		 * @member {module:ui/button/buttonview~ButtonView}
		 */

		this.buttonTextView = this.createInputTextView( 'Button Text' );

		this.buttonTextRowView = new RowView( this.locale, [ this.buttonTextView ] );

		this.buttonUrlView = this.createInputTextView( 'Button URL' );
		this.buttonUrlRowView = new RowView( this.locale, [ this.buttonUrlView ] );

		this.buttonWidthView = this.createInputTextView( 'Width in %' );
		this.buttonWidthRowView = new RowView( this.locale, [ this.buttonWidthView ] );

		this.buttonAlignmentView = this.createInputTextView( 'Button Alignment' );
		this.buttonAlignmentRowView = new RowView( this.locale, [ this.buttonAlignmentView ] );

		this.buttonTargetView = this.createInputTextView( 'Target' );
		this.buttonTargetRowView = new RowView( this.locale, [ this.buttonTargetView ] );

		this.buttonAdditionalClassesView = this.createInputTextView( 'Additional Classes' );
		this.buttonAdditionalClassesRowView = new RowView( this.locale, [ this.buttonAdditionalClassesView ] );

		this.saveButtonView = this._createButton( t( 'Save' ), checkIcon, 'ck-button-save' );
		this.saveButtonView.type = 'submit';
		this.cancelButtonView = this._createButton( t( 'Cancel' ), cancelIcon, 'ck-button-cancel', 'cancel' );

		this.buttonView = new RowView( this.locale, [ this.saveButtonView, this.cancelButtonView ] );

		/**
		 * The edit link button view.
		 *
		 * @member {module:ui/button/buttonview~ButtonView}
		 */

		/**
		 * A collection of views that can be focused in the view.
		 *
		 * @readonly
		 * @protected
		 * @member {module:ui/viewcollection~ViewCollection}
		 */
		this._focusables = new ViewCollection();

		/**
		 * Helps cycling over {@link #_focusables} in the view.
		 *
		 * @readonly
		 * @protected
		 * @member {module:ui/focuscycler~FocusCycler}
		 */
		this._focusCycler = new FocusCycler( {
			focusables: this._focusables,
			focusTracker: this.focusTracker,
			keystrokeHandler: this.keystrokes,
			actions: {
				// Navigate fields backwards using the Shift + Tab keystroke.
				focusPrevious: 'shift + tab',

				// Navigate fields forwards using the Tab key.
				focusNext: 'tab'
			}
		} );

		this.setTemplate( {
			tag: 'form',

			attributes: {
				class: [
					'ck'
				],

				// https://github.com/ckeditor/ckeditor5-link/issues/90
				tabindex: '-1'
			},

			children: [
				this.buttonTextRowView,
				this.buttonUrlRowView,
				this.buttonWidthRowView,
				this.buttonAlignmentRowView,
				this.buttonTargetRowView,
				this.buttonAdditionalClassesRowView,
				this.buttonView
			]
		} );
	}

	/**
	 * @inheritDoc
	 */
	render() {
		super.render();

		submitHandler( {
			view: this
		} );

		const childViews = [
			this.buttonTextRowView,
			this.buttonUrlRowView,
			this.buttonWidthRowView,
			this.buttonAlignmentRowView,
			this.buttonTargetRowView,
			this.buttonAdditionalClassesRowView,
			this.saveButtonView,
			this.cancelButtonView
		];

		childViews.forEach( v => {
			if ( v.inputView ) {
				// Register the view as focusable.
				this._focusables.add( v.inputView );
				// Register the view in the focus tracker.
				this.focusTracker.add( v.inputView.element );
			} else {
				// Register the view as focusable.
				this._focusables.add( v );
				// Register the view in the focus tracker.
				this.focusTracker.add( v.element );
			}
		} );

		// Start listening for the keystrokes coming from #element.
		this.keystrokes.listenTo( this.element );
	}

	/**
	 * Focuses the fist {@link #_focusables} in the actions.
	 */
	focus() {
		this._focusCycler.focusFirst();
	}

	/**
	 * Creates a button view.
	 *
	 * @private
	 * @param {String} label The button label.
	 * @param {String} icon The button icon.
	 * @param {String} [eventName] An event name that the `ButtonView#execute` event will be delegated to.
	 * @returns {module:ui/button/buttonview~ButtonView} The button view instance.
	 */
	_createButton( label, icon, className, eventName ) {
		const button = new ButtonView( this.locale );

		button.set( {
			label,
			icon,
			tooltip: true
		} );

		button.extendTemplate( {
			attributes: {
				class: className
			}
		} );

		if ( eventName ) {
			button.delegate( 'execute' ).to( this, eventName );
		}

		return button;
	}

	createInputTextView( fieldName, placeholder ) {
		const t = this.locale.t;
		const labeledInput = new LabeledFieldView( this.locale, createLabeledInputText );
		labeledInput.label = t( fieldName );
		labeledInput.fieldView.placeholder = placeholder;
		return labeledInput;
	}

	createInputSelectView( fieldName, options = [] ) {
		const t = this.locale.t;
		const labeledInput = new LabeledFieldView( this.locale, createLabeledDropdown );
		labeledInput.label = t( fieldName );
		labeledInput.fieldView.options = options;
		labeledInput.fieldView.placeholder = fieldName;
		return labeledInput;
	}
}

class RowView extends View {
	constructor( locale, children ) {
		super( locale );

		this.children = children;

		this.setTemplate( {
			tag: 'div',
			children: this.children
		} );
	}
}

/**
 * Fired when the form view is submitted (when one of the children triggered the submit event),
 * for example with a click on {@link #saveButtonView}.
 *
 * @event submit
 */

/**
 * Fired when the form view is canceled, for example with a click on {@link #cancelButtonView}.
 *
 * @event cancel
 */
