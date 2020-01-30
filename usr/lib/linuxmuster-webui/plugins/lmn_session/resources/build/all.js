// Generated by CoffeeScript 2.4.1
(function() {
  angular.module('lmn.session', ['core', 'lm.common']);

}).call(this);

// Generated by CoffeeScript 2.4.1
(function() {
  angular.module('lmn.session').controller('LMNSessionFileSelectModalController', function($scope, $uibModalInstance, gettext, notify, $http, bulkMode, senders, receivers, action, command, messagebox) {
    $scope.bulkMode = bulkMode;
    $scope.senders = senders;
    $scope.receivers = receivers;
    $scope.action = action;
    $scope.command = command;
    //# Test path for upload with drag and drop
    //# TODO : Fix path here or handle this with sophomorix-transfer ? --> Generic path (eg. /srv/upload, then use sophomorix-transfer)
    //# TODO : chown with custom api or with sophomorix-transfer ? --> should be handled by sophomorix-transfer
    //# TODO : reload modal after upload -- Done
    //# TODO : possibility to remove file from transfer directory -- Done
    $scope.setTransferPath = function(username) {
      var role, school;
      // TODO: Way more generic
      role = 'teachers';
      school = 'default-school';
      $scope.transferPath = '/srv/webuiUpload/' + school + '/' + role + '/' + username + '/';
      // create tmp dir for upload
      $scope.createDir($scope.transferPath);
      return $scope.owner = username;
    };
    $scope.save = function() {
      var filesToTrans;
      filesToTrans = [];
      angular.forEach($scope.files['TREE'], function(file, id) {
        if (file['checked'] === true) {
          return filesToTrans.push(id);
        }
      });
      return $uibModalInstance.close({
        response: 'accept',
        files: filesToTrans,
        bulkMode: bulkMode
      });
    };
    $scope.saveBulk = function() {
      return $uibModalInstance.close({
        response: 'accept',
        files: 'All',
        bulkMode: bulkMode
      });
    };
    $scope.close = function() {
      return $uibModalInstance.dismiss();
    };
    $scope.share = function() {
      return $http.post('/api/lmn/session/trans-list-files', {
        user: senders[0]
      }).then(function(resp) {
        $scope.files = resp['data'][0];
        return $scope.filesList = resp['data'][1];
      });
    };
    $scope.collect = function() {
      if (bulkMode === 'false') {
        return $http.post('/api/lmn/session/trans-list-files', {
          user: senders
        }).then(function(resp) {
          $scope.files = resp['data'][0];
          return $scope.filesList = resp['data'][1];
        });
      }
    };
    $scope.createDir = function(path) {
      return $http.post('/api/lm/create-dir', {
        filepath: path
      });
    };
    $scope.removeFile = function(file) {
      var path, role, school;
      role = 'teachers';
      school = 'default-school';
      path = '/srv/samba/schools/' + school + '/' + role + '/' + $scope.identity.user + '/transfer/' + file;
      return messagebox.show({
        text: gettext('Are you sure you want to delete permanently the file ' + file + '?'),
        positive: gettext('Delete'),
        negative: gettext('Cancel')
      }).then(function() {
        return $http.post('/api/lm/remove-file', {
          filepath: path
        }).then(function(resp) {
          var pos;
          notify.success(gettext("File " + file + " removed"));
          delete $scope.files['TREE'][file];
          $scope.files['COUNT']['files'] = $scope.files['COUNT']['files'] - 1;
          pos = $scope.filesList.indexOf(file);
          return $scope.filesList.splice(pos, 1);
        });
      });
    };
    $scope.removeDir = function(file) {
      var path, role, school;
      role = 'teachers';
      school = 'default-school';
      path = '/srv/samba/schools/' + school + '/' + role + '/' + $scope.identity.user + '/transfer/' + file;
      return messagebox.show({
        text: gettext('Are you sure you want to delete permanently this directory and its content: ' + file + '?'),
        positive: gettext('Delete'),
        negative: gettext('Cancel')
      }).then(function() {
        return $http.post('/api/lm/remove-dir', {
          filepath: path
        }).then(function(resp) {
          var pos;
          notify.success(gettext("Directory " + file + " removed"));
          delete $scope.files['TREE'][file];
          $scope.files['COUNT']['files'] = $scope.files['COUNT']['files'] - 1;
          pos = $scope.filesList.indexOf(file);
          return $scope.filesList.splice(pos, 1);
        });
      });
    };
    $scope.setTransferPath($scope.identity.user);
    if (action === 'share') {
      return $scope.share();
    } else {
      //$scope.setTransferPath($scope.identity.user)
      //$http.post('/api/lmn/session/trans-list-files', {user: senders[0]}).then (resp) ->
      //    $scope.files = resp['data'][0]
      //    $scope.filesList = resp['data'][1]
      return $scope.collect();
    }
  });

  //if bulkMode is 'false'
  //    $http.post('/api/lmn/session/trans-list-files', {user: senders}).then (resp) ->
  //        $scope.files = resp['data'][0]
  //        $scope.filesList = resp['data'][1]
  angular.module('lmn.session').config(function($routeProvider) {
    return $routeProvider.when('/view/lmn/session', {
      controller: 'LMNSessionController',
      templateUrl: '/lmn_session:resources/partial/session.html'
    });
  });

  angular.module('lmn.session').controller('LMNSessionController', function($scope, $http, $location, $route, $uibModal, gettext, notify, messagebox, pageTitle, lmFileEditor, lmEncodingMap, filesystem, validation, $rootScope) {
    var typeIsArray, validateResult;
    pageTitle.set(gettext('Session'));
    $scope.currentSession = {
      name: "",
      comment: ""
    };
    $scope.checkboxModel = {
      value1: false,
      value2: true
    };
    $scope.visible = {
      participanttable: 'none',
      sessiontable: 'none',
      sessionname: 'none',
      mainpage: 'show'
    };
    $scope.info = {
      message: ''
    };
    $scope._ = {
      addParticipant: null,
      addClass: null
    };
    $scope.changeClass = function(item, participant) {
      var id, index;
      id = participant['sAMAccountName'];
      //console.log (id)
      //console.log (item)
      //console.log (id+'.'+item)
      if (document.getElementById(id + '.' + item).className.match(/(?:^|\s)changed(?!\S)/)) {
        //$scope.participants[id]['changed'] = false
        return document.getElementById(id + '.' + item).className = document.getElementById(id + '.' + item).className.replace(/(?:^|\s)changed(?!\S)/g, '');
      } else {
        // get index of current participant in participantslist
        index = $scope.participants.indexOf(participant);
        if (item === 'exammode') {
          $scope.participants[index]['exammode-changed'] = true;
          return document.getElementById(id + '.' + item).className += " changed";
        } else {
          $scope.participants[index]['changed'] = true;
          return document.getElementById(id + '.' + item).className += " changed";
        }
      }
    };
    $scope.resetClass = function() {
      var result;
      result = document.getElementsByClassName("changed");
      while (result.length) {
        result[0].className = result[0].className.replace(/(?:^|\s)changed(?!\S)/g, '');
      }
    };
    $scope.selectAll = function(item) {
      var managementgroup;
      managementgroup = 'group_' + item;
      if (item === 'exammode') {
        managementgroup = 'exammode_boolean';
      }
      // console.log item
      // console.log $scope.participants
      if ($scope.fields[item].checkboxStatus === true) {
        angular.forEach($scope.participants, function(participant) {
          if (participant[managementgroup] === true) {
            participant[managementgroup] = false;
            //$scope.changeClass(id+'.'+item, id)
            return $scope.changeClass(item, participant);
          }
        });
      } else {
        angular.forEach($scope.participants, function(participant) {
          if (participant[managementgroup] === false) {
            participant[managementgroup] = true;
            //$scope.changeClass(id+'.'+item, id)
            return $scope.changeClass(item, participant);
          }
        });
      }
    };
    $scope.killSession = function(username, session, comment) {
      if (session === '') {
        messagebox.show({
          title: gettext('No Session selected'),
          text: gettext('You have to select a session first.'),
          positive: 'OK'
        });
        return;
      }
      return messagebox.show({
        text: gettext("Delete Session:  " + comment + " ?"),
        positive: gettext('Delete'),
        negative: gettext('Cancel')
      }).then(function() {
        $uibModal.open({
          templateUrl: '/lmn_common:resources/partial/wait.modal.html',
          controller: 'lmWaitController',
          backdrop: 'static',
          keyboard: false,
          size: 'mg',
          resolve: {
            status: function() {
              return gettext('Deleting session...');
            },
            style: function() {
              return 'spinner';
            }
          }
        });
        return $http.post('/api/lmn/session/sessions', {
          action: 'kill-sessions',
          session: session
        }).then(function(resp) {
          $rootScope.$emit('updateWaiting', 'done');
          //notify.success gettext('Session Deleted')
          $scope.visible.sessionname = 'none';
          $scope.visible.participanttable = 'none';
          $scope.visible.mainpage = 'show';
          $scope.sessionLoaded = false;
          $scope.info.message = '';
          $scope.getSessions($scope.identity.user);
          $scope.currentSession.name = '';
          return notify.success(gettext(resp.data));
        });
      });
    };
    $scope.newSession = function(username) {
      return messagebox.prompt(gettext('Session Name'), '').then(function(msg) {
        var testChar;
        if (!msg.value) {
          return;
        }
        testChar = validation.isValidLinboConf(msg.value);
        if (testChar !== true) {
          notify.error(gettext(testChar));
          return;
        }
        return $http.post('/api/lmn/session/sessions', {
          action: 'new-session',
          username: username,
          comment: msg.value
        }).then(function(resp) {
          var sessions;
          $scope.new - (sessions = resp.data);
          $scope.getSessions($scope.identity.user);
          notify.success(gettext('Session Created'));
          // Reset alle messages and information to show session table
          $scope.info.message = '';
          $scope.currentSession.name = '';
          $scope.currentSession.comment = '';
          $scope.sessionLoaded = false;
          return $scope.visible.participanttable = 'none';
        });
      });
    };
    $scope.getSessions = function(username) {
      // TODO Figure out why this only works correctly if defined in this function (translation string etc.)
      // translationstrings
      $scope.translation = {
        addStudent: gettext('Add Student'),
        addClass: gettext('Add Class')
      };
      $scope.sorts = [
        {
          name: gettext('Lastname'),
          fx: function(x) {
            return x.sn;
          }
        },
        {
          name: gettext('Login name'),
          fx: function(x) {
            return x.sAMAccountName;
          }
        },
        {
          name: gettext('Firstname'),
          fx: function(x) {
            return x.givenName;
          }
        },
        {
          name: gettext('Email'),
          fx: function(x) {
            return x.mail;
          }
        }
      ];
      $scope.sort = $scope.sorts[0];
      $scope.fields = {
        sAMAccountName: {
          visible: true,
          name: gettext('Userdata')
        },
        transfer: {
          visible: true,
          name: gettext('Transfer')
        },
        examModeSupervisor: {
          visible: true,
          name: gettext('Exam-Supervisor')
        },
        sophomorixRole: {
          visible: false,
          name: gettext('sophomorixRole')
        },
        exammode: {
          visible: true,
          icon: "fa fa-graduation-cap",
          title: gettext('Exam-Mode'),
          checkboxAll: false,
          examBox: true,
          checkboxStatus: false
        },
        wifiaccess: {
          visible: true,
          icon: "fa fa-wifi",
          title: gettext('Wifi-Access'),
          checkboxAll: true,
          checkboxStatus: false
        },
        internetaccess: {
          visible: true,
          icon: "fa fa-globe",
          title: gettext('Internet-Access'),
          checkboxAll: true,
          checkboxStatus: false
        },
        intranetaccess: {
          visible: false,
          icon: "fa fa-server",
          title: gettext('Intranet Access'),
          checkboxAll: true
        },
        webfilter: {
          visible: false,
          icon: "fa fa-filter",
          title: gettext('Webfilter'),
          checkboxAll: true,
          checkboxStatus: false
        },
        printing: {
          visible: true,
          icon: "fa fa-print",
          title: gettext('Printing'),
          checkboxAll: true,
          checkboxStatus: false
        }
      };
      //console.log ($scope.translation)
      //get groups
      console.log($scope.identity.profile);
      $http.post('/api/lmn/groupmembership', {
        action: 'list-groups',
        username: username,
        profil: $scope.identity.profile
      }).then(function(resp) {
        $scope.groups = resp.data[0];
        $scope.identity.isAdmin = resp.data[1];
        return $scope.classes = $scope.groups.filter($scope.filterGroupType('schoolclass'));
      });
      //get sessions
      return $http.post('/api/lmn/session/sessions', {
        action: 'get-sessions',
        username: username
      }).then(function(resp) {
        if (resp.data[0]['SESSIONCOUNT'] === 0) {
          $scope.sessions = resp.data;
          return $scope.info.message = gettext("There are no sessions yet. Create a session using the 'New Session' button at the top!");
        } else {
          //console.log ('sessions found')
          //console.log ('no sessions')
          $scope.visible.sessiontable = 'show';
          return $scope.sessions = resp.data;
        }
      });
    };
    $scope.filterGroupType = function(val) {
      return function(dict) {
        return dict['type'] === val;
      };
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
      });
    };
    $scope.renameSession = function(username, session, comment) {
      if (session === '') {
        messagebox.show({
          title: gettext('No Session selected'),
          text: gettext('You have to select a session first.'),
          positive: 'OK'
        });
        return;
      }
      return messagebox.prompt(gettext('Session Name'), comment).then(function(msg) {
        var testChar;
        if (!msg.value) {
          return;
        }
        testChar = validation.isValidLinboConf(msg.value);
        if (testChar !== true) {
          notify.error(gettext(testChar));
          return;
        }
        return $http.post('/api/lmn/session/sessions', {
          action: 'rename-session',
          session: session,
          comment: msg.value
        }).then(function(resp) {
          $scope.getSessions($scope.identity.user);
          $scope.currentSession.name = '';
          $scope.sessionLoaded = false;
          $scope.currentSession.comment = '';
          $scope.visible.sessiontable = 'none';
          $scope.visible.participanttable = 'none';
          $scope.info.message = '';
          return notify.success(gettext('Session Renamed'));
        });
      });
    };
    $scope.getParticipants = function(username, session) {
      $scope.visible.sessiontable = 'none';
      $scope.resetClass();
      // Reset select all checkboxes when loading participants
      angular.forEach($scope.fields, function(field) {
        return field.checkboxStatus = false;
      });
      return $http.post('/api/lmn/session/sessions', {
        action: 'get-participants',
        username: username,
        session: session
      }).then(function(resp) {
        $scope.visible.sessionname = 'show';
        $scope.sessionLoaded = 'true';
        $scope.filter = '';
        $scope.visible.mainpage = 'none';
        $scope.participants = resp.data;
        if ($scope.participants === 'empty') {
          $scope.visible.participanttable = 'none';
          return $scope.info.message = gettext('This session appears to be empty. Start adding users by using the top search bar!');
        } else {
          $scope.info.message = '';
          return $scope.visible.participanttable = 'show';
        }
      });
    };
    $scope.findUsers = function(q) {
      return $http.get(`/api/lmn/session/user-search?q=${q}`).then(function(resp) {
        $scope.users = resp.data;
        return resp.data;
      });
    };
    $scope.findSchoolClasses = function(q) {
      return $http.get(`/api/lmn/session/schoolClass-search?q=${q}`).then(function(resp) {
        $scope.class = resp.data;
        //console.log resp.data
        return resp.data;
      });
    };
    $scope.loadGeneratedSession = function(classname) {
      var i, len, ref, session, sessionComment, sessionExist, sessionID;
      sessionComment = classname + '-autoGenerated';
      sessionExist = false;
      ref = $scope.sessions;
      for (i = 0, len = ref.length; i < len; i++) {
        session = ref[i];
        if (sessionComment === session['COMMENT']) {
          sessionExist = true;
          sessionID = session['ID'];
          console.log('sessionExist ' + sessionExist);
        }
      }
      if (sessionExist === false) {
        $scope.regenerateSession(classname);
      }
      if (sessionExist === true) {
        // open existing session
        $scope.currentSession.name = sessionID;
        $scope.currentSession.comment = sessionComment;
        return $scope.getParticipants($scope.identity.user, sessionID);
      }
    };
    $scope.regenerateSession = function(classname) {
      var i, len, ref, session, sessionComment, sessionExist, sessionID;
      sessionComment = classname + '-autoGenerated';
      sessionExist = false;
      ref = $scope.sessions;
      for (i = 0, len = ref.length; i < len; i++) {
        session = ref[i];
        if (sessionComment === session['COMMENT']) {
          sessionExist = true;
          sessionID = session['ID'];
          console.log('sessionExist ' + sessionExist);
        }
      }
      $uibModal.open({
        templateUrl: '/lmn_common:resources/partial/wait.modal.html',
        controller: 'lmWaitController',
        backdrop: 'static',
        keyboard: false,
        size: 'mg',
        resolve: {
          status: function() {
            return gettext('Generating session...');
          },
          style: function() {
            return 'spinner';
          }
        }
      });
      return $http.post('/api/lmn/groupmembership/details', {
        action: 'get-specified',
        groupType: 'class',
        groupName: classname
      }).then(function(resp) {
        var participants;
        // get participants from specified class
        participants = resp.data['LISTS']['MEMBERLIST'][classname];
        // fix existing session
        if (sessionExist === true) {
          $http.post('/api/lmn/session/sessions', {
            action: 'update-session',
            username: $scope.identity.user,
            sessionID: sessionID,
            participants: participants
          }).then(function(resp) {
            // emit wait process is done
            $rootScope.$emit('updateWaiting', 'done');
            // refresh Session table
            notify.success(gettext('Session generated'));
            // open new created session
            $scope.currentSession.name = sessionID;
            $scope.currentSession.comment = sessionComment;
            return $scope.getParticipants($scope.identity.user, sessionID);
          });
        }
        //username = $scope.identity.user
        //    $scope.classes = $scope.groups.filter($scope.filterGroupType('schoolclass'))
        //$scope.getParticipants($scope.identity.user,'2020-01-29_15-19-21')

        // create new session
        if (sessionExist === false) {
          // create new specified session
          return $http.post('/api/lmn/session/sessions', {
            action: 'new-session',
            username: $scope.identity.user,
            comment: sessionComment,
            participants: participants
          }).then(async function(resp) {
            var j, len1, ref1, sessions;
            // emit wait process is done
            $rootScope.$emit('updateWaiting', 'done');
            $scope.new - (sessions = resp.data);
            await $scope.getSessions($scope.identity.user);
            notify.success(gettext('Session generated'));
            ref1 = $scope.sessions;
            // get new created sessionID
            for (j = 0, len1 = ref1.length; j < len1; j++) {
              session = ref1[j];
              if (sessionComment === session['COMMENT']) {
                sessionID = session['ID'];
              }
            }
            // open new created session
            $scope.currentSession.name = sessionID;
            $scope.currentSession.comment = sessionComment;
            return $scope.getParticipants($scope.identity.user, sessionID);
          });
        }
      });
    };
    $scope.$watch('_.addParticipant', function() {
      // console.log $scope._.addParticipant
      if ($scope._.addParticipant) {
        if ($scope.participants === 'empty') {
          $scope.participants = [];
        }
        $scope.info.message = '';
        $scope.visible.participanttable = 'show';
        //console.log $scope._.addParticipant
        if ($scope._.addParticipant.sophomorixRole === 'student') {
          // Add Managementgroups list if missing. This happens when all managementgroup attributes are false, causing the json tree to skip this key
          if ($scope._.addParticipant.MANAGEMENTGROUPS == null) {
            $scope._.addParticipant.MANAGEMENTGROUPS = [];
          }
          //if not $scope._.addParticipant.changed?
          //            $scope._.addParticipant.changed = 'False'
          //if not $scope._.addParticipant.exammode-changed?
          //            $scope._.addParticipant.exammode-changed = 'False'
          $scope.participants.push({
            "sAMAccountName": $scope._.addParticipant.sAMAccountName,
            "givenName": $scope._.addParticipant.givenName,
            "sn": $scope._.addParticipant.sn,
            "sophomorixExamMode": $scope._.addParticipant.sophomorixExamMode,
            "group_webfilter": $scope._.addParticipant.MANAGEMENTGROUPS.webfilter,
            "group_intranetaccess": $scope._.addParticipant.MANAGEMENTGROUPS.intranet,
            "group_printing": $scope._.addParticipant.MANAGEMENTGROUPS.printing,
            "sophomorixStatus": "U",
            "sophomorixRole": $scope._.addParticipant.sophomorixRole,
            "group_internetaccess": $scope._.addParticipant.MANAGEMENTGROUPS.internet,
            "sophomorixAdminClass": $scope._.addParticipant.sophomorixAdminClass,
            "user_existing": true,
            "group_wifiaccess": $scope._.addParticipant.MANAGEMENTGROUPS.wifi,
            "changed": false,
            "exammode-changed": false
          });
        }
        // console.log ($scope.participants)
        return $scope._.addParticipant = null;
      }
    });
    // TODO Figure out how to call the existing watch addParticipant function
    $scope.addParticipant = function(participant) {
      if (participant) {
        if ($scope.participants === 'empty') {
          $scope.participants = [];
        }
        $scope.info.message = '';
        $scope.visible.participanttable = 'show';
        // console.log participant
        // Only add Students
        if (participant.sophomorixRole === 'student') {
          // Add Managementgroups list if missing. This happens when all managementgroup attributes are false, causing the json tree to skip this key
          if (participant.MANAGEMENTGROUPS == null) {
            participant.MANAGEMENTGROUPS = [];
          }
          //if not participant.changed?
          //            participant.changed = 'False'
          //if not participant.exammode-changed?
          //            participant.exammode-changed = 'False'
          // console.log ($scope.participants)
          $scope.participants.push({
            "sAMAccountName": participant.sAMAccountName,
            "givenName": participant.givenName,
            "sn": participant.sn,
            "sophomorixExamMode": participant.sophomorixExamMode,
            "group_webfilter": participant.MANAGEMENTGROUPS.webfilter,
            "group_intranetaccess": participant.MANAGEMENTGROUPS.intranet,
            "group_printing": participant.MANAGEMENTGROUPS.printing,
            "sophomorixStatus": "U",
            "sophomorixRole": participant.sophomorixRole,
            "group_internetaccess": participant.MANAGEMENTGROUPS.internet,
            "sophomorixAdminClass": participant.sophomorixAdminClass,
            "user_existing": true,
            "group_wifiaccess": participant.MANAGEMENTGROUPS.wifi,
            "changed": false,
            "exammode-changed": false
          });
        }
        return participant = null;
      }
    };
    $scope.$watch('_.addSchoolClass', function() {
      var member, members, ref, schoolClass;
      if ($scope._.addSchoolClass) {
        members = $scope._.addSchoolClass.members;
        ref = $scope._.addSchoolClass.members;
        for (schoolClass in ref) {
          member = ref[schoolClass];
          $scope.addParticipant(member);
        }
        return $scope._.addSchoolClass = null;
      }
    });
    $scope.removeParticipant = function(participant) {
      var deleteIndex;
      deleteIndex = $scope.participants.indexOf(participant);
      if (deleteIndex !== -1) {
        return $scope.participants.splice(deleteIndex, 1);
      }
    };
    $scope.changeExamSupervisor = function(participant, supervisor) {
      return $http.post('/api/lmn/session/sessions', {
        action: 'change-exam-supervisor',
        supervisor: supervisor,
        participant: participant
      }).then(function(resp) {});
    };
    $scope.endExam = function(participant, supervisor, session, sessionName) {
      return $http.post('/api/lmn/session/sessions', {
        action: 'end-exam',
        supervisor: supervisor,
        participant: participant,
        sessionName: sessionName
      }).then(function(resp) {
        return $scope.getParticipants(supervisor, session);
      });
    };
    $scope.saveApply = function(username, participants, session, sessionName) {
      $uibModal.open({
        templateUrl: '/lmn_common:resources/partial/wait.modal.html',
        controller: 'lmWaitController',
        backdrop: 'static',
        keyboard: false,
        size: 'mg',
        resolve: {
          status: function() {
            return gettext('Changes are applied...');
          },
          style: function() {
            return 'progressbar';
          }
        }
      });
      return $http.post('/api/lmn/session/sessions', {
        action: 'save-session',
        username: username,
        participants: participants,
        session: session,
        sessionName: sessionName
      }).then(function(resp) {
        // emit process is done
        $rootScope.$emit('updateWaiting', 'done');
        $scope.output = resp.data;
        $scope.getParticipants(username, session);
        return notify.success(gettext($scope.output));
      });
    };
    $scope.cancel = function(username, participants, session) {
      $scope.getSessions($scope.identity.user);
      $scope.sessionLoaded = false;
      $scope.info.message = '';
      $scope.participants = '';
      $scope.currentSession.name = '';
      $scope.currentSession.comment = '';
      return $scope.visible.participanttable = 'none';
    };
    $scope.showInitialPassword = function(user) {
      // if user is exam user show InitialPassword of real user
      if (user[0].endsWith('-exam')) {
        user[0] = user[0].replace('-exam', '');
      }
      return $http.post('/api/lm/users/password', {
        users: user,
        action: 'get'
      }).then(function(resp) {
        return messagebox.show({
          title: gettext('Initial password'),
          text: resp.data,
          positive: 'OK'
        });
      });
    };
    $scope.setInitialPassword = function(user) {
      // if user is in exammode prohibit password change in session
      if (user[0].endsWith('-exam')) {
        messagebox.show({
          title: gettext('User in exam'),
          text: gettext('This user seems to be in exam. End exam mode before changing password!'),
          positive: 'OK'
        });
        return;
      }
      return $http.post('/api/lm/users/password', {
        users: user,
        action: 'set-initial'
      }).then(function(resp) {
        return notify.success(gettext('Initial password set'));
      });
    };
    $scope.setRandomPassword = function(user) {
      if (user[0].endsWith('-exam')) {
        messagebox.show({
          title: gettext('User in exam'),
          text: gettext('This user seems to be in exam. End exam mode before changing password!'),
          positive: 'OK'
        });
        return;
      }
      return $http.post('/api/lm/users/password', {
        users: user,
        action: 'set-random'
      }).then(function(resp) {
        return notify.success(gettext('Random password set'));
      });
    };
    $scope.setCustomPassword = function(user, id, type) {
      if (user[0]['sAMAccountName'].endsWith('-exam')) {
        messagebox.show({
          title: gettext('User in exam'),
          text: gettext('This user seems to be in exam. End exam mode before changing password!'),
          positive: 'OK'
        });
        return;
      }
      // Set sAMAccountName to establish compability to userInfo Module
      // This information is provided only as key (id) in sophomorix session
      user[0]['sAMAccountName'] = id;
      return $uibModal.open({
        templateUrl: '/lmn_users:resources/partial/customPassword.modal.html',
        controller: 'LMNUsersCustomPasswordController',
        size: 'mg',
        resolve: {
          users: function() {
            return user;
          },
          type: function() {
            return type;
          }
        }
      });
    };
    $scope.userInfo = function(user) {
      console.log(user);
      return $uibModal.open({
        templateUrl: '/lmn_users:resources/partial/userDetails.modal.html',
        controller: 'LMNUserDetailsController',
        size: 'lg',
        resolve: {
          id: function() {
            return user;
          },
          role: function() {
            return 'students';
          }
        }
      });
    };
    typeIsArray = Array.isArray || function(value) {
      return {}.toString.call(value) === '[object Array]';
    };
    validateResult = function(resp) {
      if (resp['data'][0] === 'ERROR') {
        notify.error(resp['data'][1]);
      }
      if (resp['data'][0] === 'LOG') {
        return notify.success(gettext(resp['data'][1]));
      }
    };
    $scope.shareTrans = function(command, senders, receivers, sessioncomment) {
      var bulkMode, i, len, participantsArray, receiver;
      // When share with session we get the whole session as an array.
      // The function on the other hand waits for an array containing just the  usernames so we extract
      // these into an array
      // If share option is triggered with just one user we get this user  as a string. If so we also have
      // to put it in an array
      bulkMode = 'false';
      participantsArray = [];
      if (typeIsArray(receivers)) {
        bulkMode = 'true';
        for (i = 0, len = receivers.length; i < len; i++) {
          receiver = receivers[i];
          participantsArray.push(receiver['sAMAccountName']);
        }
      } else {
        participantsArray.push(receivers);
      }
      receivers = participantsArray;
      return $uibModal.open({
        templateUrl: '/lmn_session:resources/partial/selectFile.modal.html',
        controller: 'LMNSessionFileSelectModalController',
        resolve: {
          action: function() {
            return 'share';
          },
          bulkMode: function() {
            return bulkMode;
          },
          senders: function() {
            return senders;
          },
          receivers: function() {
            return receivers;
          },
          command: function() {
            return command;
          }
        }
      }).result.then(function(result) {
        if (result.response === 'accept') {
          $uibModal.open({
            templateUrl: '/lmn_common:resources/partial/wait.modal.html',
            controller: 'lmWaitController',
            backdrop: 'static',
            keyboard: false,
            size: 'mg',
            resolve: {
              status: function() {
                return gettext('Sharing files...');
              },
              style: function() {
                return 'progressbar';
              }
            }
          });
        }
        return $http.post('/api/lmn/session/trans', {
          command: command,
          senders: senders,
          receivers: receivers,
          files: result.files,
          session: sessioncomment
        }).then(function(resp) {
          $rootScope.$emit('updateWaiting', 'done');
          console.log(resp);
          return validateResult(resp);
        });
      });
    };
    $scope.collectTrans = function(command, senders, receivers, sessioncomment) {
      var bulkMode, participantsArray, transTitle;
      // When collect from session we already get the users in an array containing the user objects.
      // If collect option is triggered with just on use we get this user as an object. If so we also
      // have to put it in an array.
      //console.log (command)
      //console.log (senders)
      bulkMode = 'false';
      participantsArray = [];
      if (typeIsArray(senders)) {
        bulkMode = 'true';
      } else {
        participantsArray.push(senders);
        senders = participantsArray;
      }
      transTitle = 'transfer';
      //console.log (bulkMode)
      return $uibModal.open({
        templateUrl: '/lmn_session:resources/partial/selectFile.modal.html',
        controller: 'LMNSessionFileSelectModalController',
        resolve: {
          action: function() {
            return 'collect';
          },
          bulkMode: function() {
            return bulkMode;
          },
          senders: function() {
            return senders;
          },
          receivers: function() {
            return receivers;
          },
          command: function() {
            return command;
          }
        }
      }).result.then(function(result) {
        if (result.response === 'accept') {
          //return
          $uibModal.open({
            templateUrl: '/lmn_common:resources/partial/wait.modal.html',
            controller: 'lmWaitController',
            backdrop: 'static',
            keyboard: false,
            size: 'mg',
            resolve: {
              status: function() {
                return gettext('Collecting files...');
              },
              style: function() {
                return 'progressbar';
              }
            }
          });
          if (command === 'copy') {
            $http.post('/api/lmn/session/trans', {
              command: command,
              senders: senders,
              receivers: receivers,
              files: result.files,
              session: sessioncomment
            }).then(function(resp) {
              $rootScope.$emit('updateWaiting', 'done');
              return validateResult(resp);
            });
          }
          if (command === 'move') {
            return $http.post('/api/lmn/session/trans', {
              command: command,
              senders: senders,
              receivers: receivers,
              files: result.files,
              session: sessioncomment
            }).then(function(resp) {
              $rootScope.$emit('updateWaiting', 'done');
              return validateResult(resp);
            });
          }
        }
      });
    };
    $scope.notImplemented = function(user) {
      return messagebox.show({
        title: gettext('Not implemented'),
        positive: 'OK'
      });
    };
    return $scope.$watch('identity.user', function() {
      //console.log ($scope.identity.user)
      if ($scope.identity.user === void 0) {
        return;
      }
      if ($scope.identity.user === null) {
        return;
      }
      if ($scope.identity.user === 'root') {
        return;
      }
      // $scope.identity.user = 'bruce'
      return $scope.getSessions($scope.identity.user);
    });
  });

  //return

}).call(this);

