// Generated by CoffeeScript 2.5.1
(function() {
  angular.module('lmn.session_new', ['core', 'lmn.common']);

}).call(this);

'use strict';

angular.module('lmn.session_new').config(function ($routeProvider) {
    $routeProvider.when('/view/lmn/sessionsList', {
        templateUrl: '/lmn_session_new:resources/partial/sessionsList.html',
        controller: 'LMNSessionsListController'
    });

    $routeProvider.when('/view/lmn/session', {
        templateUrl: '/lmn_session_new:resources/partial/session.html',
        controller: 'LMNSessionController'
    });
});


'use strict';

angular.module('lmn.session_new').service('lmnSession', function ($http, $uibModal, $q, $location, messagebox, validation, notify, gettext) {
    var _this = this;

    this.sessions = [];

    this.load = function () {
        var promiseList = [];
        promiseList.push($http.get('/api/lmn/groupmembership/groups').then(function (resp) {
            var groups = resp.data[0];
            _this.classes = groups.filter(function (elt) {
                return elt.type == 'schoolclass';
            });
            _this.classes = _this.classes.filter(function (elt) {
                return elt.membership == true;
            });
        }));

        promiseList.push($http.get('/api/lmn/session/sessions').then(function (resp) {
            if (resp.data.length == 0) {
                _this.sessions = resp.data;
                _this.info.message = gettext("There are no sessions yet. Create a session using the 'New Session' button at the top!");
            } else {
                _this.sessions = resp.data;
            }
        }));

        return $q.all(promiseList).then(function () {
            return [_this.classes, _this.sessions];
        });
    };

    this.start = function (session) {
        _this.current = session;
        $http.get('/api/lmn/session/sessions/' + _this.current.ID).then(function (resp) {
            _this.current.participants = resp.data;
            _this.current.generated = false;
            $location.path('/view/lmn/session');
        });
    };

    this.reset = function () {
        _this.current = {
            'ID': '',
            'COMMENT': '',
            'generated': false,
            'participants': []
        };
    };

    this.reset();

    this.startGenerated = function (groupname, participants) {
        generatedSession = {
            'ID': Date.now(),
            'COMMENT': groupname + '-autogenerated',
            'participants': participants
        };
        _this.current = generatedSession;
        _this.current.generated = true;
        $location.path('/view/lmn/session');
    };

    this.new = function () {
        var participants = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

        return messagebox.prompt(gettext('Session Name'), '').then(function (msg) {
            if (!msg.value) {
                return;
            }

            testChar = validation.isValidLinboConf(msg.value);
            if (testChar != true) {
                notify.error(gettext(testChar));
                return;
            }

            return $http.put('/api/lmn/session/sessions/' + msg.value, { participants: participants }).then(function (resp) {
                notify.success(gettext('Session Created'));
            });
        });
    };

    this.rename = function (sessionID, comment) {
        if (!sessionID) {
            messagebox.show({ title: gettext('No Session selected'), text: gettext('You have to select a session first.'), positive: 'OK' });
            return;
        }

        return messagebox.prompt(gettext('Session Name'), comment).then(function (msg) {
            if (!msg.value) {
                return;
            }

            testChar = validation.isValidLinboConf(msg.value);
            if (testChar != true) {
                notify.error(gettext(testChar));
                return;
            }
            return $http.post('/api/lmn/session/sessions', { action: 'rename-session', session: sessionID, comment: msg.value }).then(function (resp) {
                notify.success(gettext('Session renamed'));
                return msg.value;
            });
        });
    };

    this.kill = function (sessionID, comment) {
        if (!sessionID) {
            messagebox.show({ title: gettext('No session selected'), text: gettext('You have to select a session first.'), positive: 'OK' });
            return;
        }

        return messagebox.show({ text: gettext('Delete Session: ' + comment + ' ?'), positive: gettext('Delete'), negative: gettext('Cancel') }).then(function () {
            return $http.delete('/api/lmn/session/sessions/' + sessionID).then(function (resp) {
                notify.success(gettext(resp.data));
            });
        });
    };

    this.getParticipants = function () {
        return $http.get('/api/lmn/session/sessions/' + _this.current.ID).then(function (resp) {
            return resp.data;
        });
    };

    return this;
});


