import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import ContextualBalloon from '@ckeditor/ckeditor5-ui/src/panel/balloon/contextualballoon';
import CustomButtonActionsView from './ui/custombuttonactionsview';
import CustomButtonFormView from './ui/custombuttonformview';

import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';
import '../theme/custombuttonelement.css';
import customIcon from '../theme/icons/hand-pointer.svg';
import ClickObserver from '@ckeditor/ckeditor5-engine/src/view/observer/clickobserver';
import clickOutsideHandler from '@ckeditor/ckeditor5-ui/src/bindings/clickoutsidehandler';
import { isCustomButtonElement } from './utils';

/**
 * The custom button UI plugin. It introduces the `'insert custom button'` button.
 *
 * It uses the
 * {@link module:ui/panel/balloon/contextualballoon~ContextualBalloon contextual balloon plugin}.
 *
 * @extends module:core/plugin~Plugin
 */
export default class CustomButtonElementUI extends Plugin {
	/**
	 * @inheritDoc
	 */
	static get requires() {
		return [ ContextualBalloon, CustomButtonFormView, CustomButtonActionsView ];
	}

	/**
	 * @inheritDoc
	 */
	static get pluginName() {
		return 'CustomButtonElementUI';
	}

	init() {
		const editor = this.editor;

		editor.editing.view.addObserver( ClickObserver );

		this.actionsView = this._createActionsView();

		this.formView = this._createFormView();

		this._balloon = this.editor.plugins.get( ContextualBalloon );

		// Create toolbar buttons.
		this._createToolbarCustomButtonButton();

		this._enableUserBalloonInteractions();

		/* Register the "insert custom button" button */
	}

	_showUi() {
		if ( this._balloon.hasView( this.actionsView ) ) {
			this._hideUi();
		}

		this._balloon.add( {
			view: this.actionsView,
			position: this._getBalloonPositionData()
		} );
	}

	_hideUi() {
		if ( !this._isUIInPanel ) {
			return;
		}
		const editor = this.editor;

		this.stopListening( editor.ui, 'update' );
		this.stopListening( this._balloon, 'change:visibleView' );

		// Make sure the focus always gets back to the editable _before_ removing the focused form view.
		// Doing otherwise causes issues in some browsers. See https://github.com/ckeditor/ckeditor5-link/issues/193.
		editor.editing.view.focus();

		// Remove form first because it's on top of the stack.
		this._removeFormView();

		// Then remove the actions view because it's beneath the form.
		this._balloon.remove( this.actionsView );

		// this._hideFakeVisualSelection();
	}

	_createActionsView() {
		const editor = this.editor;
		const actionsView = new CustomButtonActionsView( editor.locale );
		const insertButtonCommand = editor.commands.get( 'insertCustomButtonElement' );
		actionsView.bind( 'href' ).to( insertButtonCommand, 'buttonLink' );
		actionsView.editButtonView.bind( 'isEnabled' ).to( insertButtonCommand );

		this.listenTo( actionsView, 'edit', () => {
			this._addFormView();
		} );

		this.listenTo( editor, 'select', () => {
			this._addFormView();
		} );

		return actionsView;
	}

	_createFormView() {
		const editor = this.editor;
		const customButtonCommand = editor.commands.get( 'insertCustomButtonElement' );

		const formView = new CustomButtonFormView( editor.locale );

		formView.buttonUrlView.fieldView.bind( 'value' ).to( customButtonCommand, 'buttonUrl' );

		// Execute link command after clicking the "Save" button.
		this.listenTo( formView, 'submit', () => {
			const buttonText = formView.buttonTextView.fieldView.element.value;
			const buttonLink = formView.buttonUrlView.fieldView.element.value;
			const buttonWidth = formView.buttonWidthView.fieldView.element.value;
			const buttonTarget = formView.buttonTargetView.fieldView.element.value;
			const buttonAdditionalClasses = formView.buttonAdditionalClassesView.fieldView.element.value;

			editor.execute( 'insertCustomButtonElement', buttonText, buttonLink, buttonWidth, buttonTarget, buttonAdditionalClasses );
			this._closeFormView();
		} );

		// Hide the panel after clicking the "Cancel" button.
		this.listenTo( formView, 'cancel', () => {
			this._closeFormView();
		} );

		// Close the panel on esc key press when the **form has focus**.
		formView.keystrokes.set( 'Esc', ( data, cancel ) => {
			this._closeFormView();
			cancel();
		} );

		return formView;
	}

