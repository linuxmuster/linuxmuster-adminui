angular.module('lm.common').directive 'lmLog', ($http, $interval, $timeout) ->
    return {
        restrict: 'E'
        scope: {
            path: '='
            lines: '=?'
        }
        template: '''
            <pre style="max-height: 300px; overflow-y: scroll" ng:bind="visibleContent"></pre>
        <!--    <div class="form-group">
               <label translate>Options</label>
                  <br>
                     <span checkbox ng:model="options.autoscroll" text="{{'Autoscroll'|translate}}"></span>
                     </div>
                     {{options}}
                     -->
        '''
        link: ($scope, element) ->
            $scope.content = ''
            i = $interval () ->
                $http.get("/api/lm/log#{$scope.path}?offset=#{$scope.content.length}").then (resp) ->
                    # console.log ($scope)
                    $scope.content += resp.data

                    $scope.visibleContent = $scope.content
                    if $scope.lines
                        lines = $scope.content.split('\n')
                        # console.log lines, lines[lines.length - 1]
                        if lines[lines.length - 1] == ''
                            lines = lines[...-1]
                        lines = lines[-$scope.lines..]
                        # console.log lines
                        $scope.visibleContent = lines.join('\n')

                    $timeout () ->
                        e = $(element).find('pre')[0]
                        e.scrollTop = e.scrollHeight
                    
                    if /linuxmuster.+finished/.test($scope.content)
                        $interval.cancel(i)
            , 1000

            $scope.$on '$destroy', () ->
                $interval.cancel(i)
    }
