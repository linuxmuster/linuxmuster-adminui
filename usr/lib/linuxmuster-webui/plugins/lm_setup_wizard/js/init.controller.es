angular.module('lm.setup_wizard').config(function($routeProvider) {
  $routeProvider.when('/view/lm/init/welcome', {
    templateUrl: '/lm_setup_wizard:partial/init-welcome.html',
    controller: 'InitWelcomeController',
    controllerAs: '$ctrl',
  })

  $routeProvider.when('/view/lm/init/school', {
    templateUrl: '/lm_setup_wizard:partial/init-school.html',
    controller: 'InitSchoolController',
    controllerAs: '$ctrl',
  })

  $routeProvider.when('/view/lm/init/network', {
    templateUrl: '/lm_setup_wizard:partial/init-network.html',
    controller: 'InitNetworkController',
    controllerAs: '$ctrl',
  })

  $routeProvider.when('/view/lm/init/passwords', {
    templateUrl: '/lm_setup_wizard:partial/init-passwords.html',
    controller: 'InitPasswordsController',
    controllerAs: '$ctrl',
  })

  $routeProvider.when('/view/lm/init/setup', {
    templateUrl: '/lm_setup_wizard:partial/init-setup.html',
    controller: 'InitSetupController',
    controllerAs: '$ctrl',
  })
})


angular.module('lm.setup_wizard').controller('InitWelcomeController', function (gettext, pageTitle, $http, config) {
  pageTitle.set(gettext('Setup Wizard'))
  this.config = config
  $http.get('/api/core/languages').then(response => this.languages = response.data)

  this.apply = async () => {
    await this.config.save()
    $location.path('/view/lm/init/network')
  }
})


angular.module('lm.setup_wizard').controller('InitSchoolController', function ($location, $http, gettext, pageTitle, notify) {
  pageTitle.set(gettext('Setup Wizard'))
  this.ini = {}
  this.apply = async () => {
    $dataMissing=false
    console.log($dataMissing)
    if (this.ini.schoolname == null || this.ini.schoolname == '') {
      document.getElementById('schoolname-input').style.background = 'rgba(255, 178, 178, 0.29)'
      document.getElementById('schoolname-input').style.borderColor = 'red'
      $dataMissing=true
    }
    if (this.ini.location == null || this.ini.location == '') {
      document.getElementById('location-input').style.background = 'rgba(255, 178, 178, 0.29)'
      document.getElementById('location-input').style.borderColor = 'red'
      $dataMissing=true
    }
    if (this.ini.state == null || this.ini.state == '') {
      document.getElementById('state-input').style.background = 'rgba(255, 178, 178, 0.29)'
      document.getElementById('state-input').style.borderColor = 'red'
      $dataMissing=true
    }
    if (this.ini.country == null || this.ini.country == '') {
      document.getElementById('country-input').style.background = 'rgba(255, 178, 178, 0.29)'
      document.getElementById('country-input').style.borderColor = 'red'
      $dataMissing=true
    }
    if (this.ini.servername == null || this.ini.servername == '') {
      document.getElementById('servername-input').style.background = 'rgba(255, 178, 178, 0.29)'
      document.getElementById('servername-input').style.borderColor = 'red'
      $dataMissing=true
    }
    if (this.ini.domainname == null || this.ini.domainname == '') {
      document.getElementById('domainname-input').style.background = 'rgba(255, 178, 178, 0.29)'
      document.getElementById('domainname-input').style.borderColor = 'red'
      $dataMissing=true
    }

    if ($dataMissing == true){
      notify.error('Required data missing')
      return
    }
    await $http.post('/api/lm/setup-wizard/update-ini', this.ini)
    $location.path('/view/lm/init/network')
  }
})



angular.module('lm.setup_wizard').controller('InitNetworkController', function ($scope, $location, $http, gettext, pageTitle, notify) {
  pageTitle.set(gettext('Setup Wizard'))
  this.ini = {}
  this.apply = () => {
    if (this.ini.adminpw != this.adminpwConfirmation) {
      notify.error('Administrator password missmatch')
      return
    }
    if (!isStrongPwd1(this.ini.adminpw)){
      notify.error('Password too weak')
      return
    }
    $http.post('/api/lm/setup-wizard/update-ini', this.ini).then(() => {
      return $location.path('/view/lm/init/passwords')
    })
  }
})

angular.module('lm.setup_wizard').controller('InitPasswordsController', function ($location, $http, gettext, pageTitle, notify) {
  pageTitle.set(gettext('Setup Wizard'))
  this.ini = {}

  this.finish = () => {
    if (this.ini.smtppw != this.smtppwConfirmation) {
      notify.error('SMTP password missmatch')
      return
    }
    if (!this.enableOPSI) {
      delete this.ini['opsiip']
    }
    if (!this.enableDocker) {
      delete this.ini['dockerip']
    }
    if (!this.enableMail) {
      delete this.ini['mailip']
      delete this.ini['smtprelay']
      delete this.ini['smtpuser']
      delete this.ini['smtppw']
    }
    $http.post('/api/lm/setup-wizard/update-ini', this.ini).then(() => {
      return $location.path('/view/lm/init/setup')
    })
  }
})

angular.module('lm.setup_wizard').controller('InitSetupController', function ($location, $http, gettext, pageTitle, notify) {
  pageTitle.set(gettext('Setup Wizard'))
  this.isWorking = true
  $http.post('/api/lm/setup-wizard/provision').then(() => {
    this.isWorking = false
    notify.success(gettext('Setup complete'))
  }).catch(() => {
    this.isWorking = true
  })
  this.close = () => {
    $location.path('/')
  }
})

function isStrongPwd1(password) {
        var regExp = /(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%&*()]|(?=.*\d)).{8,}/;
        var validPassword = regExp.test(password);
        return validPassword;
}
