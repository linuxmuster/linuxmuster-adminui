// Generated by CoffeeScript 2.3.1
(function() {
  angular.module('lmn.groupmembership', ['core', 'lm.common']);

}).call(this);

// Generated by CoffeeScript 2.3.1
(function() {
  angular.module('lmn.groupmembership').config(function($routeProvider) {
    return $routeProvider.when('/view/lmn/groupmembership', {
      controller: 'LMNGroupMembershipController',
      templateUrl: '/lmn_groupmembership:resources/partial/index.html'
    });
  });

  angular.module('lmn.groupmembership').controller('LMNGroupMembershipController', function($scope, $http, $uibModal, gettext, notify, pageTitle, lmFileBackups) {
    pageTitle.set(gettext('Settings'));
    return $http.get('/api/lmn/groupmembership').then(function(resp) {
      var school;
      school = 'default-school';
      console.log(resp.data);
      return $scope.groups = resp.data;
    });
  });

}).call(this);

