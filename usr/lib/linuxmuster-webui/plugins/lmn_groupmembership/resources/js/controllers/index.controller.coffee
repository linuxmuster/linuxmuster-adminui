angular.module('lmn.groupmembership').config ($routeProvider) ->
  $routeProvider.when '/view/lmn/groupmembership',
    controller: 'LMNGroupMembershipController'
    templateUrl: '/lmn_groupmembership:resources/partial/index.html'

angular.module('lmn.groupmembership').controller 'LMNGroupMembershipController', ($scope, $http, identity, $uibModal, gettext, notify, pageTitle, messagebox, validation) ->

  pageTitle.set(gettext('Enrolle'))
  $scope.types = {
    schoolclass:
      typename: gettext('Schoolclass')
      name: gettext('Groupname')
      checkbox: true
      type: 'schoolclass'

    printergroup:
      typename: gettext('Printer')
      checkbox: true
      type: 'printergroup'

    project:
      typename: gettext('Projects')
      checkbox: true
      type: 'project'
  }

  $scope.sorts = [
    {
      name: gettext('Groupname')
      fx: (x) -> x.groupname
    }
    {
      name: gettext('Membership')
      fx: (x) -> x.membership
    }
  ]
  $scope.sort = $scope.sorts[0]
  $scope.sortReverse= false
  $scope.paging =
    page: 1
    pageSize: 20

  $scope.isActive = (group) ->
    if  group.type is 'printergroup'
      if $scope.types.printergroup.checkbox is true
        return true
    if  group.type is 'schoolclass'
      if $scope.types.schoolclass.checkbox is true
        return true
    if  group.type is 'project'
      if $scope.types.schoolclass.checkbox is true
        return true
    return false

  $scope.checkInverse = (sort ,currentSort) ->
    if sort == currentSort
      $scope.sortReverse = !$scope.sortReverse
    else
      $scope.sortReverse = false

  $scope.changeState = false

  $scope.setMembership = (group) ->
    $scope.changeState = true
    console.log(group)
    action = if group.membership then 'removeadmins' else 'addadmins'
    if group.typename == 'Class'
        type = 'class'
    else if group.typename == 'Printer'
        type = 'group'
        action = if group.membership then 'removemembers' else 'addmembers'
    else
        type = 'project'
    $http.post('/api/lmn/groupmembership/membership', {action: action, entity: $scope.identity.user, groupname: group.groupname, type: type}).then (resp) ->
        if resp['data'][0] == 'ERROR'
            notify.error (resp['data'][1])
        if resp['data'][0] == 'LOG'
            notify.success gettext(resp['data'][1])
            group.membership = !group.membership
            $scope.changeState = false

  $scope.filterGroupType = (val) ->
    return (dict) ->
      dict['type'] == val

  $scope.getGroups = (username) ->
    $http.post('/api/lmn/groupmembership', {action: 'list-groups', username: username, profil: $scope.identity.profile}).then (resp) ->
      $scope.groups = resp.data[0]
      $scope.identity.isAdmin = resp.data[1]
      $scope.classes = $scope.groups.filter($scope.filterGroupType('schoolclass'))
      $scope.projects = $scope.groups.filter($scope.filterGroupType('project'))
      $scope.printers = $scope.groups.filter($scope.filterGroupType('printergroup'))

  $scope.createProject = () ->
    messagebox.prompt(gettext('Project Name'), '').then (msg) ->
      if not msg.value
        return
      test = validation.isValidProjectName(msg.value)
      if test != true
        notify.error gettext(test)
        return
      $http.post('/api/lmn/groupmembership', {action: 'create-project', username:$scope.identity.user, project: msg.value, profil: $scope.identity.profile}).then (resp) ->
        notify.success gettext('Project Created')
        $scope.getGroups ($scope.identity.user)

  $scope.showGroupDetails = (index, groupType, groupName) ->
    $uibModal.open(
      templateUrl: '/lmn_groupmembership:resources/partial/groupDetails.modal.html'
      controller:  'LMNGroupDetailsController'
      size: 'lg'
      resolve:
        groupType: () -> groupType
        groupName: () -> groupName
    ).result.then (result)->
      if result.response is 'refresh'
        $scope.getGroups ($scope.identity.user)

  $scope.projectIsJoinable = (project) ->
    return project['joinable'] == 'TRUE' or project.admin or $scope.identity.isAdmin or $scope.identity.profile.memberOf.indexOf(project['DN']) > -1

  $scope.$watch 'identity.user', ->
    if $scope.identity.user is undefined
      return
    if $scope.identity.user is null
      return
    if $scope.identity.user is 'root'
