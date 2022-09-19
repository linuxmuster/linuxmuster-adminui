// Generated by CoffeeScript 2.5.1
(function() {
  angular.module('lmn.devices', ['core', 'lmn.common']);

}).call(this);

// Generated by CoffeeScript 2.5.1
(function() {
  angular.module('lmn.devices').config(function($routeProvider) {
    return $routeProvider.when('/view/lm/devices', {
      controller: 'LMDevicesController',
      templateUrl: '/lmn_devices:resources/partial/index.html'
    });
  });

  angular.module('lmn.devices').controller('LMDevicesApplyModalController', function($scope, $http, $uibModalInstance, gettext, notify) {
    $scope.logVisible = true;
    $scope.isWorking = true;
    $scope.showLog = function() {
      return $scope.logVisible = !$scope.logVisible;
    };
    $http.post('/api/lmn/devices/import').then(function(resp) {
      $scope.isWorking = false;
      return notify.success(gettext('Import complete'));
    }).catch(function(resp) {
      notify.error(gettext('Import failed'), resp.data.message);
      $scope.isWorking = false;
      return $scope.showLog();
    });
    return $scope.close = function() {
      return $uibModalInstance.close();
    };
  });

  angular.module('lmn.devices').controller('LMDevicesController', function($scope, $http, $uibModal, $route, $location, $anchorScroll, gettext, hotkeys, notify, pageTitle, lmFileEditor, lmFileBackups, validation) {
    pageTitle.set(gettext('Devices'));
    $scope.error_msg = {};
    $scope.show_errors = false;
    $scope.emptyCells = {};
    $scope.first_save = false;
    $scope.trans = {
      duplicate: gettext('Duplicate'),
      remove: gettext('Remove')
    };
    $scope.$on("$locationChangeStart", function(event) {
      if ($scope.devices_form.$dirty && !confirm(gettext('Changes are not saved, continue anyway ?'))) {
        return event.preventDefault();
      }
    });
    $scope.dictLen = function(d) {
      return Object.keys(d).length;
    };
    $scope.validateField = function(name, val, isnew, index, role = "") {
      var test, test_length;
      if (!val) {
        delete $scope.error_msg[name + "-" + index];
        $scope.emptyCells[name + "-" + index] = 1;
        return "has-error-new";
      }
      if (name === "Mac") {
        // Index necessary to convert mac adress in $scope.devices
        test = validation["isValidMac"](val, index);
      } else if (name === "Host") {
        // Don't test hostname length for some devices
        if (["server", "router", "printer", "switch", "iponly"].indexOf(role) >= 0) {
          test_length = false;
        } else {
          test_length = true;
        }
        test = validation["isValidHost"](val, test_length = test_length);
      } else {
        test = validation["isValid" + name](val);
      }
      if (test === true) {
        delete $scope.error_msg[name + "-" + index];
        delete $scope.emptyCells[name + "-" + index];
        return "";
      } else {
        delete $scope.emptyCells[name + "-" + index];
        // Error not already registered, adding it
        if (Object.values($scope.error_msg).indexOf(test) === -1) {
          $scope.error_msg[name + "-" + index] = test;
        }
        return "has-error-new";
      }
    };
    $scope.sorts = [
      {
        name: gettext('Room'),
        fx: function(x) {
          return x.room;
        }
      },
      {
        name: gettext('Group'),
        fx: function(x) {
          return x.group;
        }
      },
      {
        name: gettext('Hostname'),
        fx: function(x) {
          return x.hostname;
        }
      },
      {
        name: gettext('MAC'),
        fx: function(x) {
          return x.mac;
        }
      },
      {
        name: gettext('IP'),
        fx: function(x) {
          return x.ip;
        }
      }
    ];
    $scope.sort = $scope.sorts[0];
    $scope.paging = {
      page: 1,
      pageSize: 100
    };
    $scope.stripComments = function(value) {
      if (value._isNew) {
        return true;
      }
      return value.room && value.room[0] !== '#';
    };
    $scope.add = function() {
      if ($scope.devices.length > 0) {
        $scope.paging.page = Math.floor(($scope.devices.length - 1) / $scope.paging.pageSize) + 1;
      }
      $scope.filter = '';
      return $scope.devices.push({
        _isNew: true,
        room: '',
        hostname: '',
        group: '',
        mac: '',
        ip: '',
        sophomorixRole: 'classroom-studentcomputer',
        pxeFlag: '1'
      });
    };
    $scope.duplicate = function(device) {
      var newDevice;
      newDevice = angular.copy(device);
      newDevice._isNew = true;
      // New device is added at first place
      $scope.devices.unshift(newDevice);
      $scope.devices_without_comment.unshift(newDevice);
      // Return to first page after adding the new device
      return $scope.paging.page = 1;
    };
    $scope.fields = {
      room: {
        visible: true,
        name: gettext('Room')
      },
      hostname: {
        visible: true,
        name: gettext('Hostname')
      },
      group: {
        visible: true,
        name: gettext('Group')
      },
      mac: {
        visible: true,
        name: gettext('MAC')
      },
      ip: {
        visible: true,
        name: gettext('IP')
      },
      officeKey: {
        visible: false,
        name: gettext('Office Key')
      },
      windowsKey: {
        visible: false,
        name: gettext('Windows Key')
      },
      dhcpOptions: {
        visible: false,
        name: gettext('DHCP-Options')
      },
      sophomorixRole: {
        visible: true,
        name: gettext('Sophomorix-Role')
      },
      lmnReserved10: {
        visible: false,
        name: gettext('LMN-Reserved 10')
      },
      pxeFlag: {
        visible: true,
        name: gettext('PXE')
      },
      lmnReserved12: {
        visible: false,
        name: gettext('LMN-Reserved 12')
      },
      lmnReserved13: {
        visible: false,
        name: gettext('LMN-Reserved 13')
      },
      lmnReserved14: {
        visible: false,
        name: gettext('LMN-Reserved 14')
      },
      sophomorixComment: {
        visible: false,
        name: gettext('Sophomorix-Comment')
      }
    };
    $scope.remove = function(device) {
      $scope.devices.remove(device);
      return $scope.devices_without_comment.remove(device);
    };
    $scope.numErrors = function() {
      // Remove previous errors
      angular.element(document.getElementsByClassName("has-error")).removeClass('has-error');
      return document.getElementsByClassName("has-error-new").length > 0;
    };
    $scope.save = function() {
      if ($scope.numErrors()) {
        $scope.first_save = true;
        $scope.show_errors = true;
        angular.element(document.getElementsByClassName("has-error-new")).addClass('has-error');
        notify.error(gettext('Please check the errors.'));
        return;
      }
      $scope.show_errors = false;
      $scope.devices_form.$setPristine();
      return $http.post('/api/lmn/devices', $scope.devices).then(function() {
        var device, i, len, ref;
        ref = $scope.devices;
        // Reset all isNew tags
        for (i = 0, len = ref.length; i < len; i++) {
          device = ref[i];
          device._isNew = false;
        }
        return notify.success(gettext('Saved'));
      });
    };
    $scope.saveAndImport = function() {
      if ($scope.numErrors()) {
        $scope.first_save = true;
        $scope.show_errors = true;
        angular.element(document.getElementsByClassName("has-error-new")).addClass('has-error');
        notify.error(gettext('Please check the errors.'));
        return;
      }
      $scope.show_errors = false;
      return $scope.save().then(function() {
        return $uibModal.open({
          templateUrl: '/lmn_devices:resources/partial/apply.modal.html',
          controller: 'LMDevicesApplyModalController',
          size: 'lg',
          backdrop: 'static'
        });
      });
    };
    $scope.editCSV = function() {
      return lmFileEditor.show($scope.path).then(function() {
        return $route.reload();
      });
    };
    $scope.backups = function() {
      return lmFileBackups.show($scope.path);
    };
    $scope.$watch('identity.user', function() {
      if ($scope.identity.user === void 0) {
        return;
      }
      if ($scope.identity.user === null) {
        return;
      }
      if ($scope.identity.user === 'root') {

      }
    });
    $http.get('/api/lm/linbo4/groups').then(function(resp) {
      return $scope.linbo_groups = resp.data;
    });
    $http.get("/api/lmn/activeschool").then(function(resp) {
      var school;
      $scope.identity.profile.activeSchool = resp.data;
      school = $scope.identity.profile.activeSchool;
      if (school === "default-school") {
        return $scope.path = '/etc/linuxmuster/sophomorix/default-school/devices.csv';
      } else {
        return $scope.path = '/etc/linuxmuster/sophomorix/' + school + '/' + school + '.devices.csv';
      }
    });
    $http.get('/api/lmn/devices').then(function(resp) {
      $scope.devices = resp.data;
      $scope.devices_without_comment = $scope.devices.filter(function(dict) {
        return dict['room'][0] !== '#';
      });
      return validation.set($scope.devices_without_comment, 'devices');
    });
    return hotkeys.on($scope, function(key, event) {
      if (key === 'I' && event.ctrlKey) {
        $scope.saveAndImport();
        return true;
      }
      if (key === 'S' && event.ctrlKey) {
        $scope.save();
        return true;
      }
      if (key === 'B' && event.ctrlKey) {
        $scope.backups();
        return true;
      }
      return false;
    });
  });

}).call(this);