	_createToolbarCustomButtonButton() {
		const editor = this.editor;
		editor.ui.componentFactory.add( 'customButtonElement', locale => {
			/* Get the insert command for the custom button element */
			const insertCommand = editor.commands.get( 'insertCustomButtonElement' );

			/* Create a new ButtonView instance */
			const buttonView = new ButtonView( locale );

			/* Set the button's properties */
			buttonView.set( {
				label: 'Insert Button',
				withText: false,
				tooltip: true,
				isEnabled: true,
				isOn: true,
				icon: customIcon
			} );

			/* Bind the state of the button to the command */
			buttonView.bind( 'isOn', 'isEnabled' ).to( insertCommand, 'value', 'isEnabled' );

			this.listenTo( buttonView, 'execute', () => {
				this._showUi();
			} );

			return buttonView;
		} );
	}

	_getBalloonPositionData() {
		const view = this.editor.editing.view;
		const viewDocument = view.document;

		const target = view.domConverter.viewRangeToDom( viewDocument.selection.getFirstRange() );

		return { target };
	}

	/**
	 * Attaches actions that control whether the balloon panel containing the
	 * {@link #formView} is visible or not.
	 *
	 * @private
	 */
	_enableUserBalloonInteractions() {
		const viewDocument = this.editor.editing.view.document;

		// Handle click on view document and show panel when selection is placed inside the link element.
		// Keep panel open until selection will be inside the same link element.
		this.listenTo( viewDocument, 'click', () => {
			const parentLink = this._getSelectedCustomButtonElement();

			if ( parentLink ) {
				// Then show panel but keep focus inside editor editable.
				this._showUI();
			}
		} );

		// Focus the form if the balloon is visible and the Tab key has been pressed.
		this.editor.keystrokes.set( 'Tab', ( data, cancel ) => {
			if ( this._areActionsVisible && !this.actionsView.focusTracker.isFocused ) {
				this.actionsView.focus();
				cancel();
			}
		}, {
			// Use the high priority because the link UI navigation is more important
			// than other feature's actions, e.g. list indentation.
			// https://github.com/ckeditor/ckeditor5-link/issues/146
			priority: 'high'
		} );

		// Close the panel on the Esc key press when the editable has focus and the balloon is visible.
		this.editor.keystrokes.set( 'Esc', ( data, cancel ) => {
			if ( this._isUIVisible ) {
				this._hideUi();
				cancel();
			}
		} );

		// Close on click outside of balloon panel element.
		clickOutsideHandler( {
			emitter: this.actionsView,
			activator: () => this._isUIInPanel,
			contextElements: [ this._balloon.view.element ],
			callback: () => this._hideUi()
		} );
	}

	/**
	 * Returns the link {@link module:engine/view/attributeelement~AttributeElement} under
	 * the {@link module:engine/view/document~Document editing view's} selection or `null`
	 * if there is none.
	 *
	 * **Note**: For a non–collapsed selection, the link element is only returned when **fully**
	 * selected and the **only** element within the selection boundaries.
	 *
	 * @private
	 * @returns {module:engine/view/attributeelement~AttributeElement|null}
	 */
	_getSelectedCustomButtonElement() {
		const view = this.editor.editing.view;
		const selection = view.document.selection;

		if ( selection.isCollapsed ) {
			return findCustomButtonElementAncestor( selection.getFirstPosition() );
		} else {
			// The range for fully selected link is usually anchored in adjacent text nodes.
			// Trim it to get closer to the actual link element.
			const range = selection.getFirstRange().getTrimmed();
			const startLink = findCustomButtonElementAncestor( range.start );
			const endLink = findCustomButtonElementAncestor( range.end );

			if ( !startLink || startLink != endLink ) {
				return null;
			}

			// Check if the link element is fully selected.
			if ( view.createRangeIn( startLink ).getTrimmed().isEqual( range ) ) {
				return startLink;
			} else {
				return null;
			}
		}
	}

	_addActionsView() {
		if ( this._areActionsInPanel ) {
			return;
		}

		this._balloon.add( {
			view: this.actionsView,
			position: this._getBalloonPositionData()
		} );
	}