# $scope.identity.user = 'hulk'
      return
    $scope.getGroups($scope.identity.user)
    return

angular.module('lmn.groupmembership').controller 'LMNGroupDetailsController', ($scope, $route, $uibModal, $uibModalInstance, $http, gettext, notify, messagebox, pageTitle, groupType, groupName) ->

        $scope.showAdminDetails = true
        $scope.showMemberDetails = true
        $scope.changeState = false
        $scope.editGroup = false

        $scope.hidetext = gettext("Hide")
        $scope.showtext = gettext("Show")

        $scope.changeJoin = (group, type) ->
            $scope.changeState = true
            option = if $scope.joinable then '--join' else '--nojoin'
            $http.post('/api/lmn/changeGroup', {option: option, group: group, type: type}).then (resp) ->
                if resp['data'][0] == 'ERROR'
                    notify.error (resp['data'][1])
                if resp['data'][0] == 'LOG'
                    notify.success gettext(resp['data'][1])
                $scope.changeState = false

        $scope.changeHide = (group, type) ->
            $scope.changeState = true
            option = if $scope.hidden then '--hide' else '--nohide'
            $http.post('/api/lmn/changeGroup', {option: option, group: group, type: type}).then (resp) ->
                if resp['data'][0] == 'ERROR'
                    notify.error (resp['data'][1])
                if resp['data'][0] == 'LOG'
                    notify.success gettext(resp['data'][1])
                $scope.changeState = false

        $scope.killProject = (project) ->
             messagebox.show(text: "Do you really want to delete '#{project}'? This can't be undone!", positive: 'Delete', negative: 'Cancel').then () ->
                msg = messagebox.show(progress: true)
                $http.post('/api/lmn/groupmembership', {action: 'kill-project', username:$scope.identity.user, project: project, profil: $scope.identity.profile}).then (resp) ->
                    if resp['data'][0] == 'ERROR'
                        notify.error (resp['data'][1])
                    if resp['data'][0] == 'LOG'
                        notify.success gettext(resp['data'][1])
                        $uibModalInstance.close(response: 'refresh')
                .finally () ->
                    msg.close()

        $scope.text = {
                'addAsAdmin' : gettext('Move to admin group'),
                'removeFromAdmin' : gettext('Remove from admin group'),
                'remove' : gettext('Remove')
        }

        $scope.formatDate = (date) ->
            if (date == "19700101000000.0Z")
                return $scope.nevertext
            else if (date == undefined)
                return "undefined"
            else
                # Sophomorix date format is yyyyMMddhhmmss.0Z
                year  = date.slice(0,4)
                month = +date.slice(4,6) - 1 # Month start at 0
                day   = date.slice(6,8)
                hour  = date.slice(8,10)
                min   = date.slice(10,12)
                sec   = date.slice(12,14)
                return new Date(year, month, day, hour, min, sec)

        $scope.getGroupDetails = (group) ->
            groupType = group[0]
            groupName = group[1]
            $http.post('/api/lmn/groupmembership/details', {action: 'get-specified', groupType: groupType, groupName: groupName}).then (resp) ->
                $scope.groupName    = groupName
                $scope.groupDetails = resp.data['GROUP'][groupName]
                $scope.adminList = resp.data['GROUP'][groupName]['sophomorixAdmins']
                $scope.groupmemberlist = resp.data['GROUP'][groupName]['sophomorixMemberGroups']
                $scope.groupadminlist = resp.data['GROUP'][groupName]['sophomorixAdminGroups']

                $scope.members = []
                for name,member of resp.data['MEMBERS'][groupName]
                    if member.sn != "null" # group member 
                        $scope.members.push({'sn':member.sn, 'givenName':member.givenName, 'login': member.sAMAccountName, 'sophomorixAdminClass':member.sophomorixAdminClass})

                $scope.admins = []
                for admin in $scope.adminList
                    member = resp.data['MEMBERS'][groupName][admin]
                    $scope.admins.push({'sn':member.sn, 'givenName':member.givenName, 'sophomorixAdminClass':member.sophomorixAdminClass, 'login': member.sAMAccountName})

                $scope.joinable = resp.data['GROUP'][groupName]['sophomorixJoinable'] == 'TRUE'
                $scope.hidden = resp.data['GROUP'][groupName]['sophomorixHidden'] == 'TRUE'

                # Admin or admin of the project can edit members of a project
                # Only admins can change hide and join option for a class
                if $scope.identity.isAdmin
                    $scope.editGroup = true
                else if (groupType == 'project') and ($scope.adminList.indexOf($scope.identity.user) != -1)
                    $scope.editGroup = true
                else if (groupType == 'project') and ($scope.groupadminlist.indexOf($scope.identity.profile.sophomorixAdminClass) != -1)
                    $scope.editGroup = true

        $scope.addMember = (user) ->
            entity = ''
            if Array.isArray(user)
                for u in user
                    if $scope.members.indexOf(u) < 0
                        entity += u.login + ","
                        console.log(entity)
            else
                if $scope.members.indexOf(user) < 0
                    entity = user.login
            if not entity
                return
            $scope.changeState = true
            $http.post('/api/lmn/groupmembership/membership', {action: 'addmembers', entity: entity, groupname: groupName}).then (resp) ->
                if resp['data'][0] == 'ERROR'
                    notify.error (resp['data'][1])
                if resp['data'][0] == 'LOG'
                    notify.success gettext(resp['data'][1])
                    if Array.isArray(user)
                        $scope.members = $scope.members.concat(user.filter((u) -> $scope.members.indexOf(u) < 0))
                    else
                        $scope.members.push(user)
                $scope.changeState = false

        $scope.removeMember = (user) ->
            $scope.changeState = true
            $http.post('/api/lmn/groupmembership/membership', {action: 'removemembers', entity: user.login, groupname: groupName}).then (resp) ->
                if resp['data'][0] == 'ERROR'
                    notify.error (resp['data'][1])
                if resp['data'][0] == 'LOG'
                    notify.success gettext(resp['data'][1])
                    position = $scope.members.indexOf(user)
                    $scope.members.splice(position, 1)
                $scope.changeState = false

        $scope.addAdmin = (user) ->
            entity = ''
            if Array.isArray(user)
                for u in user
                    if $scope.admins.indexOf(u) < 0
                        entity += u.login + ","
            else
                if $scope.admins.indexOf(user) < 0
                    entity = user.login
            if not entity
                return
            $scope.changeState = true
            $http.post('/api/lmn/groupmembership/membership', {action: 'addadmins', entity: entity, groupname: groupName}).then (resp) ->
                if resp['data'][0] == 'ERROR'
                    notify.error (resp['data'][1])
                if resp['data'][0] == 'LOG'
                    notify.success gettext(resp['data'][1])
                   if Array.isArray(user)
                        $scope.admins = $scope.admins.concat(user.filter((u) -> $scope.admins.indexOf(u) < 0))
                    else
                        $scope.admins.push(user)
                $scope.changeState = false

        $scope.removeAdmin = (user) ->
            $scope.changeState = true
            $http.post('/api/lmn/groupmembership/membership', {action: 'removeadmins', entity: user.login, groupname: groupName}).then (resp) ->
                if resp['data'][0] == 'ERROR'
                    notify.error (resp['data'][1])
                if resp['data'][0] == 'LOG'
                    notify.success gettext(resp['data'][1])
                    position = $scope.admins.indexOf(user)
                    $scope.admins.splice(position, 1)
                $scope.changeState = false

        $scope.addMemberGroup = (group) ->
            entity = ''
            if Array.isArray(group)
                for g in group
                    if $scope.groupmemberlist.indexOf(g) < 0
                        entity += g + ","
            else
                if $scope.groupmemberlist.indexOf(group) < 0
                    entity = group
            if not entity
                return
            $scope.changeState = true
            $http.post('/api/lmn/groupmembership/membership', {action: 'addmembergroups', entity: entity, groupname: groupName}).then (resp) ->
                if resp['data'][0] == 'ERROR'
                    notify.error (resp['data'][1])
                if resp['data'][0] == 'LOG'
                    notify.success gettext(resp['data'][1])
                    if Array.isArray(group)
                        $scope.groupmemberlist = $scope.groupmemberlist.concat(group.filter((g) -> $scope.groupmemberlist.indexOf(g) < 0))
                    else
                        $scope.groupmemberlist.push(group)
                $scope.changeState = false

        $scope.removeMemberGroup = (group) ->
            $scope.changeState = true
            $http.post('/api/lmn/groupmembership/membership', {action: 'removemembergroups', entity: group, groupname: groupName}).then (resp) ->
                if resp['data'][0] == 'ERROR'
                    notify.error (resp['data'][1])
                if resp['data'][0] == 'LOG'
                    notify.success gettext(resp['data'][1])
                    position = $scope.groupmemberlist.indexOf(group)
                    $scope.groupmemberlist.splice(position, 1)
                $scope.changeState = false

        $scope.addAdminGroup = (group) ->
            entity = ''
            if Array.isArray(group)
                for g in group
                    if $scope.groupadminlist.indexOf(g) < 0
                        entity += g + ","
            else
                if $scope.groupadminlist.indexOf(group) < 0
                    entity = group
            if not entity
                return
            $scope.changeState = true
            $http.post('/api/lmn/groupmembership/membership', {action: 'addadmingroups', entity: entity, groupname: groupName}).then (resp) ->
                if resp['data'][0] == 'ERROR'
                    notify.error (resp['data'][1])
                if resp['data'][0] == 'LOG'
                    notify.success gettext(resp['data'][1])
                    if Array.isArray(group)
                        $scope.groupadminlist = $scope.groupadminlist.concat(group.filter((g) -> $scope.groupadminlist.indexOf(g) < 0))
                    else
                        $scope.groupadminlist.push(group)
                $scope.changeState = false

        $scope.removeAdminGroup = (group) ->
            $scope.changeState = true
            $http.post('/api/lmn/groupmembership/membership', {action: 'removeadmingroups', entity: group, groupname: groupName}).then (resp) ->
                if resp['data'][0] == 'ERROR'
                    notify.error (resp['data'][1])
                if resp['data'][0] == 'LOG'
                    notify.success gettext(resp['data'][1])
                    position = $scope.groupadminlist.indexOf(group)
                    $scope.groupadminlist.splice(position, 1)
                $scope.changeState = false

        $scope.demoteGroup = (group) ->
            $scope.removeAdminGroup(group)
            $scope.addMemberGroup(group)

        $scope.demoteMember = (user) ->
            $scope.removeAdmin(user)
            $scope.addMember(user)
            if user.login == $scope.identity.user
                $scope.editGroup = false

        $scope.elevateGroup = (group) ->
            $scope.removeMemberGroup(group)
            $scope.addAdminGroup(group)

        $scope.elevateMember = (user) ->
            $scope.removeMember(user)
            $scope.addAdmin(user)

        $scope._ =
            addMember: null
            addGroup: null
            addasadmin: false
            newGroup: []
            newUser: []

        $scope.$watch '_.addMember', () ->
            if $scope._.addMember
                $scope._.newUser.push($scope._.addMember)
                $scope._.addMember = null

        $scope.$watch '_.addGroup', () ->
            if $scope._.addGroup
                $scope._.newGroup.push($scope._.addGroup)
                $scope._.addGroup = null

        $scope.addEntities = () ->
            $scope.UserSearchVisible = false
            if $scope._.addasadmin
                $scope.addAdmin($scope._.newUser)
                $scope.addAdminGroup($scope._.newGroup)
            else
                $scope.addMember($scope._.newUser)
                $scope.addMemberGroup($scope._.newGroup)
            $scope._.newUser = []
            $scope._.newGroup = []
            $scope._.addasadmin = false


        $scope.findUsers = (q) ->
            return $http.post("/api/lm/search-project", {login:q, type:'user'}).then (resp) ->
                return resp.data
        $scope.findGroups = (q) ->
            return $http.post("/api/lm/search-project", {login:q, type:'group'}).then (resp) ->
                return resp.data
        $scope.findUsersGroup = (q) ->
            return $http.post("/api/lm/search-project", {login:q, type:'usergroup'}).then (resp) ->
                return resp.data

        $scope.groupType = groupType
        $scope.getGroupDetails ([groupType, groupName])
        $scope.close = () ->
            $uibModalInstance.dismiss()



