// Generated by CoffeeScript 2.4.1
(function() {
  angular.module('lmn.groupmembership', ['core', 'lm.common']);

}).call(this);

// Generated by CoffeeScript 2.4.1
(function() {
  var isValidName,
    indexOf = [].indexOf;

  isValidName = function(name) {
    var regExp, validName;
    regExp = /^[a-z0-9]*$/;
    validName = regExp.test(name);
    return validName;
  };

  angular.module('lmn.groupmembership').config(function($routeProvider) {
    return $routeProvider.when('/view/lmn/groupmembership', {
      controller: 'LMNGroupMembershipController',
      templateUrl: '/lmn_groupmembership:resources/partial/index.html'
    });
  });

  angular.module('lmn.groupmembership').controller('LMNGroupDetailsController', function($scope, $route, $uibModal, $uibModalInstance, $http, gettext, notify, messagebox, pageTitle, groupType, groupName) {
    $scope.editGroupMembers = function(groupName, groupDetails, admins) {
      return $uibModal.open({
        templateUrl: '/lmn_groupmembership:resources/partial/editMembers.modal.html',
        controller: 'LMNGroupEditController',
        size: 'lg',
        resolve: {
          groupName: function() {
            return groupName;
          },
          groupDetails: function() {
            return groupDetails;
          },
          admins: function() {
            return admins;
          }
        }
      }).result.then(function(result) {
        if (result.response === 'refresh') {
          return $scope.getGroupDetails([groupType, groupName]);
        }
      });
    };
    $scope.showAdminDetails = true;
    $scope.showMemberDetails = true;
    $scope.changeState = false;
    $scope.hidetext = gettext("Hide");
    $scope.showtext = gettext("Show");
    $scope.changeJoin = function(group, type) {
      var option;
      $scope.changeState = true;
      option = $scope.joinable ? '--join' : '--nojoin';
      return $http.post('/api/lmn/changeGroup', {
        option: option,
        group: group,
        type: type
      }).then(function(resp) {
        if (resp['data'][0] === 'ERROR') {
          notify.error(resp['data'][1]);
        }
        if (resp['data'][0] === 'LOG') {
          notify.success(gettext(resp['data'][1]));
        }
        return $scope.changeState = false;
      });
    };
    $scope.changeHide = function(group, type) {
      var option;
      $scope.changeState = true;
      option = $scope.hidden ? '--hide' : '--nohide';
      return $http.post('/api/lmn/changeGroup', {
        option: option,
        group: group,
        type: type
      }).then(function(resp) {
        if (resp['data'][0] === 'ERROR') {
          notify.error(resp['data'][1]);
        }
        if (resp['data'][0] === 'LOG') {
          notify.success(gettext(resp['data'][1]));
        }
        return $scope.changeState = false;
      });
    };
    $scope.killProject = function(project) {
      return messagebox.show({
        text: `Do you really want to delete '${project}'? This can't be undone!`,
        positive: 'Delete',
        negative: 'Cancel'
      }).then(function() {
        var msg;
        msg = messagebox.show({
          progress: true
        });
        return $http.post('/api/lmn/groupmembership', {
          action: 'kill-project',
          username: $scope.identity.user,
          project: project,
          profil: $scope.identity.profile
        }).then(function(resp) {
          if (resp['data'][0] === 'ERROR') {
            notify.error(resp['data'][1]);
          }
          if (resp['data'][0] === 'LOG') {
            notify.success(gettext(resp['data'][1]));
            return $uibModalInstance.close({
              response: 'refresh'
            });
          }
        }).finally(function() {
          return msg.close();
        });
      });
    };
    $scope.nevertext = gettext('Never');
    $scope.formatDate = function(date) {
      var day, hour, min, month, sec, year;
      if (date === "19700101000000.0Z") {
        return $scope.nevertext;
      } else if (date === void 0) {
        return "undefined";
      } else {
        // Sophomorix date format is yyyyMMddhhmmss.0Z
        year = date.slice(0, 4);
        month = +date.slice(4, 6) - 1; // Month start at 0
        day = date.slice(6, 8);
        hour = date.slice(8, 10);
        min = date.slice(10, 12);
        sec = date.slice(12, 14);
        return new Date(year, month, day, hour, min, sec);
      }
    };
    $scope.filterDNLogin = function(dn) {
      if (dn.indexOf('=') !== -1) {
        return dn.split(',')[0].split('=')[1];
      } else {
        return dn;
      }
    };
    $scope.getGroupDetails = function(group) {
      groupType = group[0];
      groupName = group[1];
      return $http.post('/api/lmn/groupmembership/details', {
        action: 'get-specified',
        groupType: groupType,
        groupName: groupName
      }).then(function(resp) {
        var admin, i, len, member, name, ref, ref1;
        $scope.groupName = groupName;
        $scope.groupDetails = resp.data['GROUP'][groupName];
        $scope.adminList = resp.data['GROUP'][groupName]['sophomorixAdmins'];
        $scope.groupmemberlist = resp.data['GROUP'][groupName]['sophomorixMemberGroups'];
        $scope.groupadminlist = resp.data['GROUP'][groupName]['sophomorixAdminGroups'];
        $scope.members = [];
        ref = resp.data['MEMBERS'][groupName];
        for (name in ref) {
          member = ref[name];
          if (member.sn !== "null") { // group member 
            $scope.members.push({
              'sn': member.sn,
              'givenName': member.givenName,
              'sophomorixAdminClass': member.sophomorixAdminClass
            });
          }
        }
        $scope.admins = [];
        ref1 = $scope.adminList;
        for (i = 0, len = ref1.length; i < len; i++) {
          admin = ref1[i];
          member = resp.data['MEMBERS'][groupName][admin];
          $scope.admins.push({
            'sn': member.sn,
            'givenName': member.givenName,
            'sophomorixAdminClass': member.sophomorixAdminClass
          });
        }
        $scope.joinable = resp.data['GROUP'][groupName]['sophomorixJoinable'] === 'TRUE';
        $scope.hidden = resp.data['GROUP'][groupName]['sophomorixHidden'] === 'TRUE';
        
        // Admin or admin of the project can edit members of a project
        // Only admins can change hide and join option for a class
        if ($scope.identity.isAdmin) {
          return $scope.editMembersButton = true;
        } else if ((groupType === "project") && ($scope.adminList.indexOf($scope.identity.user) !== -1 || $scope.groupadminlist.indexOf($scope.identity.profile.sophomorixAdminClass) !== -1)) {
          return $scope.editMembersButton = true;
        } else {
          return $scope.editMembersButton = false;
        }
      });
    };
    $scope.groupType = groupType;
    $scope.getGroupDetails([groupType, groupName]);
    return $scope.close = function() {
      return $uibModalInstance.dismiss();
    };
  });

  angular.module('lmn.groupmembership').controller('LMNGroupEditController', function($scope, $route, $uibModal, $uibModalInstance, $http, gettext, notify, messagebox, pageTitle, groupName, groupDetails, admins) {
    var groupDN;
    $scope.sorts = [
      {
        name: gettext('Given name'),
        id: 'givenName',
        fx: function(x) {
          return x.givenName;
        }
      },
      {
        name: gettext('Name'),
        id: 'sn',
        fx: function(x) {
          return x.sn;
        }
      },
      {
        name: gettext('Membership'),
        id: 'membership',
        fx: function(x) {
          return x.membership;
        }
      }
    ];
    //{
    //    name: gettext('Class')
    //    fx: (x) -> x.sophomorixAdminClass
    //}
    $scope.sort = $scope.sorts[1];
    $scope.groupName = groupName;
    $scope.admins = admins;
    $scope.sortReverse = false;
    groupDN = groupDetails['DN'];
    $scope.addgroupmembertext = gettext('Add/remove as member group');
    $scope.addgroupadmintext = gettext('Add/remove as admin group');
    $scope.admingroups = groupDetails['sophomorixAdminGroups'];
    $scope.membergroups = groupDetails['sophomorixMemberGroups'];
    $scope.checkInverse = function(sort, currentSort) {
      if (sort === currentSort) {
        return $scope.sortReverse = !$scope.sortReverse;
      } else {
        return $scope.sortReverse = false;
      }
    };
    $scope.updateAdminList = function(teacher) {
      var idx;
      idx = $scope.admins.indexOf(teacher.sAMAccountName);
      if (idx >= 0) {
        return $scope.admins.splice(idx, 1);
      } else {
        return $scope.admins.push(teacher.sAMAccountName);
      }
    };
    $scope.updateGroupAdminList = function(cl) {
      var admin, i, idx, len, newadmins, ref;
      idx = $scope.admingroups.indexOf(cl);
      if (idx >= 0) {
        return $scope.admingroups.splice(idx, 1);
      } else {
        $scope.admingroups.push(cl);
        // If group teachers, remove each teacher from adminlist
        if (cl === 'teachers') {
          newadmins = [];
          ref = $scope.admins;
          for (i = 0, len = ref.length; i < len; i++) {
            admin = ref[i];
            idx = $scope.teacherlist.indexOf(admin);
            if (idx < 0) {
              newadmins.push(admin);
            }
          }
          $scope.admins = newadmins;
          return console.log($scope.admins, $scope.teacherlist);
        }
      }
    };
    $scope.updateGroupMemberList = function(cl) {
      var i, idx, j, len, len1, ref, ref1, results, student, teacher;
      idx = $scope.membergroups.indexOf(cl);
      console.log(cl);
      if (idx >= 0) {
        return $scope.membergroups.splice(idx, 1);
      } else {
        $scope.membergroups.push(cl);
        ref = $scope.students;
        for (i = 0, len = ref.length; i < len; i++) {
          student = ref[i];
          if (student['sophomorixAdminClass'] === cl) {
            student['membership'] = false;
          }
        }
        if (cl === 'teachers') {
          ref1 = $scope.teachers;
          results = [];
          for (j = 0, len1 = ref1.length; j < len1; j++) {
            teacher = ref1[j];
            results.push(teacher['membership'] = false);
          }
          return results;
        }
      }
    };
    $scope.setMembers = function(students, teachers) {
      var members, msg;
      msg = messagebox.show({
        progress: true
      });
      members = students.concat(teachers);
      return $http.post('/api/lmn/groupmembership/details', {
        action: 'set-members',
        username: $scope.identity.user,
        members: members,
        groupName: groupName,
        admins: $scope.admins,
        membergroups: $scope.membergroups,
        admingroups: $scope.admingroups
      }).then(function(resp) {
        if (resp['data'][0] === 'ERROR') {
          notify.error(resp['data'][1]);
        }
        if (resp['data'][0] === 'LOG') {
          notify.success(gettext(resp['data'][1]));
          return $uibModalInstance.close({
            response: 'refresh'
          });
        }
      //$scope.resetClass()
      }).finally(function() {
        return msg.close();
      });
    };
    $http.post('/api/lm/sophomorixUsers/students', {
      action: 'get-all'
    }).then(function(resp) {
      var classes, i, len, ref, student, students;
      students = resp.data;
      $scope.students = students;
      classes = [];
      for (i = 0, len = students.length; i < len; i++) {
        student = students[i];
        if (ref = student['sophomorixAdminClass'], indexOf.call(classes, ref) < 0) {
          classes.push(student['sophomorixAdminClass']);
        }
        if (indexOf.call(student['memberOf'], groupDN) >= 0) {
          student['membership'] = true;
        } else {
          student['membership'] = false;
        }
      }
      return $scope.classes = classes;
    });
    //# TODO : add class ?
    //# TODO : add other project members ?
    $http.post('/api/lm/sophomorixUsers/teachers', {
      action: 'get-list'
    }).then(function(resp) {
      var i, len, ref, results, teacher;
      $scope.teachers = resp.data;
      $scope.teacherlist = [];
      ref = $scope.teachers;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        teacher = ref[i];
        if (indexOf.call(teacher['memberOf'], groupDN) >= 0) {
          teacher['membership'] = true;
        } else {
          teacher['membership'] = false;
        }
        results.push($scope.teacherlist.push(teacher['sAMAccountName']));
      }
      return results;
    });
    return $scope.close = function() {
      return $uibModalInstance.dismiss();
    };
  });

  angular.module('lmn.groupmembership').controller('LMNGroupMembershipController', function($scope, $http, $uibModal, gettext, notify, pageTitle, messagebox) {
    pageTitle.set(gettext('Enrolle'));
    $scope.types = {
      schoolclass: {
        typename: gettext('Schoolclass'),
        name: gettext('Groupname'),
        checkbox: true,
        type: 'schoolclass'
      },
      printergroup: {
        typename: gettext('Printer'),
        checkbox: true,
        type: 'printergroup'
      },
      project: {
        typename: gettext('Projects'),
        checkbox: true,
        type: 'project'
      }
    };
    $scope.sorts = [
      {
        name: gettext('Groupname'),
        fx: function(x) {
          return x.groupname;
        }
      },
      {
        name: gettext('Membership'),
        fx: function(x) {
          return x.membership;
        }
      }
    ];
    $scope.sort = $scope.sorts[0];
    $scope.sortReverse = false;
    $scope.paging = {
      page: 1,
      pageSize: 20
    };
    $scope.isActive = function(group) {
      if (group.type === 'printergroup') {
        if ($scope.types.printergroup.checkbox === true) {
          return true;
        }
      }
      if (group.type === 'schoolclass') {
        if ($scope.types.schoolclass.checkbox === true) {
          return true;
        }
      }
      if (group.type === 'project') {
        if ($scope.types.schoolclass.checkbox === true) {
          return true;
        }
      }
      return false;
    };
    $scope.checkInverse = function(sort, currentSort) {
      if (sort === currentSort) {
        return $scope.sortReverse = !$scope.sortReverse;
      } else {
        return $scope.sortReverse = false;
      }
    };
    $scope.resetClass = function() {
      var group, i, len, ref, result;
      // reset html class back (remove changed) so its not highlighted anymore
      result = document.getElementsByClassName("changed");
      while (result.length) {
        result[0].className = result[0].className.replace(/(?:^|\s)changed(?!\S)/g, '');
      }
      ref = $scope.groups;
      // reset $scope.group attribute back not not changed so an additional enroll will not set these groups again
      for (i = 0, len = ref.length; i < len; i++) {
        group = ref[i];
        group['changed'] = false;
      }
    };
    $scope.groupChanged = function(item) {
      var group, i, len, ref;
      ref = $scope.groups;
      for (i = 0, len = ref.length; i < len; i++) {
        group = ref[i];
        if (group['groupname'] === item) {
          if (group['changed'] === false) {
            group['changed'] = true;
          } else {
            group['changed'] = false;
          }
        }
      }
      // set html class
      if (document.getElementById(item).className.match(/(?:^|\s)changed(?!\S)/)) {
        return document.getElementById(item).className = document.getElementById(item).className.replace(/(?:^|\s)changed(?!\S)/g, '');
      } else {
        return document.getElementById(item).className += " changed";
      }
    };
    $scope.getGroups = function(username) {
      return $http.post('/api/lmn/groupmembership', {
        action: 'list-groups',
        username: username,
        profil: $scope.identity.profile
      }).then(function(resp) {
        var group, i, j, k, len, len1, len2, printergroupCount, projectCount, ref, ref1, ref2, schoolclassCount;
        $scope.groups = resp.data[0];
        $scope.identity.isAdmin = resp.data[1];
        schoolclassCount = 0;
        printergroupCount = 0;
        projectCount = 0;
        ref = $scope.groups;
        for (i = 0, len = ref.length; i < len; i++) {
          group = ref[i];
          if (group.type === 'schoolclass') {
            schoolclassCount = schoolclassCount + 1;
          }
        }
        ref1 = $scope.groups;
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          group = ref1[j];
          if (group.type === 'printergroup') {
            printergroupCount = printergroupCount + 1;
          }
        }
        ref2 = $scope.groups;
        for (k = 0, len2 = ref2.length; k < len2; k++) {
          group = ref2[k];
          if (group.type === 'project') {
            projectCount = projectCount + 1;
          }
        }
        $scope.schoolclassCount = schoolclassCount;
        $scope.printergroupCount = printergroupCount;
        return $scope.projectCount = projectCount;
      });
    };
    $scope.setGroups = function(groups) {
      return $http.post('/api/lmn/groupmembership', {
        action: 'set-groups',
        username: $scope.identity.user,
        groups: groups,
        profil: $scope.identity.profile
      }).then(function(resp) {
        if (resp['data'][0] === 'ERROR') {
          notify.error(resp['data'][1]);
        }
        if (resp['data'][0] === 'LOG') {
          notify.success(gettext(resp['data'][1]));
          $scope.resetClass();
        }
        if (resp.data === 0) {
          return notify.success(gettext("Nothing changed"));
        }
      });
    };
    $scope.createProject = function() {
      return messagebox.prompt(gettext('Project Name'), '').then(function(msg) {
        if (!msg.value) {
          return;
        }
        if (!isValidName(msg.value)) {
          notify.error(gettext('Not a valid name! Only lowercase alphanumeric characters are allowed!'));
          return;
        }
        return $http.post('/api/lmn/groupmembership', {
          action: 'create-project',
          username: $scope.identity.user,
          project: msg.value,
          profil: $scope.identity.profile
        }).then(function(resp) {
          notify.success(gettext('Project Created'));
          return $scope.getGroups($scope.identity.user);
        });
      });
    };
    $scope.showGroupDetails = function(index, groupType, groupName) {
      return $uibModal.open({
        templateUrl: '/lmn_groupmembership:resources/partial/groupDetails.modal.html',
        controller: 'LMNGroupDetailsController',
        size: 'lg',
        resolve: {
          groupType: function() {
            return groupType;
          },
          groupName: function() {
            return groupName;
          }
        }
      }).result.then(function(result) {
        if (result.response === 'refresh') {
          return $scope.getGroups($scope.identity.user);
        }
      });
    };
    $scope.projectIsJoinable = function(project) {
      return project['joinable'] === 'TRUE' || project.admin || $scope.identity.isAdmin || $scope.identity.profile.memberOf.indexOf(project['DN']) > -1;
    };
    return $scope.$watch('identity.user', function() {
      if ($scope.identity.user === void 0) {
        return;
      }
      if ($scope.identity.user === null) {
        return;
      }
      if ($scope.identity.user === 'root') {
        return;
      }
      // $scope.identity.user = 'hulk'
      $scope.getGroups($scope.identity.user);
    });
  });

}).call(this);