	/**
	 * Adds the {@link #formView} to the {@link #_balloon}.
	 *
	 * @protected
	 */
	_addFormView() {
		if ( this._isFormInPanel ) {
			return;
		}

		const editor = this.editor;
		const linkCommand = editor.commands.get( 'insertCustomButtonElement' );

		this._balloon.add( {
			view: this.formView,
			position: this._getBalloonPositionData()
		} );

		// Select input when form view is currently visible.
		if ( this._balloon.visibleView === this.formView ) {
			this.formView.buttonTextView.fieldView.select();
		}

		// Make sure that each time the panel shows up, the URL field remains in sync with the value of
		// the command. If the user typed in the input, then canceled the balloon (`urlInputView.fieldView#value` stays
		// unaltered) and re-opened it without changing the value of the link command (e.g. because they
		// clicked the same link), they would see the old value instead of the actual value of the command.
		// https://github.com/ckeditor/ckeditor5-link/issues/78
		// https://github.com/ckeditor/ckeditor5-link/issues/123
		this.formView.buttonUrlView.fieldView.element.value = linkCommand.buttonUrl || '';
		this.formView.buttonTextView.fieldView.element.value = linkCommand.buttonText || '';
		this.formView.buttonTargetView.fieldView.element.value = linkCommand.buttonTarget || '';
		this.formView.buttonWidthView.fieldView.element.value = linkCommand.buttonWidth || '';
		this.formView.buttonAdditionalClassesView.fieldView.element.value = linkCommand.buttonAdditionalClasses || '';
	}

	/**
	 * Returns `true` when {@link #actionsView} is in the {@link #_balloon}.
	 *
	 * @readonly
	 * @protected
	 * @type {Boolean}
	 */
	get _areActionsInPanel() {
		return this._balloon.hasView( this.actionsView );
	}

	/**
	 * Returns `true` when {@link #actionsView} is in the {@link #_balloon} and it is
	 * currently visible.
	 *
	 * @readonly
	 * @protected
	 * @type {Boolean}
	 */
	get _areActionsVisible() {
		return this._balloon.visibleView === this.actionsView;
	}

	/**
	 * Returns `true` when {@link #actionsView} or {@link #formView} is in the {@link #_balloon}.
	 *
	 * @readonly
	 * @protected
	 * @type {Boolean}
	 */
	get _isUIInPanel() {
		return this._isFormInPanel || this._areActionsInPanel;
	}

	/**
	 * Returns `true` when {@link #actionsView} or {@link #formView} is in the {@link #_balloon} and it is
	 * currently visible.
	 *
	 * @readonly
	 * @protected
	 * @type {Boolean}
	 */
	get _isUIVisible() {
		const visibleView = this._balloon.visibleView;

		return visibleView == this.formView || this._areActionsVisible;
	}

	get _isFormInPanel() {
		return this._balloon.hasView( this.formView );
	}

	/**
	 * Closes the form view. Decides whether the balloon should be hidden completely or if the action view should be shown. This is
	 * decided upon the link command value (which has a value if the document selection is in the link).
	 *
	 * Additionally, if any {@link module:link/link~LinkConfig#decorators} are defined in the editor configuration, the state of
	 * switch buttons responsible for manual decorator handling is restored.
	 *
	 * @private
	 */
	_closeFormView() {
		const linkCommand = this.editor.commands.get( 'insertCustomButtonElement' );

		// Restore manual decorator states to represent the current model state. This case is important to reset the switch buttons
		// when the user cancels the editing form.
		// linkCommand.restoreManualDecoratorStates();

		if ( linkCommand.value !== undefined ) {
			this._removeFormView();
		} else {
			this._hideUi();
		}
	}

	/**
	 * Removes the {@link #formView} from the {@link #_balloon}.
	 *
	 * @protected
	 */
	_removeFormView() {
		if ( this._isFormInPanel ) {
			// Blur the input element before removing it from DOM to prevent issues in some browsers.
			// See https://github.com/ckeditor/ckeditor5/issues/1501.
			this.formView.saveButtonView.focus();

			this._balloon.remove( this.formView );

			// Because the form has an input which has focus, the focus must be brought back
			// to the editor. Otherwise, it would be lost.
			this.editor.editing.view.focus();

			// this._hideFakeVisualSelection();
		}
	}
}

// Returns a custom button element if there's one among the ancestors of the provided `Position`.
//
// @private
// @param {module:engine/view/position~Position} View position to analyze.
// @returns {module:engine/view/attributeelement~AttributeElement|null} Link element at the position or null.
function findCustomButtonElementAncestor( position ) {
	return position.getAncestors().find( ancestor => isCustomButtonElement( ancestor ) );
}
