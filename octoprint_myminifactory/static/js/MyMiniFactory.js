/*
 * View model for OctoPrint-MyMiniFactory
 *
 * Author: jneilliii
 * License: AGPLv3
 */
$(function() {
	function MyMiniFactoryViewModel(parameters) {
		var self = this;
		
		// add icon to tab
		$('li#tab_plugin_myminifactory_link > a').html('<div class="myminifactory_logo"></div>MyMiniFactory');

		self.loginStateViewModel = parameters[0];
		self.settingsViewModel = parameters[1];

		self.printer_model = ko.observable();
		self.printer_manufacturer = ko.observable();
		self.supported_printers = ko.observableArray();
		self.registering = ko.observable(false);
		self.forgetting = ko.observable(false);
		self.registration_complete = ko.observable();
		self.qr_image_url = ko.observable('');
		self.supported_manufacturers = ko.computed(function() {
				var seen =[];
				return ko.utils.arrayFilter(self.supported_printers(), function(item) {
						return seen.indexOf(item.brand()) == -1 && seen.push(item.brand());
					}).sort(function (left, right) { return left.brand() == right.brand() ? 0 : (left.brand() < right.brand() ? -1 : 1) });
			});
		self.supported_printers_filtered = ko.computed(function(){
			if (!self.printer_manufacturer()) {
				return self.supported_printers();
			} else {
				return ko.utils.arrayFilter(self.supported_printers(), function(item) {
						return (item.brand() == self.printer_manufacturer());
					});
			}
		});

		self.onBeforeBinding = function() {
			self.registration_complete(self.settingsViewModel.settings.plugins.myminifactory.registration_complete());
			self.supported_printers(self.settingsViewModel.settings.plugins.myminifactory.supported_printers());
			self.printer_model(self.settingsViewModel.settings.plugins.myminifactory.printer_model());
			self.printer_manufacturer(self.settingsViewModel.settings.plugins.myminifactory.printer_manufacturer());
		}
		
		self.onSettingsShown = function() {
			if(self.registration_complete()){
				self.get_qr_image_url();
			}
		}
		
		self.onSettingsHidden = function() {
			if(self.registration_complete()){
				self.qr_image_url('');
			}
		}

		self.onEventSettingsUpdated = function(payload) {
			self.supported_printers(self.settingsViewModel.settings.plugins.myminifactory.supported_printers());
			self.printer_model(self.settingsViewModel.settings.plugins.myminifactory.printer_model());
			self.printer_manufacturer(self.settingsViewModel.settings.plugins.myminifactory.printer_manufacturer());
		}
		
		self.onSettingsBeforeSave = function() {
			self.settingsViewModel.settings.plugins.myminifactory.supported_printers(self.supported_printers());
			self.settingsViewModel.settings.plugins.myminifactory.printer_model(self.printer_model());
			self.settingsViewModel.settings.plugins.myminifactory.printer_manufacturer(self.printer_manufacturer());
		}

		self.onDataUpdaterPluginMessage = function(plugin, data) {
			if (plugin != "myminifactory") {
				return;
			}

			if(data.error) {
				self.registering(false);
				new PNotify({
						title: 'MyMiniFactory Error',
						type: 'error',
						text: '<div class="row-fluid"><p>Ther was an error with the MyMiniFactory plugin, error details follow.</p><br/></div><p><pre style="padding-top: 5px;">'+data.error+'</pre></p>',
						hide: false
						});	
				return;
			}

			if(data.qr_image_url && data.qr_image_url !== self.qr_image_url()) {
				console.log(data.qr_image_url);
				self.registering(false);
				self.qr_image_url(data.qr_image_url);
				self.registration_complete(true);
				return;
			}
			
			if(data.printer_removed) {
				self.qr_image_url('');
				self.registration_complete(false);
				self.forgetting(false);
			}
		}
		
		self.onTabChange = function(current, previous) {
				if (current === "#tab_plugin_myminifactory") {
					$('#myminifactory_iframe').attr('src','https://www.myminifactory.com/');
				} else if (previous === "#tab_plugin_myminifactory") {
					$('#myminifactory_iframe').attr('src','');
				}
			};

		// Utility Functions
		self.get_qr_image_url = function(){
			console.log('Registering printer with MyMiniFactory');
			self.registering(true);
			$.ajax({
				url: API_BASEURL + "plugin/myminifactory",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({
					command: "register_printer",
					manufacturer: self.printer_manufacturer(),
					model: self.printer_model()
				}),
				contentType: "application/json; charset=UTF-8"
			});
		}

		self.forget_registration = function(){
			console.log('Removing configured printer locally.');
			self.forgetting(true);
			$.ajax({
				url: API_BASEURL + "plugin/myminifactory",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({
					command: "forget_printer"
				}),
				contentType: "application/json; charset=UTF-8"
			});
		}
	}

	OCTOPRINT_VIEWMODELS.push({
		construct: MyMiniFactoryViewModel,
		dependencies: ["loginStateViewModel","settingsViewModel"],
		elements: ["#tab_plugin_myminifactory","#settings_plugin_myminifactory"]
	});
});