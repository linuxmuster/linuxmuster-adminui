// Generated by CoffeeScript 2.5.1
(function() {
  angular.module('lmn.settings', ['core', 'lmn.common']);

}).call(this);

// Generated by CoffeeScript 2.5.1
(function() {
  var indexOf = [].indexOf;

  angular.module('lmn.settings').config(function($routeProvider) {
    return $routeProvider.when('/view/lm/schoolsettings', {
      controller: 'LMSettingsController',
      templateUrl: '/lmn_settings:resources/partial/index.html'
    });
  });

  angular.module('lmn.settings').controller('LMSettingsController', function($scope, $location, $http, $uibModal, messagebox, gettext, notify, pageTitle, lmFileBackups) {
    var tag;
    pageTitle.set(gettext('Settings'));
    $scope.trans = {
      remove: gettext('Remove')
    };
    $scope.tabs = ['general', 'listimport', 'quota', 'printing'];
    tag = $location.$$url.split("#")[1];
    if (tag && indexOf.call($scope.tabs, tag) >= 0) {
      $scope.activetab = $scope.tabs.indexOf(tag);
    } else {
      $scope.activetab = 0;
    }
    $scope.logLevels = [
      {
        name: gettext('Minimal'),
        value: 0
      },
      {
        name: gettext('Average'),
        value: 1
      },
      {
        name: gettext('Maximal'),
        value: 2
      }
    ];
    $scope.unit = 'MiB';
    $scope.encodings = ['auto', 'ASCII', 'ISO_8859-1', 'ISO_8859-15', 'WIN-1252', 'UTF8'];
    $http.get('/api/lm/schoolsettings').then(function(resp) {
      var encoding, file, i, len, ref, school, userfile;
      school = 'default-school';
      console.log(resp.data);
      encoding = {};
      ref = ['userfile.students.csv', 'userfile.extrastudents.csv', 'userfile.teachers.csv', 'userfile.extrastudents.csv'];
      //TODO: Remove comments
      //for file in ['userfile.students.csv', 'userfile.teachers.csv', 'userfile.extrastudents.csv', 'classfile.extraclasses.csv', ]
      for (i = 0, len = ref.length; i < len; i++) {
        file = ref[i];
        userfile = file.substring(file.indexOf('.') + 1);
        if (resp.data[file]['ENCODING'] === 'auto') {
          console.log('is auto');
          $http.post('/api/lmn/schoolsettings/determine-encoding', {
            path: '/etc/linuxmuster/sophomorix/' + school + '/' + userfile,
            file: file
          }).then(function(response) {
            encoding[response['config']['data']['file']] = response.data;
            return console.log(encoding);
          });
        }
      }
      //console.log(encoding)
      $scope.encoding = encoding;
      return $scope.settings = resp.data;
    });
    $http.get('/api/lm/subnets').then(function(resp) {
      return $scope.subnets = resp.data;
    });
    $http.get('/api/lm/custom_config').then(function(resp) {
      $scope.custom = resp.data.custom;
      $scope.customMulti = resp.data.customMulti;
      return $scope.customDisplay = resp.data.customDisplay;
    });
    // $http.get('/api/lm/schoolsettings/school-share').then (resp) ->
    //     $scope.schoolShareEnabled = resp.data

    // $scope.setSchoolShare = (enabled) ->
    //     $scope.schoolShareEnabled = enabled
    //     $http.post('/api/lm/schoolsettings/school-share', enabled)
    $scope.removeSubnet = function(subnet) {
      return messagebox.show({
        text: gettext('Are you sure you want to delete permanently this subnet ?'),
        positive: gettext('Delete'),
        negative: gettext('Cancel')
      }).then(function() {
        return $scope.subnets.remove(subnet);
      });
    };
    $scope.addSubnet = function() {
      return $scope.subnets.push({
        'routerIp': '',
        'network': '',
        'beginRange': '',
        'endRange': '',
        'setupFlag': ''
      });
    };
    $scope.save = function() {
      return $http.post('/api/lm/schoolsettings', $scope.settings).then(function() {
        return notify.success(gettext('Saved'));
      });
    };
    $scope.saveAndCheck = function() {
      return $http.post('/api/lm/schoolsettings', $scope.settings).then(function() {
        $uibModal.open({
          templateUrl: '/lmn_users:resources/partial/check.modal.html',
          controller: 'LMUsersCheckModalController',
          backdrop: 'static'
        });
        return notify.success(gettext('Saved'));
      });
    };
    $scope.saveApplyQuota = function() {
      $http.post('/api/lm/schoolsettings', $scope.settings).then(function() {
        return notify.success(gettext('Saved'));
      });
      return $uibModal.open({
        templateUrl: '/lmn_quotas:resources/partial/apply.modal.html',
        controller: 'LMQuotasApplyModalController',
        backdrop: 'static'
      });
    };
    $scope.saveApplySubnets = function() {
      return $http.post('/api/lm/subnets', $scope.subnets).then(function() {
        return notify.success(gettext('Saved'));
      });
    };
    return $scope.backups = function() {
      var school;
      school = "default-school";
      return lmFileBackups.show('/etc/linuxmuster/sophomorix/' + school + '/school.conf');
    };
  });

}).call(this);

'use strict';

angular.module('lmn.settings').controller('LMglobalSettingsController', function ($scope, $http, $sce, notify, pageTitle, identity, messagebox, config, core, locale, gettext) {
   pageTitle.set(gettext('Global Settings'));

   $scope.config = config;

   $scope.newClientCertificate = {
      c: 'NA',
      st: 'NA',
      o: '',
      cn: ''
   };

   identity.promise.then(function () {
      // $scope.newClientCertificate.o = identity.machine.name;
      // passwd.list().then((data) => {
      //    $scope.availableUsers = data;
      //    $scope.$watch('newClientCertificate.user', () => $scope.newClientCertificate.cn = `${identity.user}@${identity.machine.hostname}`);
      //    $scope.newClientCertificate.user = 'root';
      // });
      $http.get('/api/core/languages').then(function (rq) {
         return $scope.languages = rq.data;
      });
   });

   $scope.$watch('config.data.language', function () {
      if (config.data) {
         locale.setLanguage(config.data.language);
      }
   });

   $scope.save = function () {
      return config.save().then(function (data) {
         return notify.success(gettext('Saved'));
      }).catch(function () {
         return notify.error(gettext('Could not save config'));
      });
   };

   $scope.createNewServerCertificate = function () {
      return messagebox.show({
         title: gettext('Self-signed certificate'),
         text: gettext('Generating a new certificate will void all existing client authentication certificates!'),
         positive: gettext('Generate'),
         negative: gettext('Cancel')
      }).then(function () {
         config.data.ssl.client_auth.force = false;
         notify.info(gettext('Generating certificate'), gettext('Please wait'));
         return $http.get('/api/settings/generate-server-certificate').success(function (data) {
            notify.success(gettext('Certificate successfully generated'));
            config.data.ssl.enable = true;
            config.data.ssl.certificate = data.path;
            config.data.ssl.client_auth.certificates = [];
            $scope.save();
         }).error(function (err) {
            return notify.error(gettext('Certificate generation failed'), err.message);
         });
      });
   };

   $scope.restart = function () {
      return core.restart();
   };
});


'use strict';

angular.module('lmn.settings').config(function ($routeProvider) {
           return $routeProvider.when('/view/lm/globalsettings', {
                      templateUrl: '/lmn_settings:resources/partial/globalSettings.html',
                      controller: 'LMglobalSettingsController'
           });
});


