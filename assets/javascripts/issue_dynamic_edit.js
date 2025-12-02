/*
 * OPTIONS DEFINED FROM CONFIGURATION FILE
 */
window.issueDynamicEditConfig = $.extend({
	  force_https: false,
	  display_edit_icon: "single",
	  listener_type_value: "click",
	  listener_type_icon: "none",
	  listener_target: "value",
	  excluded_field_id: [],
	  check_issue_update_conflict: false,
	  issue_id: null,
	  project_id: null,
	  comments_in_reverse_order: false,
	  conflict_title: "Conflict detected",
	  conflict_txt: "The issue has been updated by someone else.",
	  conflict_link: "Reload the page",
	  refresh_button_text: "Refresh data",
	  // SVG ICONS Source : https://www.iconfinder.com/iconsets/glyphs
	  svg_edit: '<svg style="width: 1em; height: 1em;" version="1.1" viewBox="0 0 24 24" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g class="svg_edit"><path d="m2 20c0 1.1.9 2 2 2h2.6l-4.6-4.6z"/><path d="m21.6 5.6-3.2-3.2c-.8-.8-2-.8-2.8 0l-.2.2c-.4.4-.4 1 0 1.4l4.6 4.6c.4.4 1 .4 1.4 0l.2-.2c.8-.8.8-2 0-2.8z"/><path d="m14 5.4c-.4-.4-1-.4-1.4 0l-9.1 9.1c-.5.5-.5 1.1-.1 1.5l4.6 4.6c.4.4 1 .4 1.4 0l9.1-9.1c.4-.4.4-1 0-1.4z"/></g></svg>',
	  svg_valid: '<svg style="width: 1em; height: 1em; fill:white;" version="1.1" viewBox="0 0 24 24" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="info"/><g id="icons"><path d="M10,18c-0.5,0-1-0.2-1.4-0.6l-4-4c-0.8-0.8-0.8-2,0-2.8c0.8-0.8,2.1-0.8,2.8,0l2.6,2.6l6.6-6.6   c0.8-0.8,2-0.8,2.8,0c0.8,0.8,0.8,2,0,2.8l-8,8C11,17.8,10.5,18,10,18z" class="svg_check"/></g></svg>',
	  svg_cancel: '<svg style="width: 1em; height: 1em;" version="1.1" viewBox="0 0 24 24" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="info"/><g id="icons"><path d="M14.8,12l3.6-3.6c0.8-0.8,0.8-2,0-2.8c-0.8-0.8-2-0.8-2.8,0L12,9.2L8.4,5.6c-0.8-0.8-2-0.8-2.8,0   c-0.8,0.8-0.8,2,0,2.8L9.2,12l-3.6,3.6c-0.8,0.8-0.8,2,0,2.8C6,18.8,6.5,19,7,19s1-0.2,1.4-0.6l3.6-3.6l3.6,3.6   C16,18.8,16.5,19,17,19s1-0.2,1.4-0.6c0.8-0.8,0.8-2,0-2.8L14.8,12z" class="svg_cancel"/></g></svg>'
}, window.issueDynamicEditConfig || {});

const config = window.issueDynamicEditConfig;

config.listener_target = config.listener_target === "all" ? "" : " ." + config.listener_target;

/*
 * Allow inclusion from other page
 * See https://github.com/Ilogeek/redmine_issue_dynamic_edit/commit/26684a2dd9b12dcc7377afd79e9fe5c142d26ebd for more info
 */
const cleanURL = function(url){ let u = new URL(url); return `${u.protocol}//${u.host}${u.pathname}`; }
let LOCATION_HREF = typeof custom_location_href !== 'undefined' ? cleanURL(custom_location_href) : cleanURL(window.location.href);