// Generated by CoffeeScript 2.5.1
(function() {
  angular.module('lmn.session_new').controller('LMNSessionController', function($scope, $http, $location, $route, $uibModal, $window, gettext, notify, messagebox, pageTitle, lmFileEditor, lmEncodingMap, filesystem, validation, $rootScope, wait, userPassword, lmnSession) {
    var typeIsArray, validateResult;
    pageTitle.set(gettext('Session'));
    $scope.changeState = false;
    $scope.addParticipant = '';
    $scope.addSchoolClass = '';
    $window.onbeforeunload = function(event) {
      if ($scope.session.ID === '' || $scope.session.participants.length === 0) {
        return;
      }
      // Confirm before page reload
      return "Eventually not refreshing";
    };
    $scope.$on("$destroy", function() {
      // Avoid confirmation on others controllers
      return $window.onbeforeunload = void 0;
    });
    $scope.$on("$locationChangeStart", function(event) {
      if ($scope.session.ID !== '' && $scope.session.participants.length > 0) {
        if (!confirm(gettext('Do you really want to quit this session ? You can restart it later if you want.'))) {
          event.preventDefault();
          return;
        }
      }
      return $window.onbeforeunload = void 0;
    });
    $scope.translation = {
      addStudent: gettext('Add Student'),
      addClass: gettext('Add Class')
    };
    $scope.sorts = [
      {
        name: gettext('Lastname'),
        fx: function(x) {
          return x.sn + ' ' + x.givenName;
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
      wifi: {
        visible: true,
        icon: "fa fa-wifi",
        title: gettext('Wifi-Access'),
        checkboxAll: true,
        checkboxStatus: false
      },
      internet: {
        visible: true,
        icon: "fa fa-globe",
        title: gettext('Internet-Access'),
        checkboxAll: true,
        checkboxStatus: false
      },
      intranet: {
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
    $scope.backToSessionList = function() {
      return $location.path('/view/lmn/sessionsList');
    };
    $scope.session = lmnSession.current;
    if ($scope.session.ID === '') {
      $scope.backToSessionList();
    }
    $scope.setManagementGroup = function(group, participant) {
      var user;
      $scope.changeState = true;
      if (participant[group] === true) {
        group = `no${group}`;
      }
      user = [participant.sAMAccountName];
      return $http.post('/api/lmn/managementgroup', {
        group: group,
        users: user
      }).then(function(resp) {
        notify.success(`Group ${group} changed for ${user[0]}`);
        return $scope.changeState = false;
      });
    };
    $scope.selectAll = function(id) {
      return console.log('later');
    };
    //        if item is 'exammode'
    //            managementgroup = 'exammode_boolean'
    $scope.setManagementGroupAll = function(group) {
      var i, len, new_value, participant, ref, usersList;
      console.log(group);
      $scope.changeState = true;
      usersList = [];
      new_value = !$scope.fields[group].checkboxStatus;
      ref = $scope.session.participants;
      for (i = 0, len = ref.length; i < len; i++) {
        participant = ref[i];
        participant[group] = new_value;
        usersList.push(participant.sAMAccountName);
      }
      if (new_value === false) {
        group = `no${group}`;
      }
      return $http.post('/api/lmn/managementgroup', {
        group: group,
        users: usersList
      }).then(function(resp) {
        notify.success(`Group ${group} changed for ${usersList.join()}`);
        return $scope.changeState = false;
      });
    };
    $scope.renameSession = function() {
      return lmnSession.rename($scope.session.ID, $scope.session.COMMENT).then(function(resp) {
        return $scope.session.COMMENT = resp;
      });
    };
    $scope.killSession = function() {
      return lmnSession.kill($scope.session.ID, $scope.session.COMMENT).then(function() {
        return $scope.backToSessionList();
      });
    };
    $scope.saveAsSession = function() {
      return lmnSession.new($scope.session.participants).then(function() {
        // TODO : would be better to get the session id and simply set the current session
        // instead of going back to the sessions list
        // But for this sophomorix needs to return the session id when creating a new one
        return $scope.backToSessionList();
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
      });
    };
    $scope.showRoomDetails = function() {
      return $http.get('/api/lmn/session/userInRoom').then(function(resp) {
        var usersInRoom;
        if (resp.data === 0) {
          return messagebox.show({
            title: gettext('Info'),
            text: gettext('Currenty its not possible to determine your room, try to login into your computer again.'),
            positive: 'OK'
          });
        } else {
          usersInRoom = resp.data;
          return $uibModal.open({
            templateUrl: '/lmn_session_new:resources/partial/roomDetails.modal.html',
            controller: 'LMNRoomDetailsController',
            size: 'lg',
            resolve: {
              usersInRoom: function() {
                return usersInRoom;
              }
            }
          });
        }
      });
    };
    $scope.findUsers = function(q) {
      return $http.get(`/api/lmn/session/user-search/${q}`).then(function(resp) {
        $scope.users = resp.data;
        return resp.data;
      });
    };
    $scope.findSchoolClasses = function(q) {
      return $http.get(`/api/lmn/session/schoolClass-search/${q}`).then(function(resp) {
        $scope.class = resp.data;
        return resp.data;
      });
    };
    $scope.$watch('addParticipant', function() {
      if ($scope.addParticipant) {
        return $http.post('/api/lmn/session/userinfo', {
          'users': [$scope.addParticipant.sAMAccountName]
        }).then(function(resp) {
          var new_participant;
          new_participant = resp.data[0];
          $scope.addParticipant = '';
          if (!$scope.session.generated) {
            // Real session: must be added in LDAP
            $http.post('/api/lmn/session/participants', {
              'users': [new_participant.sAMAccountName],
              'session': $scope.session.ID
            });
          }
          return $scope.session.participants.push(new_participant);
        });
      }
    });
    $scope.$watch('addSchoolClass', function() {
      var members;
      if ($scope.addSchoolClass) {
        members = Object.keys($scope.addSchoolClass.members);
        return $http.post('/api/lmn/session/userinfo', {
          'users': members
        }).then(function(resp) {
          var new_participants;
          new_participants = resp.data;
          $scope.addSchoolClass = '';
          if (!$scope.session.generated) {
            // Real session: must be added in LDAP
            $http.post('/api/lmn/session/participants', {
              'users': members,
              'session': $scope.session.ID
            });
          }
          return $scope.session.participants = $scope.session.participants.concat(new_participants);
        });
      }
    });
    $scope.removeParticipant = function(participant) {
      var deleteIndex;
      deleteIndex = $scope.session.participants.indexOf(participant);
      if (deleteIndex !== -1) {
        if ($scope.session.generated) {
          // Not a real session, just removing from participants list displayed
          return $scope.session.participants.splice(deleteIndex, 1);
        } else {
          return $http.patch('/api/lmn/session/participants', {
            'users': [participant.sAMAccountName],
            'session': $scope.session.ID
          }).then(function() {
            return $scope.session.participants.splice(deleteIndex, 1);
          });
        }
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
      return $http.patch(`/api/lmn/session/exam/${sessionName}`, {
        supervisor: supervisor,
        participant: participant
      }).then(function(resp) {
        return $scope.getParticipants(session);
      });
    };
    $scope._checkExamUser = function(username) {
      if (username.endsWith('-exam')) {
        messagebox.show({
          title: gettext('User in exam'),
          text: gettext('This user seems to be in exam. End exam mode before changing password!'),
          positive: 'OK'
        });
        return true;
      }
      return false;
    };
    $scope.showFirstPassword = function(username) {
      $scope.blurred = true;
      // if user is exam user show InitialPassword of real user
      username = username.replace('-exam', '');
      return userPassword.showFirstPassword(username).then(function(resp) {
        return $scope.blurred = false;
      });
    };
    $scope.resetFirstPassword = function(username) {
      if (!$scope._checkExamUser(username)) {
        return userPassword.resetFirstPassword(username);
      }
    };
    $scope.setRandomFirstPassword = function(username) {
      if (!$scope._checkExamUser(username)) {
        return userPassword.setRandomFirstPassword(username);
      }
    };
    $scope.setCustomPassword = function(user, pwtype) {
      if (!$scope._checkExamUser(user.sAMAccountName)) {
        return userPassword.setCustomPassword(user, pwtype);
      }
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
        templateUrl: '/lmn_session_new:resources/partial/selectFile.modal.html',
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
          },
          sessionComment: function() {
            return sessioncomment;
          }
        }
      }).result.then(function(result) {
        if (result.response === 'accept') {
          wait.modal(gettext('Sharing files...'), 'progressbar');
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
        }
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
        templateUrl: '/lmn_session_new:resources/partial/selectFile.modal.html',
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
          },
          sessionComment: function() {
            return sessioncomment;
          }
        }
      }).result.then(function(result) {
        if (result.response === 'accept') {
          //return
          wait.modal(gettext('Collecting files...'), 'progressbar');
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
    // Websession part
    $scope.getWebConferenceEnabled = function() {
      return $http.get('/api/lmn/websession/webConferenceEnabled').then(function(resp) {
        if (resp.data === true) {
          $scope.websessionEnabled = true;
          return $scope.websessionGetStatus();
        } else {
          return $scope.websessionEnabled = false;
        }
      });
    };
    $scope.websessionIsRunning = false;
    $scope.websessionGetStatus = function() {
      var sessionname;
      sessionname = $scope.session.COMMENT + "-" + $scope.session.ID;
      return $http.get(`/api/lmn/websession/webConference/${sessionname}`).then(function(resp) {
        if (resp.data["status"] === "SUCCESS") {
          if (resp.data["data"]["status"] === "started") {
            $scope.websessionIsRunning = true;
          } else {
            $scope.websessionIsRunning = false;
          }
          $scope.websessionID = resp.data["data"]["id"];
          $scope.websessionAttendeePW = resp.data["data"]["attendeepw"];
          return $scope.websessionModeratorPW = resp.data["data"]["moderatorpw"];
        } else {
          return $scope.websessionIsRunning = false;
        }
      });
    };
    $scope.websessionToggle = function() {
      if ($scope.websessionIsRunning === false) {
        return $scope.websessionStart();
      } else {
        return $scope.websessionStop();
      }
    };
    $scope.websessionStop = function() {
      return $http.post('/api/lmn/websession/endWebConference', {
        id: $scope.websessionID,
        moderatorpw: $scope.websessionModeratorPW
      }).then(function(resp) {
        return $http.delete(`/api/lmn/websession/webConference/${$scope.websessionID}`).then(function(resp) {
          if (resp.data["status"] === "SUCCESS") {
            notify.success(gettext("Successfully stopped!"));
            return $scope.websessionIsRunning = false;
          } else {
            return notify.error(gettext('Cannot stop entry!'));
          }
        });
      });
    };
    return $scope.websessionStart = function() {
      var i, len, participant, ref, tempparticipants;
      tempparticipants = [];
      ref = $scope.session.participants;
      for (i = 0, len = ref.length; i < len; i++) {
        participant = ref[i];
        tempparticipants.push(participant.sAMAccountName);
      }
      return $http.post('/api/lmn/websession/webConferences', {
        sessionname: $scope.session.COMMENT + "-" + $scope.session.ID,
        sessiontype: "private",
        sessionpassword: "",
        participants: tempparticipants
      }).then(function(resp) {
        if (resp.data["status"] === "SUCCESS") {
          $scope.websessionID = resp.data["id"];
          $scope.websessionAttendeePW = resp.data["attendeepw"];
          $scope.websessionModeratorPW = resp.data["moderatorpw"];
          return $http.post('/api/lmn/websession/startWebConference', {
            sessionname: $scope.session.COMMENT + "-" + $scope.session.ID,
            id: $scope.websessionID,
            attendeepw: $scope.websessionAttendeePW,
            moderatorpw: $scope.websessionModeratorPW
          }).then(function(resp) {
            if (resp.data["returncode"] === "SUCCESS") {
              return $http.post('/api/lmn/websession/joinWebConference', {
                id: $scope.websessionID,
                password: $scope.websessionModeratorPW,
                name: $scope.identity.profile.sn + ", " + $scope.identity.profile.givenName
              }).then(function(resp) {
                $scope.websessionIsRunning = true;
                return window.open(resp.data, '_blank');
              });
            } else {
              notify.error(gettext('Cannot start websession! Try to reload page!'));
              return console.log(resp.data);
            }
          });
        } else {
          return notify.error(gettext("Create session failed! Try again later!"));
        }
      });
    };
  });

  // Websession part
  angular.module('lmn.session_new').controller('LMNRoomDetailsController', function($scope, $route, $uibModal, $uibModalInstance, $http, gettext, notify, messagebox, pageTitle, usersInRoom) {
    $scope.usersInRoom = usersInRoom;
    return $scope.close = function() {
      return $uibModalInstance.dismiss();
    };
  });

  angular.module('lmn.session_new').controller('LMNSessionFileSelectModalController', function($scope, $uibModalInstance, gettext, notify, $http, bulkMode, senders, receivers, action, command, sessionComment, messagebox) {
    $scope.bulkMode = bulkMode;
    $scope.senders = senders;
    $scope.receivers = receivers;
    $scope.action = action;
    $scope.command = command;
    $scope.setTransferPath = function(username) {
      var role, school;
      role = $scope.identity.profile.sophomorixRole;
      school = $scope.identity.profile.activeSchool;
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
      if (filesToTrans.length === 0) {
        notify.info(gettext('Please select at least one file!'));
        return;
      }
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
        console.log(receivers[0]);
        console.log(sessionComment);
        return $http.post('/api/lmn/session/trans-list-files', {
          user: senders,
          subfolderPath: receivers[0] + '_' + sessionComment
        }).then(function(resp) {
          $scope.files = resp['data'][0];
          return $scope.filesList = resp['data'][1];
        });
      }
    };
    $scope.createDir = function(path) {
      return $http.post('/api/lmn/create-dir', {
        filepath: path
      });
    };
    $scope.removeFile = function(file) {
      var path, role, school;
      role = $scope.identity.profile.sophomorixRole;
      school = $scope.identity.profile.activeSchool;
      path = $scope.identity.profile.homeDirectory + '\\transfer\\' + file;
      return messagebox.show({
        text: gettext('Are you sure you want to delete permanently the file ' + file + '?'),
        positive: gettext('Delete'),
        negative: gettext('Cancel')
      }).then(function() {
        return $http.post('/api/lmn/smbclient/unlink', {
          path: path
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
      role = $scope.identity.profile.sophomorixRole;
      school = $scope.identity.profile.activeSchool;
      path = '/srv/samba/schools/' + school + '/' + role + '/' + $scope.identity.user + '/transfer/' + file;
      return messagebox.show({
        text: gettext('Are you sure you want to delete permanently this directory and its content: ' + file + '?'),
        positive: gettext('Delete'),
        negative: gettext('Cancel')
      }).then(function() {
        return $http.post('/api/lmn/remove-dir', {
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
      return $scope.collect();
    }
  });

}).call(this);

// Generated by CoffeeScript 2.5.1
(function() {
  angular.module('lmn.session_new').controller('LMNSessionsListController', function($scope, $http, $location, $route, $uibModal, gettext, notify, messagebox, pageTitle, lmFileEditor, lmEncodingMap, filesystem, validation, $rootScope, wait, lmnSession) {
    pageTitle.set(gettext('Sessions list'));
    $scope.generateSessionMouseover = gettext('Regenerate this session');
    $scope.startGeneratedSessionMouseover = gettext('Start this session unchanged (may not be up to date)');
    $scope.generateRoomsessionMouseover = gettext('Start session containing all users in this room');
    $scope.loading = true;
    $scope.room = {
      "usersList": [],
      'name': '',
      'objects': {}
    };
    $http.get('/api/lmn/session/userInRoom').then(function(resp) {
      if (resp.data !== 0) {
        $scope.room = resp.data;
      }
      return $scope.loading = false;
    });
    $scope.renameSession = function(session) {
      return lmnSession.rename(session.ID, session.COMMENT).then(function(resp) {
        return session.COMMENT = resp;
      });
    };
    $scope.killSession = function(session) {
      return lmnSession.kill(session.ID, session.COMMENT).then(function() {
        var position;
        position = $scope.sessions.indexOf(session);
        return $scope.sessions.splice(position, 1);
      });
    };
    $scope.newSession = function() {
      return lmnSession.new().then(function() {
        return $scope.getSessions();
      });
    };
    $scope.getSessions = function() {
      return lmnSession.load().then(function(resp) {
        $scope.classes = resp[0];
        return $scope.sessions = resp[1];
      });
    };
    $scope.start = function(session) {
      lmnSession.reset();
      return lmnSession.start(session);
    };
    $scope.startGenerated = function(groupname) {
      lmnSession.reset();
      if (groupname === 'this_room') {
        return $http.post("/api/lmn/session/userinfo", {
          users: $scope.room.usersList
        }).then(function(resp) {
          return lmnSession.startGenerated('this_room', resp.data);
        });
      } else {
        return $http.get(`/api/lmn/session/group/${groupname}`).then(function(resp) {
          // get participants from specified class
          return lmnSession.startGenerated(groupname, resp.data);
        });
      }
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
      return $scope.getSessions();
    });
  });

  //angular.module('lmn.session_new').controller 'LMNRoomDetailsController', ($scope, $route, $uibModal, $uibModalInstance, $http, gettext, notify, messagebox, pageTitle, usersInRoom) ->
//        $scope.usersInRoom = usersInRoom

//        $scope.close = () ->
//            $uibModalInstance.dismiss()

}).call(this);

