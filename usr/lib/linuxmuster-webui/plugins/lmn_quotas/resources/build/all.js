// Generated by CoffeeScript 2.4.1
(function() {
  angular.module('lm.quotas', ['core', 'lm.common']);

}).call(this);

// Generated by CoffeeScript 2.4.1
(function() {
  angular.module('lm.quotas').config(function($routeProvider) {
    $routeProvider.when('/view/lm/quotas', {
      controller: 'LMQuotasController',
      templateUrl: '/lmn_quotas:resources/partial/index.html'
    });
    return $routeProvider.when('/view/lm/quotas-disabled', {
      templateUrl: '/lmn_quotas:resources/partial/disabled.html'
    });
  });

  angular.module('lm.quotas').controller('LMQuotasApplyModalController', function($scope, $http, $uibModalInstance, $window, gettext, notify) {
    $scope.logVisible = true;
    $scope.isWorking = true;
    $http.get('/api/lm/quotas/apply').then(function() {
      $scope.isWorking = false;
      return notify.success(gettext('Update complete'));
    }).catch(function(resp) {
      notify.error(gettext('Update failed'), resp.data.message);
      $scope.isWorking = false;
      return $scope.logVisible = true;
    });
    return $scope.close = function() {
      $uibModalInstance.close();
      return $window.location.reload();
    };
  });

  angular.module('lm.quotas').controller('LMQuotasController', function($scope, $http, $uibModal, $location, $q, gettext, lmEncodingMap, notify, pageTitle, lmFileBackups) {
    pageTitle.set(gettext('Quotas'));
    //# TODO
    // Save new quota
    // Delete special quota
    // Quota for class
    // Quota for project
    $scope.toChange = {
      'teacher': {},
      'student': {},
      'schooladministrator': {}
    };
    $scope._ = {
      addNewSpecial: null
    };
    $scope.searchText = gettext('Search user by login, firstname or lastname (min. 3 chars)');
    // Need an array to keep the order ...
    $scope.quota_types = [
      {
        'type': 'quota_default_global',
        'name': gettext('Quota Default Global in MiB')
      },
      {
        'type': 'quota_default_school',
        'name': gettext('Quota Default School in MiB')
      },
      {
        'type': 'cloudquota_percentage',
        'name': gettext('Cloudquota Percentage')
      },
      {
        'type': 'mailquota_default',
        'name': gettext('Mailquota Default in MiB')
      }
    ];
    $http.get('/api/lm/quotas').then(function(resp) {
      $scope.non_default = resp.data[0];
      return $scope.settings = resp.data[1];
    });
    $scope.$watch('_.addNewSpecial', function() {
      var user;
      if ($scope._.addNewSpecial) {
        user = $scope._.addNewSpecial;
        $scope.non_default[user.role][user.login] = {
          'QUOTA': angular.copy($scope.settings['role.' + user.role]),
          'displayName': user.displayName
        };
        return $scope._.addNewSpecial = null;
      }
    });
    $scope.isDefaultQuota = function(role, quota, value) {
      return $scope.settings[role][quota] !== value;
    };
    $scope.findUsers = function(q, role = '') {
      return $http.post("/api/lm/ldap-search", {
        role: role,
        login: q
      }).then(function(resp) {
        return resp.data;
      });
    };
    $scope.remove = function(login) {
      // TODO
      return delete $scope.quotas[login];
    };
    $scope.userToChange = function(role, login, quota) {
      var value;
      delete $scope.toChange[role][login + "_" + quota];
      //# Default value for a quota in sophomorix
      value = '---';
      if ($scope.non_default[role][login]['QUOTA'][quota] !== $scope.settings['role.' + role][quota]) {
        value = $scope.non_default[role][login]['QUOTA'][quota];
      }
      return $scope.toChange[role][login + "_" + quota] = {
        'login': login,
        'quota': quota,
        'value': value
      };
    };
    $scope.save = function() {
      console.log($scope.toChange);
      return $http.post('/api/lm/quotas', {
        toChange: $scope.toChange
      });
    };
    //# Then reset $scope.toChange
    $scope.saveApply = function() {
      return $scope.save().then(function() {
        return $uibModal.open({
          templateUrl: '/lmn_quotas:resources/partial/apply.modal.html',
          controller: 'LMQuotasApplyModalController',
          backdrop: 'static'
        });
      });
    };
    return $scope.backups = function() {
      return lmFileBackups.show('/etc/linuxmuster/sophomorix/user/quota.txt');
    };
  });

  //# Archives
//$http.get('/api/lm/class-quotas').then (resp) ->
//$scope.classes = resp.data
//$scope.originalClasses = angular.copy($scope.classes)

//$http.get('/api/lm/project-quotas').then (resp) ->
//$scope.projects = resp.data
//$scope.originalProjects = angular.copy($scope.projects)

//$scope.specialQuotas = [
//{login: 'www-data', name: gettext('Webspace')}
//{login: 'administrator', name: gettext('Main admin')}
//{login: 'pgmadmin', name: gettext('Program admin')}
//{login: 'wwwadmin', name: gettext('Web admin')}
//]

//$scope.defaultQuotas = [
//{login: 'standard-workstations', name: gettext('Workstation default')}
//{login: 'standard-schueler', name: gettext('Student default')}
//{login: 'standard-lehrer', name: gettext('Teacher default')}
//]

//$http.post('/api/lm/get-all-users').then (resp) ->
//$scope.all_users = resp.data

//$scope.isSpecialQuota = (login) ->
//return login in (x.login for x in $scope.specialQuotas)

//$scope.isDefaultQuota = (login) ->
//return login in (x.login for x in $scope.defaultQuotas)

//$scope.save = () ->

//teachers = angular.copy($scope.teachers)
//for teacher in teachers
//if not teacher.quota.home and not teacher.quota.var
//teacher.quota = ''
//else
//teacher.quota = "#{teacher.quota.home or $scope.standardQuota.home}+#{teacher.quota.var or $scope.standardQuota.var}"
//teacher.mailquota = "#{teacher.mailquota or ''}"

//classesToChange = []
//for cls, index in $scope.classes
//if not angular.equals(cls, $scope.originalClasses[index])
//cls.quota.home ?= $scope.standardQuota.home
//cls.quota.var ?= $scope.standardQuota.var
//classesToChange.push cls

//projectsToChange = []
//for project, index in $scope.projects
//if not angular.equals(project, $scope.originalProjects[index])
//project.quota.home ?= $scope.standardQuota.home
//project.quota.var ?= $scope.standardQuota.var
//projectsToChange.push project

//qs = []
//#qs.push $http.post("/api/lm/users/teachers?encoding=#{$scope.teachersEncoding}", teachers)
//#qs.push $http.post('/api/lm/quotas', $scope.quotas)
//qs.push $http.post('/api/lm/schoolsettings', $scope.settings)

//if classesToChange.length > 0
//qs.push $http.post("/api/lm/class-quotas", classesToChange).then () ->

//if projectsToChange.length > 0
//qs.push $http.post("/api/lm/project-quotas", projectsToChange).then () ->

//return $q.all(qs).then () ->
//$scope.originalClasses = angular.copy($scope.classes)
//$scope.originalProjects = angular.copy($scope.projects)
//notify.success gettext('Saved')

}).call(this);