if (config.force_https) {
	LOCATION_HREF = LOCATION_HREF.replace(/^http:\/\//i, 'https://');
}

/* Check if admin want to display all editable fields when hovering the whole details block
 * or if user has to hover every element to discover if (s)he can edit it
 */
if (config.display_edit_icon === "block"){
	document.querySelectorAll('body.controller-issues.action-show .issue.details').forEach((elt) => elt.classList.add('showPencils'));
}

const updateCSRFToken = function(token){
	document.querySelectorAll('input[name="authenticity_token"]').forEach((elt) => elt.value = token);
	document.querySelector('meta[name="csrf-token"]').setAttribute("content", token);
}

const setCSRFTokenInput = function(token){
	document.querySelectorAll('form[method="post"]').forEach((elt) => {
		if(!elt.querySelectorAll('input[name="authenticity_token"]').length){
			const input = document.createElement("input");
			input.setAttribute("type", "hidden");
			input.setAttribute("name", "authenticity_token");
			input.value = token;
			elt.insertBefore(input, null);
		}
	});
}

/* Generate edit block */
const getEditFormHTML = function(attribute){
	let formElement =  document.querySelector('#issue_' + attribute + "_id");
	formElement = formElement ? formElement : document.querySelector('#issue_' + attribute);
	formElement = formElement ? formElement : document.querySelector('#' + attribute);

	// Checkbox specific case
	let is_checkboxes = false;
	let is_file = false;
	let is_list = false;
	let CF_ID = false;
	if(!formElement && attribute.startsWith("custom_field_values_")){
		CF_ID = attribute.split("custom_field_values_")[1];
		/* Is it a checkbox block ? */
		formElement = document.querySelector('#issue_custom_field_values_' + CF_ID);
		if(formElement){
			formElement = formElement.closest('.check_box_group');
			is_checkboxes = CF_ID;
		} else {
			/* Is it a file block ? */
			formElement = document.querySelector('#issue_custom_field_values_' + CF_ID + '_blank');
			if(formElement){
				formElement = formElement.closest('p');
				is_file = CF_ID;
			} else {
				/* Is it a checkbox/radio group ? */
				formElement = document.querySelector('#issue-form .cf_' + CF_ID + '.check_box_group');
				is_list = CF_ID;
			}
		}
	}

	if(formElement){
		const clone = formElement.cloneNode(true);
		if(is_file) {
			clone.removeChild(clone.querySelector('label'));
		}
		if(clone.matches('select') && !clone.hasAttribute('multiple')) {
			clone.addEventListener('change', function(e){
				sendData([{"name" : clone.getAttribute('name'), "value" : clone.value}]);
			});
		}
		if(is_checkboxes || is_file || is_list) {
			clone.setAttribute('id', "issue_custom_field_values_" + CF_ID + "_dynamic");
		} else {
			clone.setAttribute('id', formElement.getAttribute('id') + "_dynamic");
		}
		const wrapper = document.createElement('div');
		wrapper.classList.add('dynamicEditField');
		wrapper.insertBefore(clone, null);
		if(!clone.matches('select') || clone.hasAttribute('multiple')) {
			let btn_valid = document.createElement('button');
			btn_valid.classList.add('action', 'valid');
			btn_valid.innerHTML = config.svg_valid;
			wrapper.insertBefore(btn_valid, null);
		}
		const btn_refuse = document.createElement('button');
		btn_refuse.classList.add('action', 'refuse');
		btn_refuse.innerHTML = config.svg_cancel;
		wrapper.insertBefore(btn_refuse, null);
		return wrapper;
	}

	return null;
}

/* Loop over all form attribute and clone them into details part */
const cloneEditForm = function(){
	const btn_refresh = document.createElement('button');
	btn_refresh.classList.add('refreshData');
	btn_refresh.innerHTML = `<span class="refreshIcon">&#10227;</span><span class="refreshLabel">${config.refresh_button_text}</span>`;

	const contextual = document.querySelector('#content > .contextual');
	const existing_refresh = contextual.querySelector('.refreshData');
	if(existing_refresh) {
		existing_refresh.remove();
	}
	contextual.insertBefore(btn_refresh, contextual.firstChild);

	document.querySelectorAll('div.issue.details .attribute').forEach(function(elt){
		const classList = elt.classList.value.split(/\s+/);

		let attributes = classList.filter(function(elem) { return elem != "attribute"; });
		// Specific case : all "-" are replaced by "_" into form id
		attributes = attributes.map((attr) => attr.replaceAll('-', '_'));

		let custom_field = false;
		attributes.forEach(function(part, index, arr) {
		  if(arr[index] === "progress") arr[index] = "done_ratio";
		  if(arr[index].startsWith('cf_')) {
		  	arr[index] = arr[index].replace('cf', 'custom_field_values');
		  	custom_field = arr[index];
		  }
		});

		attributes = attributes.join(" ");

		let selected_elt = custom_field ? custom_field : attributes;
		if(attributes && !config.excluded_field_id.includes(selected_elt)){
			let dynamicEditField = getEditFormHTML(selected_elt);
			if(dynamicEditField){
				let btn_edit = document.createElement('span');
				btn_edit.classList.add('iconEdit');
				btn_edit.innerHTML = config.svg_edit;
				elt.querySelector('.value').insertBefore(btn_edit, null);
				elt.querySelector('.value').insertBefore(dynamicEditField, null);
			}
		}
  	});

  	// Specific Case : Description field
  	if(!config.excluded_field_id.includes("description") && document.querySelectorAll('div.issue.details .description').length){
		const btn_edit = document.createElement('span');
		btn_edit.classList.add('iconEdit');
		btn_edit.innerHTML = config.svg_edit;
  		document.querySelector('div.issue.details .description > p strong').insertAdjacentElement("afterend", btn_edit);
  		const formDescription = getEditFormHTML("description");
  		formDescription.querySelector("#issue_description_dynamic").removeAttribute('data-tribute');
  		document.querySelector('div.issue.details .description').insertBefore(formDescription, null);

  		if (
				typeof(CKEDITOR) === "object" &&
				typeof(CKEDITOR.instances['issue_description'] !== "undefined") &&
				typeof(CKEDITOR.instances['issue_description'].getData) === typeof(Function)
		) {
			const cfg = CKEDITOR.instances['issue_description'].config;
			cfg.height = 100;
			CKEDITOR.replace("issue_description_dynamic", cfg)
		}else if (typeof(jsToolBar) === typeof(Function)) {
			const DynamicDescriptionToolbar = new jsToolBar(document.querySelector('#issue_description_dynamic'));
			DynamicDescriptionToolbar.setHelpLink('/help/en/wiki_syntax_common_mark.html');
			DynamicDescriptionToolbar.setPreviewUrl('/issues/preview?issue_id=' + config.issue_id + '&project_id=' + config.project_id);
			DynamicDescriptionToolbar.draw();
		}
  	}

  	// Specific Case : Title field
  	if(!config.excluded_field_id.includes("subject")){
		const btn_edit = document.createElement('span');
		btn_edit.classList.add('iconEdit');
		btn_edit.innerHTML = config.svg_edit;
		document.querySelector('div.issue.details div.subject h3').insertBefore(btn_edit, null);
  		const formTitle = getEditFormHTML("issue_subject");
  		document.querySelector('div.issue.details div.subject').insertBefore(formTitle, null);
  	}
}

/* Perform action on .value (display edit form) */
document.querySelector('body').addEventListener(config.listener_type_value,
 	function(e){
		let container = e.target.closest('.attribute' + config.listener_target) || e.target.closest('.description') || e.target.closest('.subject');
		if(config.listener_target && e.target.closest('.attribute' + config.listener_target)){
			container = e.target.closest('.attribute');
		}
		if(container) {
			if(e.target.closest('.dynamicEditField')) return; /* We're already into a dynamic field, ignore */
			document.querySelectorAll('.dynamicEditField').forEach(function(elt){ elt.classList.remove('open'); });
			if(!e.target.closest('a') && !e.target.closest('button')){
				let selector = container.querySelector('.dynamicEditField');
				if(selector) selector.classList.add('open')
			}
		}
});

/* Perform action on .iconEdit (display edit form) */
document.querySelector('body').addEventListener(config.listener_type_icon, function(e){
	let is_description = e.target.matches('div.issue.details div.description > p') || e.target.closest('div.issue.details div.description > p');
	let is_subject = e.target.matches('div.issue.details div.subject') || e.target.closest('div.issue.details div.subject');
	if(e.target.matches('.iconEdit') || e.target.closest('.iconEdit')){
		document.querySelectorAll('.dynamicEditField').forEach(function(elt){ elt.classList.remove('open'); });
		let selector = e.target.closest('.value');
		if(is_description) selector = e.target.closest('.description');
		if(is_subject) selector = e.target.closest('.subject');
		if(selector.querySelector('.dynamicEditField')) selector.querySelector('.dynamicEditField').classList.add('open');
	}
});

/* Perform data update when clicking on valid button from edit form */
document.querySelector('body').addEventListener('click', function(e){
	if(e.target.matches('.dynamicEditField .action.valid') || e.target.closest('.dynamicEditField .action.valid')){
		e.preventDefault();
		let inputs = e.target.closest('.dynamicEditField').querySelectorAll('*[name]');
		let formData = [];
		let existingIndex = [];
		inputs.forEach(elt => {
			let not_multiple = !elt.matches('input[type="radio"]') && !elt.matches('input[type="checkbox"]');
			if(elt.matches('input[type="radio"]:checked') || elt.matches('input[type="checkbox"]:checked') || not_multiple){
				if(!existingIndex.includes(elt.getAttribute('name'))){
					existingIndex.push(elt.getAttribute('name'));
					formData.push({"name" : elt.getAttribute('name'), "value" : elt.value})
				}
			}
		});
		sendData(formData);
		e.target.closest('.dynamicEditField').classList.remove('open');
	}
});

/* Hide edit form when clicking on cancel button */
document.querySelector('body').addEventListener('click', function(e){
	if(e.target.matches('.dynamicEditField .action.refuse') || e.target.closest('.dynamicEditField .action.refuse')){
		e.preventDefault();
		e.target.closest('.dynamicEditField').classList.remove('open');
	}
});

/* Update whole .details block + history + form with global refresh button */
document.querySelector('body').addEventListener('click', function(e){
	if(e.target.matches('.refreshData') || e.target.closest('.refreshData')){
		e.preventDefault();
		sendData();
	}
});

/* Listen on esc key press to close opened dialog box */
document.onkeydown = function(evt) {
    evt = evt || window.event;
    let isEscape = false;
    if ("key" in evt) {
        isEscape = (evt.key === "Escape" || evt.key === "Esc");
    } else {
        isEscape = (evt.keyCode === 27);
    }
    if (isEscape) {
        document.querySelectorAll('.dynamicEditField').forEach(function(elt){ elt.classList.remove('open'); });
    }
};

const checkVersion = function(callback){
	fetch(LOCATION_HREF, {
		method: 'GET',
		crossDomain: true,
	}).then(res => res.text()).then(data => {
		const parser = new DOMParser();
		const doc = parser.parseFromString(data, 'text/html');
		const distant_version = doc.querySelector('#issue_lock_version').value;
		const current_version = document.querySelector('#issue_lock_version').value;

		if(distant_version > current_version){
			if(!document.querySelectorAll('#content .conflict').length){
				let msg = document.createElement('div');
				msg.classList.add('conflict');
				msg.innerHTML = `${config.conflict_title}
				<div class="conflict-details">
				<div class="conflict-journal">
				<p><a href='#' onClick="window.location.href=window.location.href">${config.conflict_link}</a> <strong>${config.conflict_txt}</strong></p>
				</div>
				</div>`
				document.querySelector('#content').insertBefore(msg, document.querySelector('#content').firstChild);
			}
		}

		if(callback) callback(distant_version);
		return distant_version;
	}).catch(err => {
		console.warn('Issue while trying to get version (avoiding conflict)');
		console.log(err);
	});
}

let checkVersionInterval = false;
let setCheckVersionInterval = function(activate){
	if(!config.check_issue_update_conflict) return false;
	if(activate && !checkVersionInterval){
		checkVersionInterval = window.setInterval(function(){
			if(document.visibilityState === "visible") checkVersion();
		}, 5000);
	} else {
		clearInterval(checkVersionInterval);
		checkVersionInterval = false;
	}
}

setCheckVersionInterval(true);

/* Global function to perform AJAX call */
let sendData = function(serialized_data){
	let updateIssue = function(serialized_data){
		setCheckVersionInterval(false);
		const token = document.querySelector("meta[name=csrf-token]").getAttribute('content');
		let params = serialized_data || [];
		params.push({name: '_method', value: "patch"});
		params.push({name: 'authenticity_token', value: token});

		let request = new XMLHttpRequest();
		request.open('POST', LOCATION_HREF, true);
		let formData = new FormData();
		params.forEach(data => formData.append(data.name, data.value));

		let callError = function(msg){
			setCheckVersionInterval(true);
			document.querySelector('#ajax-indicator').style.display = 'none';

			/* error and no update, info logged into console */
			console.groupCollapsed('%c -------- Error while updating the issue attribute dynamically -------- ', 'background: #ff0000; color: white; font-weight:900');
			console.log("POST " + LOCATION_HREF);
			console.log(msg);
			console.groupEnd();
		}

		request.onreadystatechange = function() {
			if (this.readyState == 4) {
				if(this.status == 200) {
					const parser = new DOMParser();
					const doc = parser.parseFromString(this.responseText, 'text/html');

					let error = doc.querySelector("#errorExplanation");

					if(error){
						if (!document.querySelector("#errorExplanation")) {
							let err_div = document.createElement('div');
							err_div.setAttribute("id", "errorExplanation");
							err_div.innerHTML = error.innerHTML;
							document.querySelector('.issue.details').insertAdjacentElement("beforebegin", err_div);

							location.href = "#";
							location.href = "#errorExplanation";
						} else {
							document.querySelector("#errorExplanation").innerHTML = error.innerHTML;
						}

						doc = fetch(LOCATION_HREF, {
							method: 'GET',
							crossDomain: true,
						}).then(res => res.text()).then(data => {
							const parser = new DOMParser();
							return parser.parseFromString(data, 'text/html');
						});
					} else {
						if(document.querySelector("#errorExplanation")) document.querySelector("#errorExplanation").remove();
					}

					if(document.querySelector('form#issue-form')) document.querySelector('form#issue-form').innerHTML = doc.querySelector('form#issue-form').innerHTML;
					if(document.querySelector('#all_attributes')) document.querySelector('#all_attributes').innerHTML = doc.querySelector('#all_attributes').innerHTML;
					if(document.querySelector('div.issue.details')) document.querySelector('div.issue.details').innerHTML = doc.querySelector('div.issue.details').innerHTML;
					if(document.querySelector('#issue_lock_version')) document.querySelector('#issue_lock_version').value = doc.querySelector("#issue_lock_version").value;
					if(document.querySelector('#tab-content-history')) {
						if(config.comments_in_reverse_order) {
							document.querySelector('#tab-content-history').insertAdjacentElement('afterbegin', doc.querySelector('#history .journal.has-details:first-child'));
						} else {
							document.querySelector('#tab-content-history').appendChild(doc.querySelector('#history .journal.has-details:last-child'));
						}
					}

					cloneEditForm();

					//set datepicker fallback for input type date
					if (
						document.querySelector('input[type=date]') &&
						$('body').find('input[type=date]').datepickerFallback instanceof Function &&
						typeof datepickerOptions !== 'undefined'
					) {
						$('body').find('input[type=date]').datepickerFallback(datepickerOptions);
					}

					setCSRFTokenInput(doc.querySelector('input[name="authenticity_token"]').value);
					updateCSRFToken(doc.querySelector('input[name="authenticity_token"]').value);

					/* Once we've updated our issue, we have to reset the loadedDate to now to be up to date with the check version */
					loadedDate = new Date();
					setCheckVersionInterval(true);
				} else {
					callError(this.status);
				}
			}
		};
		request.send(formData);
	}

	if(config.check_issue_update_conflict){
		checkVersion(function(distant_version){
			if(distant_version == document.querySelector('#issue_lock_version').value){
				updateIssue(serialized_data);
			} else {

			}
		});
	} else {
		updateIssue(serialized_data);
	}
}

// Init plugin
cloneEditForm();
setCSRFTokenInput(document.querySelector('meta[name="csrf-token"]').getAttribute("content"));
