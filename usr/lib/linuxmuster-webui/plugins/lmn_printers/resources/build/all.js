// Generated by CoffeeScript 2.3.1
(function() {
  angular.module('lm.printers', ['core', 'lm.common']);

}).call(this);

// Generated by CoffeeScript 2.3.1
(function() {
  var indexOf = [].indexOf;

  angular.module('lm.printers').config(function($routeProvider) {
    return $routeProvider.when('/view/lm/printers', {
      controller: 'LMPrintersController',
      templateUrl: '/lmn_printers:resources/partial/index.html'
    });
  });

  angular.module('lm.printers').controller('LMPrintersModalController', function($scope, $uibModalInstance, workstationIPs, roomSubnets, printer) {
    var k, newSubnets, newWorkstations, v;
    $scope.printer = printer;
    newWorkstations = (function() {
      var results;
      results = [];
      for (k in workstationIPs) {
        v = workstationIPs[k];
        results.push(k);
      }
      return results;
    })();
    newWorkstations.sort();
    newSubnets = (function() {
      var results;
      results = [];
      for (k in roomSubnets) {
        v = roomSubnets[k];
        results.push(k);
      }
      return results;
    })();
    newSubnets.sort();
    $scope.newObjects = newSubnets.concat(newWorkstations);
    $scope.add = function(item) {
      return printer.items.push(item);
    };
    $scope.save = function() {
      return $uibModalInstance.close(printer);
    };
    return $scope.close = function() {
      return $uibModalInstance.dismiss();
    };
  });

  angular.module('lm.printers').controller('LMPrintersController', function($scope, $http, $uibModal, $log, gettext, notify, pageTitle, lmFileBackups) {
    pageTitle.set(gettext('Printers'));
    $http.get('/api/lm/devices').then(function(resp) {
      var base, i, len, name1, ref, subnet, workstation;
      $scope.workstationIPs = {};
      $scope.roomSubnets = {};
      ref = resp.data;
      for (i = 0, len = ref.length; i < len; i++) {
        workstation = ref[i];
        if (workstation.ip) {
          $scope.workstationIPs[workstation.hostname] = workstation.ip;
          subnet = workstation.ip.slice(0, workstation.ip.lastIndexOf('.')) + '.*';
          if ((base = $scope.roomSubnets)[name1 = workstation.room] == null) {
            base[name1] = [];
          }
          if (indexOf.call($scope.roomSubnets[workstation.room], subnet) < 0) {
            $scope.roomSubnets[workstation.room].push(subnet);
          }
        }
      }
      return $http.get('/api/lm/printers').then(function(resp) {
        var ip, j, k, l, len1, len2, mappedPrinters, name, printer, printers, ref1, ref2, subnets, v;
        printers = resp.data;
        mappedPrinters = {};
        for (j = 0, len1 = printers.length; j < len1; j++) {
          printer = printers[j];
          mappedPrinters[printer.name] = [];
          ref1 = $scope.workstationIPs;
          for (name in ref1) {
            ip = ref1[name];
            if (indexOf.call(printer.items, ip) >= 0) {
              if (indexOf.call(mappedPrinters[printer.name].push, name) < 0) {
                mappedPrinters[printer.name].push(name);
              }
            }
          }
          ref2 = $scope.roomSubnets;
          for (name in ref2) {
            subnets = ref2[name];
            for (l = 0, len2 = subnets.length; l < len2; l++) {
              subnet = subnets[l];
              if (indexOf.call(printer.items, subnet) >= 0) {
                if (indexOf.call(mappedPrinters[printer.name].push, name) < 0) {
                  mappedPrinters[printer.name].push(name);
                }
              }
            }
          }
        }
        $scope.printers = (function() {
          var results;
          results = [];
          for (k in mappedPrinters) {
            v = mappedPrinters[k];
            results.push({
              name: k,
              items: v
            });
          }
          return results;
        })();
        return $log.log('Mapped printers', $scope.printers);
      });
    });
    $scope.edit = function(printer) {
      return $uibModal.open({
        templateUrl: '/lmn_printers:resources/partial/printer.modal.html',
        controller: 'LMPrintersModalController',
        resolve: {
          workstationIPs: function() {
            return $scope.workstationIPs;
          },
          roomSubnets: function() {
            return $scope.roomSubnets;
          },
          printer: function() {
            return angular.copy(printer);
          }
        }
      }).result.then(function(result) {
        angular.copy(result, printer);
        return $scope.save();
      });
    };
    $scope.save = function() {
      var i, item, j, l, len, len1, len2, printer, printers, ref, ref1, ref2, subnet, unmappedPrinter;
      printers = [];
      ref = $scope.printers;
      for (i = 0, len = ref.length; i < len; i++) {
        printer = ref[i];
        unmappedPrinter = {
          name: printer.name,
          items: []
        };
        printers.push(unmappedPrinter);
        ref1 = printer.items;
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          item = ref1[j];
          if ($scope.workstationIPs[item]) {
            unmappedPrinter.items.push($scope.workstationIPs[item]);
          }
          if ($scope.roomSubnets[item]) {
            ref2 = $scope.roomSubnets[item];
            for (l = 0, len2 = ref2.length; l < len2; l++) {
              subnet = ref2[l];
              unmappedPrinter.items.push(subnet);
            }
          }
        }
      }
      return $http.post('/api/lm/printers', printers).then(function() {
        return notify.success(gettext('Saved'));
      });
    };
    return $scope.backups = function() {
      return lmFileBackups.show('/etc/cups/access.conf');
    };
  });

}).call(this);

